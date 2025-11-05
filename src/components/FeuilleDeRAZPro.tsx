import { pendingPaymentsService, type PendingPayment } from '@/services/pendingPaymentsService';
import { closeCurrentSession as closeCurrentSessionHelper, computeTodayTotalsFromDB, ensureSession as ensureSessionHelper, getCurrentSession as getCurrentSessionHelper, updateCurrentSessionEvent as updateCurrentSessionEventHelper, updateSession as updateSessionHelper } from '@/services/sessionService';
import type { Invoice } from '@/services/syncService';
import type { SessionDB } from '@/types';
import { Eye, EyeOff, Mail, Printer, RefreshCw, XCircle } from 'lucide-react';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { getDB } from '../db/index';
import { useRAZGuardSetting } from '../hooks/useRAZGuardSetting';
import { useRealtimeSync } from '../hooks/useRealtimeSync';
import { useSupabaseInvoices } from '../hooks/useSupabaseInvoices';
import { externalInvoiceService } from '../services/externalInvoiceService';
import type { Sale, Vendor } from '../types';
import { printHtmlA4 } from '../utils/printA4';
import { FeuilleCaissePrintable } from './FeuilleCaissePrintable';
import { RAZGuardModal } from './RAZGuardModal';

// Normalisation d'une ligne de chèque pour tables UI + impression
type ChequeRow = {
  source: 'classique' | 'facturier';
  invoiceNumber: string;
  clientName: string;
  product: string;
  nbCheques: number;
  perChequeAmount: number;
  invoiceTotal: number;
  date?: number;
  id?: string;
};

// Utilitaires de mapping
function toChequeRowsFromSales(sales: Sale[]): ChequeRow[] {
  return sales
    .filter(s => !s.canceled && s.manualInvoiceData?.invoiceNumber) // 🔒 seulement factures éditées
    .filter(s => (s.checkDetails?.count ?? 0) > 0)
    .map(s => {
      const nb = s.checkDetails?.count ?? 0;
      const amt = s.checkDetails?.amount ?? 0;
      const productGuess =
        // essaie d'utiliser ce que tu as côté vente
        (s.manualInvoiceData as any)?.productName
        ?? (s as any)?.firstItemName
        ?? s.items?.[0]?.name
        ?? '—';
      return {
        source: 'classique',
        invoiceNumber: s.manualInvoiceData!.invoiceNumber,
        clientName: s.manualInvoiceData?.clientName ?? '—',
        product: productGuess,
        nbCheques: nb,
        perChequeAmount: amt,
        invoiceTotal: s.totalAmount ?? Number((nb * amt).toFixed(2)),
        date: s.date ? new Date(s.date).getTime() : undefined,
        id: s.id,
      } as ChequeRow;
    });
}

function toChequeRowsFromPending(items: PendingPayment[]): ChequeRow[] {
  return items.map((r) => {
    const total = Number((r.nbCheques * r.montantCheque).toFixed(2));
    return {
      source: 'facturier',
      // on prend un champ d'ID/numéro si dispo, sinon libellé compact
      invoiceNumber: (r as any).invoiceNumber ?? (r as any).externalInvoiceNumber ?? `FACT-${(r as any)?.id ?? r.clientName}`,
      clientName: r.clientName ?? '—',
      product: (r as any)?.productName ?? '—',
      nbCheques: r.nbCheques ?? 0,
      perChequeAmount: r.montantCheque ?? 0,
      invoiceTotal: total,
      date: r.dateProchain ? new Date(r.dateProchain).getTime() : undefined,
      id: (r as any)?.id,
    } as ChequeRow;
  });
}

function mergeChequeRows(a: ChequeRow[], b: ChequeRow[]): ChequeRow[] {
  return [...a, ...b].sort((x, y) => {
    const ax = x.invoiceNumber?.toString() ?? '';
    const ay = y.invoiceNumber?.toString() ?? '';
    return ax.localeCompare(ay, 'fr', { numeric: true, sensitivity: 'base' });
  });
}

// (Données désormais chargées via pendingPaymentsService)

interface FeuilleDeRAZProProps {
  sales: Sale[];
  invoices: Invoice[];
  vendorStats: Vendor[];
  exportDataBeforeReset: () => void;
  executeRAZ: () => void;
}

interface VendeusesAvecDetail extends Vendor {
  detailPaiements: { carte: number; especes: number; cheque: number; mixte: number; };
  totalCalcule: number;
  nbVentesCalcule: number;
}

function FeuilleDeRAZPro({ sales, invoices, vendorStats, exportDataBeforeReset, executeRAZ }: FeuilleDeRAZProProps) {
  // 🔧 CHARGER LES VENTES SYNCHRONISÉES DEPUIS SUPABASE (comme monitoring)
  const { recentSales, loadRecentSales } = useRealtimeSync();
  const { invoices: supabaseInvoices } = useSupabaseInvoices();
  
  // 🔧 CHARGER LES VENTES LOCALES DEPUIS INDEXEDDB (comme monitoring)
  const [localSalesFromDB, setLocalSalesFromDB] = useState<Sale[]>([]);
  
  useEffect(() => {
    const loadLocalSales = async () => {
      try {
        const db = await getDB();
        const salesData = await db.table('sales').toArray();
        
        // Convertir SaleDB → Sale
        const convertedSales: Sale[] = salesData.map(saleDB => ({
          id: saleDB.saleId || saleDB.id?.toString() || '',
          vendorId: saleDB.vendorId || '',
          vendorName: saleDB.vendorName || '',
          items: saleDB.items || [],
          totalAmount: saleDB.totalAmount || 0,
          paymentMethod: saleDB.paymentMethod || 'card',
          date: new Date(saleDB.date),
          canceled: saleDB.canceled || false,
          cartMode: saleDB.cartMode || 'classique'
        }));
        
        setLocalSalesFromDB(convertedSales);
        console.log(`📊 Feuille de Caisse - Ventes locales chargées depuis IndexedDB: ${convertedSales.length} ventes`);
      } catch (error) {
        console.error('❌ Erreur chargement ventes locales:', error);
        setLocalSalesFromDB([]);
      }
    };
    
    loadLocalSales();
    
    // Recharger périodiquement
    const interval = setInterval(() => {
      loadLocalSales();
      loadRecentSales();
    }, 20000); // Toutes les 20 secondes
    
    return () => clearInterval(interval);
  }, [loadRecentSales]);
  
  // 🔧 COMBINER sales (props) + localSalesFromDB (IndexedDB) + recentSales (Supabase)
  const allSalesCombined = useMemo(() => {
    // Dédupliquer par ID
    const salesMap = new Map<string, Sale>();
    
    // Ajouter d'abord sales (props - localStorage)
    sales.forEach(s => {
      if (s.id) salesMap.set(s.id, s);
    });
    
    // Ajouter ensuite localSalesFromDB (IndexedDB) - priorité si doublon
    localSalesFromDB.forEach(s => {
      if (s.id) salesMap.set(s.id, s);
    });
    
    // Convertir recentSales en format Sale et ajouter (priorité maximale)
    recentSales.forEach(rs => {
      if (rs.id && !salesMap.has(rs.id)) {
        salesMap.set(rs.id, {
          id: rs.id,
          vendorId: rs.vendor_id,
          vendorName: rs.vendor_name,
          items: rs.items.map(item => ({
            id: item.id || '',
            name: item.name,
            price: item.price,
            quantity: item.quantity,
            category: item.category || ''
          })),
          totalAmount: rs.total_amount,
          paymentMethod: rs.payment_method as any,
          date: new Date(rs.created_at),
          canceled: rs.canceled || false,
          cartMode: 'classique'
        });
      }
    });
    
    const combined = Array.from(salesMap.values());
    console.log(`📊 Feuille de Caisse - Ventes combinées:`, {
      props: sales.length,
      indexedDB: localSalesFromDB.length,
      recentSales: recentSales.length,
      combinees: combined.length,
      aujourdhui: combined.filter(s => !s.canceled && new Date(s.date).toDateString() === new Date().toDateString()).length
    });
    
    return combined;
  }, [sales, localSalesFromDB, recentSales]);
  
  // 🔧 COMBINER invoices (props) + supabaseInvoices
  const allInvoicesCombined = useMemo(() => {
    // Dédupliquer par numéro/ID
    const invoicesMap = new Map<string, Invoice>();
    
    // Ajouter d'abord invoices (props)
    invoices.forEach(inv => {
      const key = inv.invoiceNumber || inv.id || '';
      if (key) invoicesMap.set(key, inv);
    });
    
    // Ajouter ensuite supabaseInvoices
    supabaseInvoices.forEach(supInv => {
      if (supInv.status === 'canceled' || supInv.canceled === true) return;
      
      const key = supInv.numero_facture || supInv.id || '';
      if (!key) return;
      
      // Convertir supabaseInvoice → Invoice
      const convertedInvoice: Invoice = {
        id: supInv.id?.toString() || '',
        invoiceNumber: supInv.numero_facture,
        vendorName: supInv.conseiller || 'Non défini',
        vendorId: '', // À déterminer depuis le nom
        totalTTC: supInv.montant_ttc || 0,
        createdAt: new Date(supInv.created_at),
        status: supInv.status || 'completed',
        items: Array.isArray(supInv.produits) ? supInv.produits.map((p: any) => ({
          name: p.nom || p.name || 'Produit',
          quantity: p.quantite || p.quantity || 1,
          price: p.prix_unitaire || p.price || 0
        })) : []
      };
      
      invoicesMap.set(key, convertedInvoice);
    });
    
    const combined = Array.from(invoicesMap.values());
    console.log(`📊 Feuille de Caisse - Factures combinées:`, {
      props: invoices.length,
      supabase: supabaseInvoices.length,
      combinees: combined.length
    });
    
    return combined;
  }, [invoices, supabaseInvoices]);
  
  // 🔍 DEBUG : Vérification des données reçues en props
  useEffect(() => {
    console.log('🔍 FeuilleDeRAZPro - Données reçues:', {
      salesCount: sales.length,
      localSalesFromDB: localSalesFromDB.length,
      recentSales: recentSales.length,
      allSalesCombined: allSalesCombined.length,
      invoicesCount: invoices.length,
      supabaseInvoices: supabaseInvoices.length,
      allInvoicesCombined: allInvoicesCombined.length,
      vendorStatsCount: vendorStats.length,
      vendorStatsNames: vendorStats.map(v => v.name)
    });
  }, [sales, localSalesFromDB, recentSales, allSalesCombined, invoices, supabaseInvoices, allInvoicesCombined, vendorStats]);

  const [modeApercu, setModeApercu] = useState(false);
  const [reglementsData, setReglementsData] = useState<PendingPayment[]>([]);
  const [contentHtmlForPrint, setContentHtmlForPrint] = useState<string>('');
  const [forceUpdate, setForceUpdate] = useState(0); // Pour forcer les mises à jour
  
  // ===== WORKFLOW SÉCURISÉ =====
  const [isViewed, setIsViewed] = useState(false);
  const [isPrinted, setIsPrinted] = useState(false);
  const [isEmailSent, setIsEmailSent] = useState(false);

  // ===== RAZ GUARD MODAL =====
  const { mode: razGuardMode, ready: razGuardReady } = useRAZGuardSetting("daily");
  const [showRAZGuardModal, setShowRAZGuardModal] = useState(false);

  // ===== SESSION (uniquement dans l'onglet RAZ) =====
  const [session, setSession] = useState<SessionDB | undefined>();
  const [sessLoading, setSessLoading] = useState(true);
  
  // 🆕 États pour le tableau des chèques
  const [chequesTab, setChequesTab] = useState<'classique' | 'facturier'>('classique');
  const [editableChecks, setEditableChecks] = useState<Record<string, { nbCheques: number; perChequeAmount: number; product?: string }>>({});
  const [openingSession, setOpeningSession] = useState(false);
  // Champs événement (saisis le premier jour)
  const [eventName, setEventName] = useState('');
  const [eventStart, setEventStart] = useState(''); // yyyy-mm-dd
  const [eventEnd, setEventEnd] = useState('');     // yyyy-mm-dd
  
  // ===== NOM ÉVÉNEMENT AFFICHÉ (état local pour mise à jour immédiate) =====
  const [displayedEventName, setDisplayedEventName] = useState<string>('');

  // ===== VALIDATION DATE FIN SESSION =====
  const canEndSessionToday = useMemo(() => {
    if (!session?.eventEnd) return false;
    const today = new Date();
    const sessionEndDate = new Date(session.eventEnd);
    
    // On peut faire RAZ Fin Session seulement si on est à la date de fin ou après
    return today.getTime() >= sessionEndDate.getTime();
  }, [session?.eventEnd]);

  const toInputDate = (ms?: number) => {
    if (!ms) return '';
    const d = new Date(ms);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const endOfDay = (ms: number) => {
    const d = new Date(ms);
    d.setHours(23, 59, 59, 999);
    return d.getTime();
  };

  const isTodayFirstDayOf = (openedAt?: number) => {
    if (!openedAt) return false;
    const o = new Date(openedAt); o.setHours(0,0,0,0);
    const t = new Date(); t.setHours(0,0,0,0);
    return o.getTime() === t.getTime();
  };

  const refreshSession = useCallback(async () => {
    try {
      const s = await getCurrentSessionHelper();
      setSession(s);
      // Hydrater les champs événement depuis la session
      if (s) {
        setEventName(s.eventName ?? '');
        setEventStart(toInputDate(s.eventStart));
        setEventEnd(toInputDate(s.eventEnd));
      }
    } finally {
      setSessLoading(false);
    }
  }, []);

  // ===== NOM ÉVÉNEMENT DYNAMIQUE =====
  const eventNameDynamic = useMemo(() => {
    // Priorité : nom local affiché > session > défaut
    const name = displayedEventName || session?.eventName || 'Événement MyConfort';
    console.log('🎯 Calcul eventNameDynamic:', { 
      displayedEventName, 
      sessionEventName: session?.eventName, 
      result: name, 
      forceUpdate 
    });
    return name;
  }, [displayedEventName, session?.eventName, forceUpdate]);

  // ===== FONCTION IMPRESSION A4 AVEC NOM ÉVÉNEMENT =====
  const handleRAZPrint = () => {
    console.log('🖨️ DEBUG Impression - État initial:', { 
      contentHtmlForPrint: contentHtmlForPrint ? 'PRÉSENT' : 'VIDE', 
      isViewed, 
      modeApercu 
    });

    // Forcer la visualisation en premier si nécessaire
    if (!modeApercu) {
      console.log('🔄 Forçage de la visualisation...');
      setModeApercu(true);
      setIsViewed(true);
      
      // Attendre que le DOM se mette à jour avec le nouveau contenu
      setTimeout(() => {
        const contentElement = document.getElementById('zone-impression-content');
        console.log('🔍 Élément trouvé après forçage:', contentElement ? 'OUI' : 'NON');
        
        if (contentElement) {
          const capturedContent = contentElement.innerHTML;
          setContentHtmlForPrint(capturedContent);
          
          const fullHtml = `
            <div style="padding: 32px; font-family: 'Manrope', sans-serif;">
              <h1 style="text-align: center; font-size: 20px; margin-bottom: 20px;">
                📍 Feuille de Caisse — ${eventNameDynamic}
              </h1>
              ${capturedContent}
            </div>
          `;
          printHtmlA4(fullHtml);
          setIsPrinted(true);
          console.log('✅ Impression effectuée avec contenu généré automatiquement');
        } else {
          console.error('❌ Impossible de trouver zone-impression-content même après forçage');
          alert("Erreur technique : impossible de générer la feuille. Essayez de cliquer d'abord sur 'Voir la feuille'.");
        }
      }, 300); // Délai plus long pour s'assurer que React a rendu le composant
      
      return;
    }

    // Mode aperçu déjà actif, vérifier si on a déjà le contenu
    if (contentHtmlForPrint) {
      console.log('📄 Utilisation du contenu existant');
      const fullHtml = `
        <div style="padding: 32px; font-family: 'Manrope', sans-serif;">
          <h1 style="text-align: center; font-size: 20px; margin-bottom: 20px;">
            📍 Feuille de Caisse — ${eventNameDynamic}
          </h1>
          ${contentHtmlForPrint}
        </div>
      `;
      printHtmlA4(fullHtml);
      setIsPrinted(true);
      console.log('✅ Impression effectuée avec contenu existant');
      return;
    }

    // Mode aperçu actif mais pas de contenu sauvegardé, recapturer
    const contentElement = document.getElementById('zone-impression-content');
    if (contentElement) {
      const capturedContent = contentElement.innerHTML;
      setContentHtmlForPrint(capturedContent);
      
      const fullHtml = `
        <div style="padding: 32px; font-family: 'Manrope', sans-serif;">
          <h1 style="text-align: center; font-size: 20px; margin-bottom: 20px;">
            📍 Feuille de Caisse — ${eventNameDynamic}
          </h1>
          ${capturedContent}
        </div>
      `;
      printHtmlA4(fullHtml);
      setIsPrinted(true);
      console.log('✅ Impression effectuée avec contenu recapturé');
    } else {
      console.error('❌ Zone d\'impression introuvable malgré modeApercu actif');
      alert("Erreur technique : zone d'impression introuvable.");
    }
  };

  useEffect(() => {
    void refreshSession();
  }, [refreshSession]);

  // Assurer une session ouverte pour garder l'en-tête vert après un refresh
  useEffect(() => {
    if (!sessLoading && !session) {
      (async () => {
        try {
          await ensureSessionHelper('raz-auto');
          await refreshSession();
        } catch (err) {
          console.warn('⚠️ Impossible d\'assurer une session automatiquement:', err);
        }
      })();
    }
  }, [sessLoading, session, refreshSession]);

  // Synchroniser displayedEventName avec la session au chargement
  useEffect(() => {
    if (session?.eventName && !displayedEventName) {
      console.log('🔄 Initialisation displayedEventName depuis session:', session.eventName);
      setDisplayedEventName(session.eventName);
    }
  }, [session?.eventName, displayedEventName]);

  // Charger les règlements à venir depuis le service
  useEffect(() => {
    (async () => {
      const items = await pendingPaymentsService.list();
      setReglementsData(items);
    })();
  }, []);

  // Fonctions de gestion de session pour SessionManager
  const handleSessionCreate = useCallback(async (sessionData: {
    eventName: string;
    eventStart: string;
    eventEnd: string;
    note?: string;
  }) => {
    try {
      console.log('🔄 Création de session interactive...', sessionData);
      
      const eventStartMs = new Date(sessionData.eventStart).getTime();
      const eventEndMs = new Date(sessionData.eventEnd).getTime();
      
      const sessionParams = {
        openedBy: 'system',
        eventName: sessionData.eventName,
        eventStart: eventStartMs,
        eventEnd: eventEndMs,
        ...(sessionData.note && { note: sessionData.note })
      };
      
      await ensureSessionHelper(sessionParams);
      console.log('✅ Session interactive créée avec succès');
      
      await refreshSession();
    } catch (e) {
      console.error('❌ Erreur création session interactive:', e);
      throw e;
    }
  }, [refreshSession]);

  const handleSessionUpdate = useCallback(async (sessionData: Partial<SessionDB>) => {
    try {
      console.log('🔄 Mise à jour de session...', sessionData);
      
      if (!session?.id) {
        throw new Error('Aucune session active à mettre à jour');
      }
      
      await sessionService.updateSession(session.id, sessionData);
      console.log('✅ Session mise à jour avec succès');
      
      await refreshSession();
    } catch (e) {
      console.error('❌ Erreur mise à jour session:', e);
      throw e;
    }
  }, [session?.id, refreshSession]);

  const openSession = useCallback(async () => {
    setOpeningSession(true);
    try {
      console.log('🔄 Ouverture de session...', { eventName, eventStart, eventEnd });
      
      // Convertir les dates en format approprié
      const eventStartMs = eventStart ? new Date(eventStart).getTime() : undefined;
      const eventEndMs = eventEnd ? new Date(eventEnd).getTime() : undefined;
      
      // Passer les infos d'événement si fournies
      const sessionParams = {
        openedBy: 'system',
        ...(eventName && { eventName }),
        ...(eventStartMs && { eventStart: eventStartMs }),
        ...(eventEndMs && { eventEnd: eventEndMs })
      };
      
      console.log('📝 Paramètres session:', sessionParams);
      
      await ensureSessionHelper(sessionParams);
      console.log('✅ Session ouverte avec succès');
      
      await refreshSession();
      
      // 🆕 AUTO-GÉNÉRATION TABLEAUX COMMISSION À L'OUVERTURE
      try {
        const { CommissionTableGenerator } = await import('@/services/commissionTableGenerator');
        const { getCurrentSession: getCurrentSessionForTables } = await import('@/services/sessionService');
        const currentSession = await getCurrentSessionForTables();
        
        if (currentSession && currentSession.eventStart && currentSession.eventEnd) {
          console.log('📊 Génération automatique des tableaux de commission...');
          await CommissionTableGenerator.generateAndSaveOnSessionOpen(currentSession);
          console.log('✅ Tableaux de commission générés et sauvegardés');
        }
      } catch (tableError) {
        console.error('❌ Erreur génération tableaux (non bloquant):', tableError);
        // Ne pas bloquer l'ouverture de session en cas d'erreur
      }
    } catch (e) {
      console.error('❌ Erreur ouverture session:', e);
      alert("Erreur lors de l'ouverture de la session: " + (e instanceof Error ? e.message : String(e)));
    } finally {
      setOpeningSession(false);
    }
  }, [eventName, eventStart, eventEnd, refreshSession]);

  const onSaveEventFirstDay = useCallback(async () => {
    try {
      console.log('📝 Enregistrement événement:', { eventName, eventStart, eventEnd });
      
      // 🎯 MISE À JOUR IMMÉDIATE DU NOM AFFICHÉ
      if (eventName.trim()) {
        console.log('⚡ Mise à jour immédiate du nom affiché:', eventName);
        setDisplayedEventName(eventName.trim());
      }
      
      await updateCurrentSessionEventHelper({ eventName: eventName || undefined, eventStart: eventStart || undefined, eventEnd: eventEnd || undefined });
      
      console.log('✅ Événement enregistré, rafraîchissement session...');
      await refreshSession();
      
      // 🆕 AUTO-GÉNÉRATION TABLEAUX COMMISSION APRÈS ENREGISTREMENT ÉVÉNEMENT
      try {
        const { CommissionTableGenerator } = await import('@/services/commissionTableGenerator');
        const { getCurrentSession: getCurrentSessionForTables } = await import('@/services/sessionService');
        const currentSession = await getCurrentSessionForTables();
        
        if (currentSession && eventStart && eventEnd && currentSession.eventStart && currentSession.eventEnd) {
          console.log('📊 Génération automatique des tableaux de commission après enregistrement événement...');
          await CommissionTableGenerator.generateAndSaveOnSessionOpen(currentSession);
          console.log('✅ Tableaux de commission générés et sauvegardés');
        }
      } catch (tableError) {
        console.error('❌ Erreur génération tableaux (non bloquant):', tableError);
        // Ne pas bloquer l'enregistrement en cas d'erreur
      }
      
      // 🎯 FORCER MISE À JOUR IMMÉDIATE DE LA FEUILLE DE CAISSE
      console.log('🔄 Forçage mise à jour interface...');
      setForceUpdate(prev => prev + 1);
      
      // Attendre un peu plus longtemps pour que tout soit synchronisé
      setTimeout(() => {
        console.log('🕐 Vérification après délai, session actuelle:', session?.eventName);
        
        // Si la feuille est en mode aperçu, on force le rafraîchissement
        if (modeApercu) {
          console.log('🔄 Mise à jour du contenu HTML de la feuille');
          const contentElement = document.getElementById('zone-impression-content');
          if (contentElement) {
            setContentHtmlForPrint(contentElement.innerHTML);
          }
        }
      }, 500); // Délai plus long
      
      alert('✅ Détails de l\'événement enregistrés.\n📍 Le nom devrait maintenant apparaître immédiatement !');
    } catch (e) {
      console.error('Erreur mise à jour événement:', e);
      const msg = e instanceof Error ? e.message : 'Erreur lors de l\'enregistrement de l\'événement';
      alert(msg);
    }
  }, [eventName, eventStart, eventEnd, refreshSession, modeApercu, session?.eventName]);

  const closeSession = useCallback(async () => {
    // Empêcher la clôture si le dernier jour n'est pas passé
    if (session?.eventEnd) {
      const now = Date.now();
      if (now < endOfDay(session.eventEnd)) {
        alert(`La session ne peut pas être clôturée avant la fin de l'événement (dernier jour: ${new Date(session.eventEnd).toLocaleDateString('fr-FR')}).`);
        return;
      }
    }
    const ok = window.confirm('Clôturer la session de caisse en cours ?');
    if (!ok) return;
    try {
      const totals = await computeTodayTotalsFromDB();
      await closeCurrentSessionHelper({ closedBy: 'system', totals });
      await refreshSession();
    } catch (e) {
      console.error('Erreur fermeture session:', e);
      const msg = e instanceof Error ? e.message : 'Erreur lors de la fermeture de la session';
      alert(msg);
    }
  }, [session, refreshSession]);

  // ===== CALCULS =====
  const calculs = useMemo(() => {
    // 🔧 Récupérer le timestamp de la dernière RAZ (pour CA journalier depuis RAZ)
    const lastRAZTimestamp = localStorage.getItem('lastRAZTimestamp');
    const razTimestamp = lastRAZTimestamp ? parseInt(lastRAZTimestamp) : 0; // Si pas de RAZ, tout compte
    
    // 🎯 FONCTION UTILITAIRE : Vérifier si une date est aujourd'hui (comme CATab)
    const isToday = (date: Date | string): boolean => {
      const today = new Date();
      const checkDate = new Date(date);
      return checkDate.toDateString() === today.toDateString();
    };
    
    console.log(`📅 FEUILLE DE CAISSE - Dernière RAZ: ${razTimestamp ? new Date(razTimestamp).toLocaleString('fr-FR') : 'Jamais'}`);
    console.log(`📊 FEUILLE DE CAISSE - Sources de données:`, {
      allSalesCombined: allSalesCombined.length,
      allInvoicesCombined: allInvoicesCombined.length,
      recentSales: recentSales.length,
      supabaseInvoices: supabaseInvoices.length
    });
    
    // 🎯 UTILISER allSalesCombined ET allInvoicesCombined au lieu de sales/invoices
    // 🎯 FILTRER UNIQUEMENT LES VENTES EN MODE "CLASSIQUE", APRÈS RAZ ET AUJOURD'HUI (comme CATab)
    // Les ventes en mode "facturier" sont gérées par l'iPad et N8N, pas par la caisse
    const validSales = allSalesCombined.filter(sale => {
      if (sale.canceled) return false;
      if (sale.cartMode && sale.cartMode !== 'classique') return false; // Mode classique uniquement
      
      // 🔧 Filtrer par date (AUJOURD'HUI uniquement - comme CATab)
      if (!isToday(sale.date)) {
        console.log(`⚠️ Feuille de Caisse - Vente ${sale.id} exclue: pas aujourd'hui (${sale.date})`);
        return false;
      }
      
      // 🔧 Filtrer par timestamp RAZ (uniquement ventes APRÈS le RAZ)
      if (razTimestamp > 0) {
        const saleTimestamp = sale.date instanceof Date ? sale.date.getTime() : new Date(sale.date).getTime();
        if (saleTimestamp <= razTimestamp) {
          console.log(`⚠️ Feuille de Caisse - Vente ${sale.id} exclue: avant RAZ`);
          return false; // Exclure ventes avant ou au moment du RAZ
        }
      }
      
      return true;
    });
    
    // 🔧 Filtrer les factures APRÈS RAZ ET AUJOURD'HUI (comme CATab)
    const validInvoices = allInvoicesCombined.filter(invoice => {
      // Filtrer par date (AUJOURD'HUI uniquement - comme CATab)
      if (!isToday(invoice.createdAt)) {
        console.log(`⚠️ Feuille de Caisse - Facture ${invoice.invoiceNumber || invoice.id} exclue: pas aujourd'hui (${invoice.createdAt})`);
        return false;
      }
      
      if (razTimestamp === 0) return true; // Pas de RAZ, tout compte
      const invoiceTimestamp = invoice.createdAt instanceof Date 
        ? invoice.createdAt.getTime() 
        : new Date(invoice.createdAt).getTime();
      const isAfterRAZ = invoiceTimestamp > razTimestamp;
      if (!isAfterRAZ) {
        console.log(`⚠️ Feuille de Caisse - Facture ${invoice.invoiceNumber || invoice.id} exclue: avant RAZ`);
      }
      return isAfterRAZ; // Strictement après (pas >=)
    });

    console.log('🔍 RAZ - Filtrage des ventes:', {
      totalSalesCombined: allSalesCombined.length,
      salesToday: allSalesCombined.filter(s => !s.canceled && isToday(s.date)).length,
      validSalesClassique: validSales.length,
      totalInvoicesCombined: allInvoicesCombined.length,
      invoicesToday: allInvoicesCombined.filter(inv => isToday(inv.createdAt)).length,
      validInvoices: validInvoices.length,
      razTimestamp: razTimestamp ? new Date(razTimestamp).toLocaleString('fr-FR') : 'Jamais',
      modeCounts: {
        classique: allSalesCombined.filter(s => !s.canceled && (!s.cartMode || s.cartMode === 'classique') && isToday(s.date)).length,
        facturier: allSalesCombined.filter(s => !s.canceled && s.cartMode === 'facturier' && isToday(s.date)).length,
        undefined: allSalesCombined.filter(s => !s.canceled && !s.cartMode && isToday(s.date)).length
      }
    });

    // Calcul des chèques à venir depuis les ventes de la caisse (mode classique uniquement)
    const chequesAVenirFromSales = validSales
      .filter(sale => sale.checkDetails && sale.checkDetails.count > 0)
      .reduce((total, sale) => total + (sale.checkDetails?.totalAmount || 0), 0);

    // Identifier les ventes avec factures manuelles (matelas/sur-matelas en mode classique)
    const salesWithManualInvoices = validSales.filter(sale => sale.manualInvoiceData);

    const caisseParPaiement = {
      carte: validSales.filter(v => v.paymentMethod === 'card').reduce((s, v) => s + v.totalAmount, 0),
      especes: validSales.filter(v => v.paymentMethod === 'cash').reduce((s, v) => s + v.totalAmount, 0),
      // Chèque au comptant uniquement: exclure les ventes avec checkDetails (chèques à venir)
      cheque: validSales
        .filter(v => v.paymentMethod === 'check' && !(v.checkDetails && v.checkDetails.count > 0))
        .reduce((s, v) => s + v.totalAmount, 0),
      // Mixte strict: ne compter que les ventes réellement 'multi'
      mixte: validSales.filter(v => v.paymentMethod === 'multi').reduce((s, v) => s + v.totalAmount, 0),
    };
    // CA caisse réel = toutes les ventes (y compris chèques à venir)
    const caisseTotal = validSales.reduce((s, v) => s + (v.totalAmount || 0), 0);
    const caisseNbVentes = validSales.length;
    const caisseTicketMoyen = caisseNbVentes > 0 ? caisseTotal / caisseNbVentes : 0;

    const facturierTotal = validInvoices.reduce((s, inv) => s + inv.totalTTC, 0);
    const facturierNbVentes = validInvoices.length;
    const facturierTicketMoyen = facturierNbVentes > 0 ? facturierTotal / facturierNbVentes : 0;

    const caTotal = caisseTotal + facturierTotal;
    const nbVentesTotal = caisseNbVentes + facturierNbVentes;
    const ticketMoyen = nbVentesTotal > 0 ? caTotal / nbVentesTotal : 0;

    // 🔧 Fonction helper pour normaliser les noms (insensible aux espaces/casse/accents)
    // IDENTIQUE À CATab.tsx pour cohérence totale
    const normalizeName = (name: string | undefined | null): string => {
      if (!name) return '';
      const normalized = name.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      
      // Gérer les variations connues (comme CATab)
      if (normalized.includes('bavette') || normalized.includes('babeth')) {
        return 'babette';
      }
      
      return normalized;
    };

    // 🔍 DEBUG : Analyse des vendorNames dans les ventes
    const vendorNamesInSales = [...new Set(validSales.map(s => s.vendorName).filter(Boolean))];
    const vendorNamesInInvoices = [...new Set(validInvoices.map(f => f.vendorName).filter(Boolean))];
    const vendorNamesInStats = vendorStats.map(v => v.name);
    
    console.log('🔍 DEBUG VENDEUSES - Attribution des ventes:', {
      totalVendesStats: vendorStats.length,
      vendorNamesInStats: vendorNamesInStats,
      uniqueVendorNamesInSales: vendorNamesInSales,
      uniqueVendorNamesInInvoices: vendorNamesInInvoices,
      salesCount: validSales.length,
      invoicesCount: validInvoices.length,
      matches: vendorNamesInSales.map(saleName => {
        const match = vendorStats.find(v => normalizeName(v.name) === normalizeName(saleName));
        return { saleName, matched: match?.name || 'PAS DE CORRESPONDANCE', matchFound: !!match };
      })
    });

    const vendeusesAvecDetail = vendorStats.map(vendeur => {
      // 🔧 Comparaison normalisée pour éviter les problèmes d'espaces/casse/accents
      // IDENTIQUE À CATab.tsx pour cohérence totale
      const normalizedVendorName = normalizeName(vendeur.name);
      
      const ventesVendeur = validSales.filter(v => {
        // Match par vendorId d'abord (comme CATab)
        if (v.vendorId === vendeur.id) return true;
        // Sinon, match par nom normalisé
        const saleName = normalizeName(v.vendorName);
        return saleName === normalizedVendorName;
      });
      
      const facturesVendeur = validInvoices.filter(f => {
        // Match par vendorId d'abord (comme CATab)
        if (f.vendorId === vendeur.id) {
          console.log(`✅ Feuille de Caisse - Facture ${f.invoiceNumber || f.id} matchée par vendorId pour ${vendeur.name}`);
          return true;
        }
        // Sinon, match par nom normalisé
        const invoiceName = normalizeName(f.vendorName);
        const matches = invoiceName === normalizedVendorName;
        if (matches) {
          console.log(`✅ Feuille de Caisse - Facture ${f.invoiceNumber || f.id} matchée par nom: "${f.vendorName}" → "${vendeur.name}"`);
        }
        return matches;
      });

      // 🔍 Log pour chaque vendeuse
      if (ventesVendeur.length > 0 || facturesVendeur.length > 0) {
        console.log(`✅ ${vendeur.name}: ${ventesVendeur.length} ventes, ${facturesVendeur.length} factures, CA: ${(ventesVendeur.reduce((s, v) => s + (v.totalAmount || 0), 0) + facturesVendeur.reduce((s, f) => s + f.totalTTC, 0)).toFixed(2)}€`);
      }

      // Calcul des chèques à venir pour cette vendeuse
      const chequesAVenirVendeur = ventesVendeur
        .filter(sale => sale.checkDetails && sale.checkDetails.count > 0)
        .reduce((total, sale) => total + (sale.checkDetails?.totalAmount || 0), 0);

      const detailPaiements = {
        carte: ventesVendeur.filter(v => v.paymentMethod === 'card').reduce((s, v) => s + v.totalAmount, 0),
        especes: ventesVendeur.filter(v => v.paymentMethod === 'cash').reduce((s, v) => s + v.totalAmount, 0),
        // Chèque au comptant uniquement pour la vendeuse
        cheque: ventesVendeur
          .filter(v => v.paymentMethod === 'check' && !(v.checkDetails && v.checkDetails.count > 0))
          .reduce((s, v) => s + v.totalAmount, 0),
        // Mixte strict pour la vendeuse
        mixte: ventesVendeur.filter(v => v.paymentMethod === 'multi').reduce((s, v) => s + v.totalAmount, 0),
      };
      // CA caisse vendeur réel = somme de toutes ses ventes
      const totalCaisseVendeur = ventesVendeur.reduce((s, v) => s + (v.totalAmount || 0), 0);
      const totalFacturierVendeur = facturesVendeur.reduce((s, f) => s + f.totalTTC, 0);
      const totalVendeur = totalCaisseVendeur + totalFacturierVendeur;
      const nbVentesVendeur = ventesVendeur.length + facturesVendeur.length;

      return {
        ...vendeur,
        detailPaiements,
        totalCaisse: totalCaisseVendeur,
        totalFacturier: totalFacturierVendeur,
        totalCalcule: totalVendeur,
        nbVentesCalcule: nbVentesVendeur,
        nbVentesCaisse: ventesVendeur.length,
        nbVentesFacturier: facturesVendeur.length
      };
    });

    // 🔍 Gestion des ventes orphelines (vendorName qui ne correspond à aucune vendeuse)
    const vendorNamesInAllSales = new Set([
      ...validSales.map(s => normalizeName(s.vendorName)).filter(Boolean),
      ...validInvoices.map(f => normalizeName(f.vendorName)).filter(Boolean)
    ]);
    const vendorNamesMatched = new Set(vendorStats.map(v => normalizeName(v.name)));
    
    const orphanSales = validSales.filter(v => {
      const saleName = normalizeName(v.vendorName);
      return saleName && !vendorNamesMatched.has(saleName);
    });
    const orphanInvoices = validInvoices.filter(f => {
      const invoiceName = normalizeName(f.vendorName);
      return invoiceName && !vendorNamesMatched.has(invoiceName);
    });

    if (orphanSales.length > 0 || orphanInvoices.length > 0) {
      console.warn('⚠️ VENTES ORPHELINES DÉTECTÉES:', {
        orphanSales: orphanSales.map(s => ({ vendorName: s.vendorName, total: s.totalAmount, id: s.id })),
        orphanInvoices: orphanInvoices.map(f => ({ vendorName: f.vendorName, total: f.totalTTC })),
        totalOrphanAmount: orphanSales.reduce((s, v) => s + (v.totalAmount || 0), 0) + orphanInvoices.reduce((s, f) => s + f.totalTTC, 0)
      });
    }

    // 📊 RÉSUMÉ FINAL : Toutes les vendeuses avec leur CA
    console.log('📊 RÉSUMÉ VENDEUSES - Feuille de Caisse:', {
      totalVendeuses: vendorStats.length,
      vendeusesAvecCA: vendeusesAvecDetail.filter(v => v.totalCalcule > 0).map(v => ({
        nom: v.name,
        CA: v.totalCalcule.toFixed(2) + '€',
        ventes: v.nbVentesCalcule,
        detailCaisse: v.totalCaisse.toFixed(2) + '€',
        detailFacturier: v.totalFacturier.toFixed(2) + '€'
      })),
      vendeusesSansCA: vendeusesAvecDetail.filter(v => v.totalCalcule === 0).map(v => v.name),
      totalOrphelin: (orphanSales.reduce((s, v) => s + (v.totalAmount || 0), 0) + orphanInvoices.reduce((s, f) => s + f.totalTTC, 0)).toFixed(2) + '€'
    });

    const vendeusesActives = vendeusesAvecDetail.filter(v => v.totalCalcule > 0).length;

    // Ne pas cumuler les chèques à venir de la caisse avec ceux du facturier
    const totalReglementsAVenir = reglementsData.reduce((total: number, r: PendingPayment) => total + (r.nbCheques * r.montantCheque), 0);
    const totalReglementsAVenirComplet = totalReglementsAVenir; // exclure chequesAVenirFromSales pour éviter doublon
    const nbClientsAttente = reglementsData.length;
    const nbChequesTotal = reglementsData.reduce((total: number, r: PendingPayment) => total + r.nbCheques, 0);
    const nbChequesTotalComplet = nbChequesTotal; // ne pas ajouter ceux issus des ventes caisse

    return {
      parPaiement: caisseParPaiement,
      caTotal,
      nbVentesTotal,
      ticketMoyen,
      vendeusesActives,
      vendeusesAvecDetail,
      caisseTotal,
      caisseNbVentes,
      caisseTicketMoyen,
      caisseParPaiement,
      facturierTotal,
      facturierNbVentes,
      facturierTicketMoyen,
      totalReglementsAVenir: totalReglementsAVenirComplet, // Utiliser le total complet
      nbClientsAttente,
      nbChequesTotal: nbChequesTotalComplet, // Utiliser le total complet
      chequesAVenirFromSales, // Ajouter pour debug/info
      salesWithManualInvoices // Ajouter les ventes avec factures manuelles
    };
  }, [allSalesCombined, allInvoicesCombined, vendorStats, reglementsData]);

  // ====== LIGNES POUR TABLES CHÈQUES (dépendent des états existants) ======
  const classicChequeRows = useMemo(() => {
    const rows = toChequeRowsFromSales(
      allSalesCombined.filter(s => !s.canceled && (!s.cartMode || s.cartMode === 'classique')) // garde cohérence "classique"
    );
    // applique éditions locales si présentes
    return rows.map(r => {
      const e = editableChecks[r.id ?? r.invoiceNumber];
      if (!e) return r;
      const nb = Math.max(1, Number(e.nbCheques ?? r.nbCheques));
      const per = Math.max(0, Number(e.perChequeAmount ?? r.perChequeAmount));
      return {
        ...r,
        product: e.product ?? r.product,
        nbCheques: nb,
        perChequeAmount: per,
        invoiceTotal: Number((nb * per).toFixed(2)),
      };
    });
  }, [allSalesCombined, editableChecks]);

  const facturierChequeRows = useMemo(() => toChequeRowsFromPending(reglementsData), [reglementsData]);

  // Data fusionnée pour l'impression
  const checksPrintData = useMemo(() => mergeChequeRows(classicChequeRows, facturierChequeRows), [classicChequeRows, facturierChequeRows]);

  // Handler édition cellules (classique)
  const handleEditClassic = (row: ChequeRow, patch: Partial<{ nbCheques: number; perChequeAmount: number; product: string }>) => {
    const key = row.id ?? row.invoiceNumber;
    setEditableChecks(prev => ({
      ...prev,
      [key]: {
        nbCheques: patch.nbCheques ?? prev[key]?.nbCheques ?? row.nbCheques,
        perChequeAmount: patch.perChequeAmount ?? prev[key]?.perChequeAmount ?? row.perChequeAmount,
        product: patch.product ?? prev[key]?.product ?? row.product,
      }
    }));
    // rafraîchit HTML imprimable si l'aperçu est ouvert
    setTimeout(() => {
      const contentElement = document.getElementById('zone-impression-content');
      if (contentElement) setContentHtmlForPrint(contentElement.innerHTML);
    }, 60);
  };

  // ===== EMAIL (inchangé) =====
  const envoyerEmail = () => {
    const dateJour = new Date().toLocaleDateString('fr-FR', { weekday:'long', day:'numeric', month:'long', year:'numeric' });
    let contenuEmail = `MYCONFORT - FEUILLE DE CAISSE\n${dateJour.toUpperCase()}\n\n`;
    if (session?.eventName) {
      contenuEmail += `ÉVÉNEMENT : ${session.eventName}`;
      if (session.eventStart && session.eventEnd) {
        contenuEmail += ` (du ${new Date(session.eventStart).toLocaleDateString('fr-FR')} au ${new Date(session.eventEnd).toLocaleDateString('fr-FR')})`;
      }
      contenuEmail += `\n\n`;
    }
    contenuEmail += `RÉSUMÉ DU JOUR :\n- Chiffre d'affaires : ${calculs.caTotal.toFixed(2)} €\n- Nombre de ventes : ${calculs.nbVentesTotal}\n- Ticket moyen : ${calculs.ticketMoyen.toFixed(2)} €\n- Vendeuses actives : ${calculs.vendeusesActives}\n\n`;
    contenuEmail += `DÉTAIL PAR VENDEUSE :\n`;
    calculs.vendeusesAvecDetail.filter(v => v.totalCalcule>0).sort((a,b)=>b.totalCalcule-a.totalCalcule).forEach(v=>{
      contenuEmail += `${v.name} : ${v.totalCalcule.toFixed(2)} € (${v.nbVentesCalcule} ventes)\n`;
      contenuEmail += `  • Carte : ${v.detailPaiements.carte.toFixed(2)} €\n  • Espèces : ${v.detailPaiements.especes.toFixed(2)} €\n  • Chèque : ${v.detailPaiements.cheque.toFixed(2)} €\n`;
      if (v.detailPaiements.mixte>0) contenuEmail += `  • Mixte : ${v.detailPaiements.mixte.toFixed(2)} €\n`;
      contenuEmail += `\n`;
    });
    contenuEmail += `TOTAUX PAR MODE DE PAIEMENT :\n- Carte bancaire : ${calculs.parPaiement.carte.toFixed(2)} €\n- Espèces : ${calculs.parPaiement.especes.toFixed(2)} €\n- Chèque : ${calculs.parPaiement.cheque.toFixed(2)} €\n- Mixte : ${calculs.parPaiement.mixte.toFixed(2)} €\n\n`;
    contenuEmail += `RÈGLEMENTS À VENIR (FACTURIER) :\nTotal attendu : ${calculs.totalReglementsAVenir.toFixed(2)} € (${calculs.nbChequesTotal} chèques)\n\n`;
    reglementsData.forEach((r: PendingPayment)=>{
      const totalClient = r.nbCheques * r.montantCheque;
      contenuEmail += `${r.vendorName} - ${r.clientName} :\n  ${r.nbCheques} chèques de ${r.montantCheque.toFixed(2)} € = ${totalClient.toFixed(2)} €\n  Prochaine échéance : ${new Date(r.dateProchain).toLocaleDateString('fr-FR')}\n\n`;
    });
    contenuEmail += `Rapport généré automatiquement le ${new Date().toLocaleString('fr-FR')}\nMyConfort - Système de caisse`;
    const sujet = `MyConfort - Feuille de caisse du ${new Date().toLocaleDateString('fr-FR')}`;
    const to = 'myconfort66@gmail.com';
    const mailtoUrl = `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(sujet)}&body=${encodeURIComponent(contenuEmail)}`;
    window.location.href = mailtoUrl;
  };

  // ===== FONCTIONS WORKFLOW SÉCURISÉ =====
  
  const afficherDetailReglements = () => {
    const validSales = allSalesCombined.filter(sale => !sale.canceled);
    const chequesFromSales = validSales.filter(sale => sale.checkDetails && sale.checkDetails.count > 0);
    
    let detailMessage = `💰 RÈGLEMENTS À VENIR - DÉTAIL COMPLET\n\n`;
    
    // Chèques à venir de la caisse
    if (chequesFromSales.length > 0) {
      detailMessage += `🏪 CHÈQUES CAISSE (${chequesFromSales.length} ventes):\n`;
      chequesFromSales.forEach(sale => {
        const checkDetails = sale.checkDetails!;
        detailMessage += `• ${sale.vendorName} - ${checkDetails.count} chèques de ${checkDetails.amount.toFixed(2)}€ = ${checkDetails.totalAmount.toFixed(2)}€\n`;
        if (checkDetails.notes) detailMessage += `  Notes: ${checkDetails.notes}\n`;
      });
      detailMessage += `\n`;
    }
    
    // Chèques à venir du facturier
    if (reglementsData.length > 0) {
      detailMessage += `📋 CHÈQUES FACTURIER (${reglementsData.length} clients):\n`;
      reglementsData.forEach(r => {
        const totalClient = r.nbCheques * r.montantCheque;
        detailMessage += `• ${r.vendorName} - ${r.clientName}: ${r.nbCheques} chèques de ${r.montantCheque.toFixed(2)}€ = ${totalClient.toFixed(2)}€\n`;
        detailMessage += `  Prochaine échéance: ${new Date(r.dateProchain).toLocaleDateString('fr-FR')}\n`;
      });
      detailMessage += `\n`;
    }
    
    // Total
    const totalCaisse = chequesFromSales.reduce((total, sale) => total + (sale.checkDetails?.totalAmount || 0), 0);
    const totalFacturier = reglementsData.reduce((total, r) => total + (r.nbCheques * r.montantCheque), 0);
    const totalGeneral = totalCaisse + totalFacturier;
    
    detailMessage += `📊 RÉCAPITULATIF:\n`;
    detailMessage += `• Caisse: ${totalCaisse.toFixed(2)}€\n`;
    detailMessage += `• Facturier: ${totalFacturier.toFixed(2)}€\n`;
    detailMessage += `• TOTAL: ${totalGeneral.toFixed(2)}€`;
    
    alert(detailMessage);
  };

  const effectuerVisualisation = () => {
    setModeApercu(true);
    setIsViewed(true);
    
    // Capturer le contenu HTML pour l'impression
    setTimeout(() => {
      const contentElement = document.getElementById('zone-impression-content');
      if (contentElement) {
        setContentHtmlForPrint(contentElement.innerHTML);
      }
    }, 100); // Petit délai pour que le DOM soit mis à jour
  };

  const envoyerEmailSecurise = () => {
    console.log('🔍 DEBUG Email - État du workflow:', { isViewed, isPrinted, isEmailSent });
    
    if (!isPrinted) {
      alert('⚠️ Veuillez d\'abord IMPRIMER la feuille de RAZ en cliquant sur "Imprimer".');
      return;
    }
    
    console.log('✅ Conditions remplies, envoi de l\'email...');
    envoyerEmail(); // Appelle la fonction email existante
    setIsEmailSent(true);
  };

  const effectuerRAZJourneeSecurisee = async () => {
    // DEBUG: Appel direct pour tester
    console.log('🔴 Bouton RAZ Journée cliqué - Test direct');
    
    // Confirmation simple
    if (confirm('🔴 Êtes-vous sûr de vouloir effectuer la RAZ Journée ?\n\n⚠️ Cette action va :\n- Imprimer la feuille automatiquement\n- Sauvegarder les données\n- Remettre à zéro les données')) {
      await confirmerRAZJournee();
    }
    
    // Version avec modal (commentée pour debug)
    // setShowRAZGuardModal(true);
  };

  const confirmerRAZJournee = async () => {
    setShowRAZGuardModal(false);
    
    try {
      // 0. IMPRESSION AUTOMATIQUE AVANT RAZ 🖨️
      console.log('🖨️ Impression automatique de la feuille de caisse...');
      handleRAZPrint();
      
      // 1. SAUVEGARDE AUTOMATIQUE FORCÉE
      console.log('🛡️ Sauvegarde automatique avant RAZ Journée...');
      await exportDataBeforeReset();
      
      // 2. Attendre 1.5 secondes pour que l'utilisateur voie la sauvegarde
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // 3. RAZ normale
      externalInvoiceService.clearAllInvoices();
      console.log('🧹 Factures externes nettoyées (RAZ Journée)');
      
      // 4. Réinitialiser le workflow
      setIsViewed(false);
      setIsPrinted(false);
      setIsEmailSent(false);
      setModeApercu(false);
      
      alert('✅ RAZ Journée terminée avec succès !');
      executeRAZ();
    } catch (error) {
      console.error('❌ Erreur RAZ Journée:', error);
      alert('❌ Erreur lors de la RAZ Journée: ' + (error instanceof Error ? error.message : String(error)));
    }
  };

  // RAZ Fin de session (purge aussi règlements à venir + clôture) - AVEC SAUVEGARDE AUTO
  const effectuerRAZFinSessionSecurisee = async () => {
    try {
      // 0. VÉRIFICATION DATE OBLIGATOIRE
      if (!canEndSessionToday) {
        const dateFinMessage = session?.eventEnd ? 
          `Vous pouvez effectuer la RAZ Fin Session à partir du ${new Date(session.eventEnd).toLocaleDateString('fr-FR')}.` :
          'Aucune date de fin de session configurée.';
        alert(`🚫 RAZ Fin Session non autorisée aujourd'hui.\n\n${dateFinMessage}\n\nSeule la RAZ Journée est disponible actuellement.`);
        return;
      }
      
      // 1. SAUVEGARDE AUTOMATIQUE FORCÉE
      console.log('🛡️ Sauvegarde automatique avant RAZ Fin Session...');
      await exportDataBeforeReset();
      
      // 2. Attendre 1.5 secondes pour que l'utilisateur voie la sauvegarde
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // 3. Confirmation avec mention de la sauvegarde
      const ok = window.confirm(
        '✅ Sauvegarde automatique effectuée !\n\n' +
        '⚠️ Cette action va remettre à zéro la session complète.\n' +
        'Les règlements à venir (chèques différés) et les factures externes seront supprimés, puis la session sera clôturée.\n\n' +
        'Confirmer la REMISE À ZÉRO FIN DE SESSION ?'
      );
      if (!ok) return;
      
      // 4. RAZ complète
      // 1) Nettoyer factures externes
      externalInvoiceService.clearAllInvoices();
      console.log('🧹 Factures externes nettoyées (RAZ Fin de session)');

      // 2) Purger règlements à venir
      await pendingPaymentsService.clearAll();
      setReglementsData([]);
      console.log('🧹 Règlements à venir nettoyés (RAZ Fin de session)');

      // 3) Fermer la session en base (si événement terminé, sinon on force la clôture logique)
      try {
        const totals = await computeTodayTotalsFromDB();
        await closeCurrentSessionHelper({ closedBy: 'system', totals });
        await refreshSession();
      } catch (err) {
        console.warn('⚠️ Impossible de clôturer proprement la session, on continue la RAZ fin de session:', err);
      }

      // 4) RAZ "de base" réutilisée
      await Promise.resolve(executeRAZ());
      console.log('✅ RAZ fin de session effectuée');
    } catch (e) {
      console.error('Erreur RAZ fin de session sécurisée:', e);
      alert('Erreur lors de la remise à zéro fin de session.');
    }
  };

  return (
    <div style={{ fontFamily: 'Arial, sans-serif' }}>
      {/* Modal RAZ Guard - Notification sécurisée avec emoji 😃 */}
      {razGuardReady && showRAZGuardModal && (
        <RAZGuardModal
          isViewed={isViewed}
          isPrinted={isPrinted}
          isEmailSent={isEmailSent}
          sessionId={session?.eventName ? `${session.eventName.replace(/\s+/g, '_').toLowerCase()}_${new Date().getDate()}` : 'caisse_myconfort'}
          showMode={razGuardMode}
          chimeSrc="/sounds/ding.mp3"
          onAcknowledge={() => {
            console.log('🛡️ RAZ Guard: Utilisateur a confirmé avoir lu les règles pour RAZ Journée');
            setShowRAZGuardModal(false);
            confirmerRAZJournee();
          }}
        />
      )}
      
      {/* UI iPad (masquée à l'impression) */}
      <div className="no-print" style={{ padding: '20px', backgroundColor: '#f5f5f5', minHeight: '100vh' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          {/* En-tête */}
          <div style={{ textAlign: 'center', marginBottom: '30px', padding: '20px', backgroundColor: '#477A0C', color: 'white', borderRadius: '10px' }}>
            <h1 style={{ margin: 0, fontSize: '2.2em', fontWeight: 'bold' }}>📋 FEUILLE DE CAISSE MYCONFORT</h1>
            <p style={{ margin: '10px 0 0 0', fontSize: '1.1em' }}>
              {new Date().toLocaleDateString('fr-FR', { weekday:'long', day:'numeric', month:'long', year:'numeric' })}
            </p>
          </div>

          {/* Session - Header compact coloré (format feuille de caisse) */}
          <div style={{
            background: session 
              ? 'linear-gradient(135deg, #065F46 0%, #047857 50%, #059669 100%)' 
              : 'linear-gradient(135deg, #7C2D12 0%, #DC2626 50%, #EF4444 100%)',
            color: 'white',
            padding: 16,
            borderRadius: 10,
            marginBottom: 20,
            boxShadow: '0 2px 10px rgba(0,0,0,0.06)'
          }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:12 }}>
              <div>
                <div style={{ margin: 0, fontSize: 20, fontWeight: 800, display:'flex', alignItems:'center', gap:8 }}>
                  📍 {session?.eventName || 'Aucune session active'}
                </div>
                <div style={{ marginTop: 6, opacity: 0.95, fontWeight: 600 }}>
                  {session 
                    ? `Session ${session.status ?? 'ouverte'} • ${session.eventStart ? new Date(session.eventStart).toLocaleDateString('fr-FR') : '—'} - ${session.eventEnd ? new Date(session.eventEnd).toLocaleDateString('fr-FR') : '—'}`
                    : `Créez une session pour démarrer l'enregistrement des ventes`
                  }
                </div>
              </div>
              <div style={{ display:'flex', gap:10 }}>
                {!session && (
                  <button
                    onClick={openSession}
                    disabled={openingSession}
                    style={{
                      background:'rgba(255,255,255,0.2)', border:'1px solid rgba(255,255,255,0.35)', color:'#fff',
                      padding:'10px 16px', borderRadius:8, fontWeight:800, cursor: openingSession ? 'not-allowed':'pointer'
                    }}
                  >
                    Ouvrir une session
                  </button>
                )}
                {session && (
                  <button
                    onClick={() => {
                      const name = prompt('Nom de la foire', eventName || session.eventName || '');
                      if (!name) return;
                      const start = prompt('Date de début (yyyy-mm-dd)', toInputDate(session.eventStart));
                      const end = prompt('Date de fin (yyyy-mm-dd)', toInputDate(session.eventEnd));
                      const patch: Partial<SessionDB> = {
                        eventName: name.trim(),
                        eventStart: start ? new Date(start).getTime() : session.eventStart,
                        eventEnd: end ? new Date(end).getTime() : session.eventEnd,
                      };
                      updateSessionHelper(session.id, patch).then(() => refreshSession());
                    }}
                    style={{
                      background:'rgba(255,255,255,0.2)', border:'1px solid rgba(255,255,255,0.35)', color:'#fff',
                      padding:'10px 16px', borderRadius:8, fontWeight:800, cursor:'pointer'
                    }}
                  >
                    Modifier
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Boutons - Interface Améliorée */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 15, marginBottom: 30 }}>
            {/* 🖤 Bouton Noir : Voir feuille de caisse */}
            <button 
              onClick={effectuerVisualisation} 
              style={btn(isViewed ? '#4A5568' : '#1A202C', true)}
              title={isViewed ? 'Feuille visualisée ✓' : 'Étape 1: Visualiser la feuille'}
            >
              {isViewed ? <EyeOff size={20} /> : <Eye size={20} />}
              {isViewed ? "Feuille vue ✓" : 'Voir la feuille'}
            </button>
            
            {/*  Bouton Jaune-Vert : Envoyer par email */}
            <button 
              onClick={envoyerEmailSecurise} 
              style={!isPrinted ? btnDisabled('#84CC16') : btn('#84CC16', false, '#1A202C')} 
              disabled={!isPrinted}
              title={!isPrinted ? `Imprimez d'abord la feuille (Imprimé: ${isPrinted ? '✓' : '✗'})` : isEmailSent ? 'Email envoyé ✓' : 'Étape 3: Envoyer par email'}
            >
              <Mail size={20}/>
              {isEmailSent ? 'Email envoyé ✓' : 'Envoyer par Email'}
            </button>

            {/* 🖨️ Bouton Bleu : Imprimer */}
            <button 
              onClick={handleRAZPrint} 
              style={btn('#3B82F6', false, '#FFFFFF')} 
              title={isPrinted ? 'Impression déjà effectuée ✓' : 'CLIQUEZ ICI pour débloquer le bouton email (génère et imprime automatiquement)'}
            >
              <Printer size={20}/>
              {isPrinted ? 'Imprimé ✓' : 'Imprimer pour débloquer email'}
            </button>

          {/* 🔍 Debug: Affichage de l'état des variables */}
          <div style={{ 
            background: isPrinted ? '#dcfce7' : '#fef3c7', 
            border: `1px solid ${isPrinted ? '#16a34a' : '#f59e0b'}`, 
            borderRadius: 6, 
            padding: 12, 
            fontSize: 14, 
            color: isPrinted ? '#166534' : '#92400e',
            gridColumn: 'span 4',
            fontWeight: 600 
          }}>
            📊 État du workflow: Vue={isViewed ? '✅' : '❌'} | Imprimé={isPrinted ? '✅' : '❌'} | Email={isEmailSent ? '✅' : '❌'}
            {isPrinted && <div style={{ marginTop: 4, fontSize: 12 }}>✅ Le bouton email devrait maintenant être actif!</div>}
          </div>
            
            {/* 🔴 Bouton Rouge : RAZ Journée (avec sauvegarde auto) */}
            <button 
              onClick={effectuerRAZJourneeSecurisee} 
              style={btn('#DC2626')} 
              title="RAZ Journée sécurisée avec impression automatique"
            >
              <RefreshCw size={20}/>
              RAZ Journée
            </button>
            
            {/* 🔴 Bouton Rouge Foncé : RAZ Fin Session (avec sauvegarde auto) */}
            <button 
              onClick={effectuerRAZFinSessionSecurisee} 
              style={!canEndSessionToday ? btnDisabled('#7C2D12') : btn('#7C2D12')} 
              disabled={!canEndSessionToday}
              title={!canEndSessionToday ? 
                `RAZ Fin Session disponible seulement à partir du ${session?.eventEnd ? new Date(session.eventEnd).toLocaleDateString('fr-FR') : 'date de fin'}` : 
                'RAZ Fin Session - Supprime TOUT'
              }
            >
              <RefreshCw size={20}/>
              RAZ Fin Session
            </button>
          </div>

          {/* 🆕===== BLOC NO-PRINT : DÉTAIL DES CHÈQUES (ONGLETS) ===== */}
          <div className="no-print" style={{ marginTop: 20, marginBottom: 30 }}>
            <div style={{ background: '#fff', border: '2px solid #477A0C', borderRadius: 10, boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}>
              <div style={{ padding: 12, background: '#f0f9ff', borderBottom: '1px solid #d1e9ff', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <h3 style={{ margin: 0, color: '#065F46', fontWeight: 800 }}>DÉTAIL DES CHÈQUES</h3>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    onClick={() => setChequesTab('classique')}
                    style={{ padding: '8px 12px', borderRadius: 6, border: '1px solid #e5e7eb', background: chequesTab==='classique' ? '#477A0C' : '#fff', color: chequesTab==='classique' ? '#fff' : '#111' }}
                  >
                    Panier classique
                  </button>
                  <button
                    onClick={() => setChequesTab('facturier')}
                    style={{ padding: '8px 12px', borderRadius: 6, border: '1px solid #e5e7eb', background: chequesTab==='facturier' ? '#477A0C' : '#fff', color: chequesTab==='facturier' ? '#fff' : '#111' }}
                  >
                    Panier facturier (auto)
                  </button>
                </div>
              </div>

              {/* TABLEAU CLASSIQUE (éditable) */}
              {chequesTab === 'classique' && (
                <div style={{ padding: 12 }}>
                  {classicChequeRows.length === 0 ? (
                    <div style={{ padding: 12, color: '#6B7280' }}>Aucun chèque en mode classique (factures réellement éditées).</div>
                  ) : (
                    <table style={{ width: '100%', borderCollapse: 'collapse', border: '1.5px solid #000' }}>
                      <thead>
                        <tr style={{ background: '#f8fafc' }}>
                          <th style={{ border: '1px solid #000', padding: '8px 6px', textAlign: 'left', width: '12%' }}>N° FACTURE</th>
                          <th style={{ border: '1px solid #000', padding: '8px 6px', textAlign: 'left', width: '25%' }}>NOM CLIENT</th>
                          <th style={{ border: '1px solid #000', padding: '8px 6px', textAlign: 'left', width: '30%' }}>PRODUIT</th>
                          <th style={{ border: '1px solid #000', padding: '8px 6px', textAlign: 'right', width: '10%' }}>NB CHÈQUES</th>
                          <th style={{ border: '1px solid #000', padding: '8px 6px', textAlign: 'right', width: '11%' }}>MONTANT/CHÈQUE (€)</th>
                          <th style={{ border: '1px solid #000', padding: '8px 6px', textAlign: 'right', width: '12%' }}>TOTAL FACTURE (€)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {classicChequeRows.map((r) => {
                          const key = r.id ?? r.invoiceNumber;
                          const edited = editableChecks[key];
                          const nb = edited?.nbCheques ?? r.nbCheques;
                          const per = edited?.perChequeAmount ?? r.perChequeAmount;
                          const prod = edited?.product ?? r.product;
                          const total = Number((nb * per).toFixed(2));
                          const mismatch = Math.abs(total - r.invoiceTotal) > 0.01;

                          return (
                            <tr key={key}>
                              <td style={{ border: '1px solid #000', padding: '8px 6px', fontWeight: 700 }}>{r.invoiceNumber}</td>
                              <td style={{ border: '1px solid #000', padding: '8px 6px' }}>{r.clientName}</td>
                              <td style={{ border: '1px solid #000', padding: '4px 6px' }}>
                                <input
                                  value={prod}
                                  onChange={(e)=>handleEditClassic(r,{ product:e.target.value })}
                                  style={{ width:'100%', border:'1px solid #e5e7eb', borderRadius:6, padding:'6px 8px' }}
                                />
                              </td>
                              <td style={{ border: '1px solid #000', padding: '4px 6px', textAlign:'right' }}>
                                <input
                                  type="number" min={1}
                                  value={nb}
                                  onChange={(e)=>handleEditClassic(r,{ nbCheques: Number(e.target.value) })}
                                  style={{ width:'100%', border:'1px solid #e5e7eb', borderRadius:6, padding:'6px 8px', textAlign:'right' }}
                                />
                              </td>
                              <td style={{ border: '1px solid #000', padding: '4px 6px', textAlign:'right' }}>
                                <input
                                  type="number" min={0} step="0.01"
                                  value={per}
                                  onChange={(e)=>handleEditClassic(r,{ perChequeAmount: Number(e.target.value) })}
                                  style={{ width:'100%', border:'1px solid #e5e7eb', borderRadius:6, padding:'6px 8px', textAlign:'right' }}
                                />
                              </td>
                              <td style={{ border: '1px solid #000', padding: '8px 6px', textAlign:'right', fontWeight: 700, background: mismatch ? '#fff7ed' : '#f7f7f7' }}>
                                {total.toFixed(2)}{mismatch ? ' ⚠︎' : ''}
                              </td>
                            </tr>
                          );
                        })}
                        <tr style={{ background:'#eee', fontWeight:700 }}>
                          <td colSpan={5} style={{ border:'1.5px solid #000', textAlign:'right', padding:'8px 6px' }}>TOTAL</td>
                          <td style={{ border:'1.5px solid #000', textAlign:'right', padding:'8px 6px' }}>
                            {classicChequeRows.reduce((s,r)=> s + (editableChecks[r.id ?? r.invoiceNumber]?.nbCheques ?? r.nbCheques) * (editableChecks[r.id ?? r.invoiceNumber]?.perChequeAmount ?? r.perChequeAmount), 0).toFixed(2)}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  )}
                </div>
              )}

              {/* TABLEAU FACTURIER (lecture seule) */}
              {chequesTab === 'facturier' && (
                <div style={{ padding: 12 }}>
                  {facturierChequeRows.length === 0 ? (
                    <div style={{ padding: 12, color: '#6B7280' }}>Aucun règlement à venir (facturier) trouvé.</div>
                  ) : (
                    <table style={{ width: '100%', borderCollapse: 'collapse', border: '1.5px solid #000' }}>
                      <thead>
                        <tr style={{ background: '#f8fafc' }}>
                          <th style={{ border: '1px solid #000', padding: '8px 6px', textAlign: 'left', width: '12%' }}>N° FACTURE</th>
                          <th style={{ border: '1px solid #000', padding: '8px 6px', textAlign: 'left', width: '25%' }}>NOM CLIENT</th>
                          <th style={{ border: '1px solid #000', padding: '8px 6px', textAlign: 'left', width: '30%' }}>PRODUIT</th>
                          <th style={{ border: '1px solid #000', padding: '8px 6px', textAlign: 'right', width: '10%' }}>NB CHÈQUES</th>
                          <th style={{ border: '1px solid #000', padding: '8px 6px', textAlign: 'right', width: '11%' }}>MONTANT/CHÈQUE (€)</th>
                          <th style={{ border: '1px solid #000', padding: '8px 6px', textAlign: 'right', width: '12%' }}>TOTAL FACTURE (€)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {facturierChequeRows.map((r) => (
                          <tr key={r.id ?? r.invoiceNumber}>
                            <td style={{ border: '1px solid #000', padding: '8px 6px', fontWeight: 700 }}>{r.invoiceNumber}</td>
                            <td style={{ border: '1px solid #000', padding: '8px 6px' }}>{r.clientName}</td>
                            <td style={{ border: '1px solid #000', padding: '8px 6px' }}>{r.product}</td>
                            <td style={{ border: '1px solid #000', padding: '8px 6px', textAlign:'right' }}>{r.nbCheques}</td>
                            <td style={{ border: '1px solid #000', padding: '8px 6px', textAlign:'right' }}>{r.perChequeAmount.toFixed(2)}</td>
                            <td style={{ border: '1px solid #000', padding: '8px 6px', textAlign:'right', fontWeight: 700, background:'#f7f7f7' }}>{r.invoiceTotal.toFixed(2)}</td>
                          </tr>
                        ))}
                        <tr style={{ background:'#eee', fontWeight:700 }}>
                          <td colSpan={5} style={{ border:'1.5px solid #000', textAlign:'right', padding:'8px 6px' }}>TOTAL</td>
                          <td style={{ border:'1.5px solid #000', textAlign:'right', padding:'8px 6px' }}>
                            {facturierChequeRows.reduce((s,r)=> s + r.invoiceTotal, 0).toFixed(2)}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Aperçu */}
          {modeApercu && (
            <div style={{ background: '#fff', padding: 20, borderRadius: 10, boxShadow: '0 4px 20px rgba(0,0,0,0.1)', border: '2px dashed #477A0C' }}>
              <h2 style={{ textAlign: 'center', color: '#477A0C', marginBottom: 16 }}>📄 APERÇU DE LA FEUILLE DE CAISSE</h2>
              <div id="zone-impression">
                <h1 style={{ textAlign: 'center', fontSize: '20px', marginBottom: '12px' }}>
                  📍 Feuille de Caisse — {eventNameDynamic}
                </h1>
                <div id="zone-impression-content">
                  <FeuilleImprimable 
                    calculs={calculs} 
                    event={session ? { name: session.eventName, start: session.eventStart, end: session.eventEnd } : undefined} 
                    reglementsData={reglementsData}
                    onReglementsClick={afficherDetailReglements}
                    checksPrintData={checksPrintData}
                  />
                </div>
              </div>
              
              {/* Bouton d'impression avec composant réutilisable */}
              <div style={{ textAlign: 'center', marginTop: '16px' }}>
                <FeuilleCaissePrintable
                  eventName={eventNameDynamic}
                  contentHtml={contentHtmlForPrint}
                  onPrintComplete={() => setIsPrinted(true)} // ✅ Marquer comme imprimé pour activer le bouton email
                />
              </div>
              </div>
          )}

          {/* Session - clôture (bas de page) */}
          <div style={{ background: '#fff', border: '2px solid #DC2626', borderRadius: 10, padding: 16, marginTop: 24, boxShadow: '0 2px 10px rgba(0,0,0,0.06)' }}>
            {sessLoading ? (
              <div style={{ color: '#991B1B', fontWeight: 600 }}>Chargement de la session...</div>
            ) : !session ? (
              <div style={{ color: '#991B1B' }}>Aucune session n'est ouverte actuellement.</div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                <div>
                  <div style={{ color: '#065F46', fontWeight: 700, fontSize: 16 }}>Session ouverte</div>
                  <div style={{ color: '#7F1D1D' }}>Ouverte à {new Date(session.openedAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</div>
                  {session.eventName && (
                    <div style={{ marginTop: 6, color: '#7F1D1D', fontWeight: 600 }}>
                      Événement : {session.eventName}
                      {session.eventStart && session.eventEnd && (
                        <span> (du {new Date(session.eventStart).toLocaleDateString('fr-FR')} au {new Date(session.eventEnd).toLocaleDateString('fr-FR')})</span>
                      )}
                    </div>
                  )}
                </div>
                <button onClick={closeSession} style={{ ...btn('#DC2626'), minWidth: 220 }} disabled={Boolean(session.eventEnd && Date.now() < endOfDay(session.eventEnd))} title={session?.eventEnd && Date.now() < endOfDay(session.eventEnd) ? `Clôture autorisée à partir du ${new Date(session.eventEnd).toLocaleDateString('fr-FR')}` : undefined}>
                  <XCircle size={20} /> Clôturer la session
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Version imprimable */}
      <div className="print-only">
        <FeuilleImprimable 
          calculs={calculs} 
          event={session ? { name: session.eventName, start: session.eventStart, end: session.eventEnd } : undefined} 
          reglementsData={reglementsData}
          onReglementsClick={afficherDetailReglements}
          checksPrintData={checksPrintData}
        />
      </div>

      {/* Styles impression (séparation écran/print) */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
          @media print {
            .no-print { display:none !important; visibility:hidden !important; }
            .print-only { display:block !important; visibility:visible !important; }
            * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; box-shadow:none !important; text-shadow:none !important; }
            body { margin:0 !important; padding:0 !important; background:#fff !important; color:#000 !important; font-family: Arial, sans-serif !important; font-size:11pt !important; line-height:1.25 !important; }
            @page { size: A4 portrait; margin:10mm; }
          }
          @media screen { .print-only { display:none; } .no-print { display:block; } }
        `
        }}
      />

      {/* Style pour option masquer colonne % */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          /* Dé-commente pour masquer la colonne % si ça déborde encore */
          /* .payments .col-percent { display: none !important; } */
        }
      `}}/>
    </div>
  );
}

const btn = (bg: string, white = true, color?: string) => ({
  padding: '15px 25px',
  fontSize: '1.05em',
  fontWeight: 'bold',
  backgroundColor: bg,
  color: color ?? (white ? 'white' : '#14281D'),
  border: 'none',
  borderRadius: 8,
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 10
});

const btnDisabled = (bg: string, white = true, color?: string) => ({
  ...btn(bg, white, color),
  backgroundColor: '#9CA3AF',
  color: '#6B7280',
  cursor: 'not-allowed',
  opacity: 0.6
});

const inputStyle: React.CSSProperties = {
  padding: '10px 12px',
  border: '1px solid #e5e7eb',
  borderRadius: 8,
  outline: 'none',
  fontSize: '0.95em'
};

interface FeuilleImprimableProps {
  calculs: {
    parPaiement: { carte: number; especes: number; cheque: number; mixte: number; };
    caTotal: number; nbVentesTotal: number; ticketMoyen: number;
    vendeusesActives: number; vendeusesAvecDetail: VendeusesAvecDetail[];
    totalReglementsAVenir: number; nbClientsAttente: number; nbChequesTotal: number;
    salesWithManualInvoices: Sale[];
  };
  event?: { name?: string; start?: number; end?: number };
  reglementsData?: PendingPayment[];
  onReglementsClick?: () => void; // Callback pour rendre le bouton interactif
  checksPrintData?: ChequeRow[]; // 🆕
}

function FeuilleImprimable({ calculs, event, reglementsData = [], onReglementsClick, checksPrintData = [] }: FeuilleImprimableProps) {
  return (
    <div style={{
      backgroundColor: '#fff', color: '#000', padding: '5mm',
      fontFamily: 'Arial, sans-serif', fontSize: '10pt', lineHeight: 1.2,
      maxWidth: '210mm', margin: '0 auto', minHeight: '297mm'
    }}>
      {/* En-tête */}
      <div className="print-section" style={{ textAlign: 'center', marginBottom: 6, paddingBottom: 4, borderBottom: '1.5px solid #000' }}>
        <h1 style={{ margin: 0, fontSize: '20pt', fontWeight: 700, letterSpacing: '2px' }}>MYCONFORT</h1>
        <h2 style={{ margin: '3px 0 2px', fontSize: '14pt', fontWeight: 700 }}>FEUILLE DE CAISSE</h2>
        {event?.name && (
          <p style={{ margin: '2px 0 4px', fontWeight: 700, fontSize: '12pt', color: '#2563eb' }}>
            ÉVÉNEMENT : {event.name.toUpperCase()}
            {event.start && event.end && (
              <span> (du {new Date(event.start).toLocaleDateString('fr-FR')} au {new Date(event.end).toLocaleDateString('fr-FR')})</span>
            )}
          </p>
        )}
        <p style={{ margin: 0, fontWeight: 700 }}>
          {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).toUpperCase()}
        </p>
      </div>

      {/* KPIs */}
      <div className="print-section" style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 6, marginBottom: 8 }}>
        {[
          ['CHIFFRE D\'AFFAIRES', `${calculs.caTotal.toFixed(2)} €`, false],
          ['NOMBRE DE VENTES', `${calculs.nbVentesTotal}`, false],
          ['TICKET MOYEN', `${calculs.ticketMoyen.toFixed(2)} €`, false],
          ['RÈGLEMENTS À VENIR', `${calculs.totalReglementsAVenir.toFixed(2)} €`, true],
        ].map(([title, value, isInteractive], i) => (
          <div 
            key={i} 
            style={{ 
              textAlign: 'center', 
              padding: 8, 
              border: isInteractive ? '2px solid #477A0C' : '1.5px solid #000', 
              background: isInteractive ? '#f0f9ff' : '#f8f8f8',
              cursor: isInteractive ? 'pointer' : 'default'
            }}
            onClick={isInteractive ? onReglementsClick : undefined}
          >
            <h3 style={{ margin: '0 0 3px', fontSize: '10pt', color: isInteractive ? '#477A0C' : 'inherit' }}>{title}</h3>
            <p style={{ margin: 0, fontSize: '14pt', fontWeight: 700, color: isInteractive ? '#477A0C' : 'inherit' }}>{value}</p>
            {i === 3 && <div style={{ marginTop: 2, fontSize: '8pt', color: isInteractive ? '#477A0C' : 'inherit' }}>{calculs.nbChequesTotal} chèques</div>}
          </div>
        ))}
      </div>

      {/* Vendeuses */}
      <div className="print-section" style={{ marginBottom: 8 }}>
        <div style={{ fontSize: '11pt', fontWeight: 700, borderBottom: '1.5px solid #000', paddingBottom: 2, marginBottom: 4 }}>
          CHIFFRE D'AFFAIRES PAR VENDEUSE ET MODE DE PAIEMENT
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse', border: '1.5px solid #000', fontSize: '10pt' }}>
          <thead>
            <tr style={{ background: '#f0f0f0' }}>
              <th style={{ border: '1px solid #000', padding: '12px 6px', textAlign: 'left' }}>VENDEUSE</th>
              <th style={{ border: '1px solid #000', padding: '12px 6px', textAlign: 'center' }}>NB</th>
              <th style={{ border: '1px solid #000', padding: '12px 6px', textAlign: 'right' }}>CARTE (€)</th>
              <th style={{ border: '1px solid #000', padding: '12px 6px', textAlign: 'right' }}>ESPÈCES (€)</th>
              <th style={{ border: '1px solid #000', padding: '12px 6px', textAlign: 'right' }}>CHÈQUE (€)</th>
              <th style={{ border: '1px solid #000', padding: '12px 6px', textAlign: 'right' }}>MIXTE (€)</th>
              <th style={{ border: '1px solid #000', padding: '12px 6px', textAlign: 'right' }}>TOTAL (€)</th>
            </tr>
          </thead>
          <tbody>
            {calculs.vendeusesAvecDetail
              .filter(v => v.totalCalcule > 0)
              .sort((a, b) => b.totalCalcule - a.totalCalcule)
              .map(v => (
                <tr key={v.id}>
                  <td style={{ border: '1px solid #000', padding: '12px 6px', fontWeight: 700 }}>{v.name}</td>
                  <td style={{ border: '1px solid #000', padding: '12px 6px', textAlign: 'center' }}>{v.nbVentesCalcule}</td>
                  <td style={{ border: '1px solid #000', padding: '12px 6px', textAlign: 'right', fontWeight: 700 }}>{v.detailPaiements.carte > 0 ? v.detailPaiements.carte.toFixed(2) : '-'}</td>
                  <td style={{ border: '1px solid #000', padding: '12px 6px', textAlign: 'right', fontWeight: 700 }}>{v.detailPaiements.especes > 0 ? v.detailPaiements.especes.toFixed(2) : '-'}</td>
                  <td style={{ border: '1px solid #000', padding: '12px 6px', textAlign: 'right', fontWeight: 700 }}>{v.detailPaiements.cheque > 0 ? v.detailPaiements.cheque.toFixed(2) : '-'}</td>
                  <td style={{ border: '1px solid #000', padding: '12px 6px', textAlign: 'right', fontWeight: 700 }}>{v.detailPaiements.mixte > 0 ? v.detailPaiements.mixte.toFixed(2) : '-'}</td>
                  <td style={{ border: '1px solid #000', padding: '12px 6px', textAlign: 'right', fontWeight: 700, background: '#f7f7f7' }}>{v.totalCalcule.toFixed(2)}</td>
                </tr>
              ))}
            <tr style={{ background: '#eee', fontWeight: 700 }}>
              <td style={{ borderWidth: '1.5px', borderStyle: 'solid', padding: '12px 6px' }}>TOTAL</td>
              <td style={{ borderWidth: '1.5px', borderStyle: 'solid', textAlign: 'center', padding: '12px 6px' }}>{calculs.nbVentesTotal}</td>
              <td style={{ borderWidth: '1.5px', borderStyle: 'solid', textAlign: 'right', padding: '12px 6px' }}>{calculs.parPaiement.carte.toFixed(2)}</td>
              <td style={{ borderWidth: '1.5px', borderStyle: 'solid', textAlign: 'right', padding: '12px 6px' }}>{calculs.parPaiement.especes.toFixed(2)}</td>
              <td style={{ borderWidth: '1.5px', borderStyle: 'solid', textAlign: 'right', padding: '12px 6px' }}>{calculs.parPaiement.cheque.toFixed(2)}</td>
              <td style={{ borderWidth: '1.5px', borderStyle: 'solid', textAlign: 'right', padding: '12px 6px' }}>{calculs.parPaiement.mixte.toFixed(2)}</td>
              <td style={{ borderWidth: '1.5px', borderStyle: 'solid', textAlign: 'right', padding: '12px 6px' }}>{calculs.caTotal.toFixed(2)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Règlements à venir */}
      {reglementsData.length > 0 && (
        <div className="print-section" style={{ marginBottom: 8 }}>
          <div style={{ fontSize: '11pt', fontWeight: 700, borderBottom: '1.5px solid #000', paddingBottom: 2, marginBottom: 4 }}>
            RÈGLEMENTS À VENIR (FACTURIER)
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 6, marginBottom: 6, textAlign: 'center' }}>
            <div style={{ padding: 6, background: '#f0f0f0', border: '1px solid #000', fontWeight: 700, fontSize: '9pt' }}>
              TOTAL ATTENDU<br/>
              <span style={{ fontSize: '12pt' }}>{calculs.totalReglementsAVenir.toFixed(2)} €</span>
            </div>
            <div style={{ padding: 6, background: '#f0f0f0', border: '1px solid #000', fontWeight: 700, fontSize: '9pt' }}>
              CLIENTS EN ATTENTE<br/>
              <span style={{ fontSize: '12pt' }}>{calculs.nbClientsAttente}</span>
            </div>
            <div style={{ padding: 6, background: '#f0f0f0', border: '1px solid #000', fontWeight: 700, fontSize: '9pt' }}>
              CHÈQUES TOTAUX<br/>
              <span style={{ fontSize: '12pt' }}>{calculs.nbChequesTotal}</span>
            </div>
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse', border: '1.5px solid #000', fontSize: '8pt' }}>
            <thead>
              <tr style={{ background: '#f0f0f0' }}>
                <th style={{ border: '1px solid #000', padding: '4px 6px', textAlign: 'left' }}>VENDEUSE</th>
                <th style={{ border: '1px solid #000', padding: '4px 6px', textAlign: 'left' }}>CLIENT</th>
                <th style={{ border: '1px solid #000', padding: '4px 6px', textAlign: 'center' }}>NB CHÈQUES</th>
                <th style={{ border: '1px solid #000', padding: '4px 6px', textAlign: 'right' }}>MONTANT/CHÈQUE</th>
                <th style={{ border: '1px solid #000', padding: '4px 6px', textAlign: 'right' }}>TOTAL CLIENT</th>
                <th style={{ border: '1px solid #000', padding: '4px 6px', textAlign: 'center' }}>PROCHAINE ÉCHÉANCE</th>
              </tr>
            </thead>
            <tbody>
              {reglementsData
                .sort((a: PendingPayment, b: PendingPayment) => a.vendorName.localeCompare(b.vendorName))
                .map((reglement: PendingPayment, index: number) => {
                  const totalClient = reglement.nbCheques * reglement.montantCheque;
                  return (
                    <tr key={index}>
                      <td style={{ border: '1px solid #000', padding: '4px 6px', fontWeight: 700 }}>{reglement.vendorName}</td>
                      <td style={{ border: '1px solid #000', padding: '4px 6px' }}>{reglement.clientName}</td>
                      <td style={{ border: '1px solid #000', padding: '4px 6px', textAlign: 'center', fontWeight: 700 }}>{reglement.nbCheques}</td>
                      <td style={{ border: '1px solid #000', padding: '4px 6px', textAlign: 'right', fontWeight: 700 }}>{reglement.montantCheque.toFixed(2)} €</td>
                      <td style={{ border: '1px solid #000', padding: '4px 6px', textAlign: 'right', fontWeight: 700, background: '#f7f7f7' }}>{totalClient.toFixed(2)} €</td>
                      <td style={{ border: '1px solid #000', padding: '4px 6px', textAlign: 'center', fontSize: '9pt' }}>{new Date(reglement.dateProchain).toLocaleDateString('fr-FR')}</td>
                    </tr>
                  );
                })}
              <tr style={{ background: '#eee', fontWeight: 700 }}>
                <td colSpan={4} style={{ borderWidth: '1.5px', borderStyle: 'solid', textAlign: 'right' }}>TOTAL RÈGLEMENTS À VENIR :</td>
                <td style={{ borderWidth: '1.5px', borderStyle: 'solid', textAlign: 'right' }}>{calculs.totalReglementsAVenir.toFixed(2)} €</td>
                <td style={{ borderWidth: '1.5px', borderStyle: 'solid', textAlign: 'center' }}>{calculs.nbChequesTotal} chèques</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {/* Factures manuelles */}
      {calculs.salesWithManualInvoices.length > 0 && (
        <div className="print-section" style={{ marginBottom: 8 }}>
          <div style={{ fontSize: '11pt', fontWeight: 700, borderBottom: '1.5px solid #477A0C', paddingBottom: 2, marginBottom: 4, color: '#477A0C' }}>
            FACTURES MANUELLES (SAISIE PANIER CLASSIQUE)
          </div>
          
          <div style={{ padding: 6, background: '#f0f9ff', border: '1.5px solid #477A0C', borderRadius: 4, marginBottom: 6, fontSize: '9pt', fontStyle: 'italic', color: '#477A0C' }}>
            Ventes de matelas saisies manuellement pendant une panne N8N
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse', border: '1.5px solid #477A0C', fontSize: '8pt' }}>
            <thead>
              <tr style={{ background: '#f0f9ff' }}>
                <th style={{ border: '1px solid #477A0C', padding: '4px 6px', textAlign: 'left', color: '#477A0C', fontWeight: 700 }}>VENDEUSE</th>
                <th style={{ border: '1px solid #477A0C', padding: '4px 6px', textAlign: 'left', color: '#477A0C', fontWeight: 700 }}>CLIENT</th>
                <th style={{ border: '1px solid #477A0C', padding: '4px 6px', textAlign: 'center', color: '#477A0C', fontWeight: 700 }}>N° FACTURE</th>
                <th style={{ border: '1px solid #477A0C', padding: '4px 6px', textAlign: 'right', color: '#477A0C', fontWeight: 700 }}>MONTANT</th>
                <th style={{ border: '1px solid #477A0C', padding: '4px 6px', textAlign: 'center', color: '#477A0C', fontWeight: 700 }}>PAIEMENT</th>
                <th style={{ border: '1px solid #477A0C', padding: '4px 6px', textAlign: 'center', color: '#477A0C', fontWeight: 700 }}>HEURE</th>
              </tr>
            </thead>
            <tbody>
              {calculs.salesWithManualInvoices
                .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                .map((sale) => (
                  <tr key={sale.id}>
                    <td style={{ border: '1px solid #477A0C', padding: '4px 6px', fontWeight: 700 }}>{sale.vendorName}</td>
                    <td style={{ border: '1px solid #477A0C', padding: '4px 6px', color: '#477A0C', fontWeight: 700 }}>{sale.manualInvoiceData?.clientName || 'N/A'}</td>
                    <td style={{ border: '1px solid #477A0C', padding: '4px 6px', textAlign: 'center', fontWeight: 700, background: '#f0f9ff', color: '#477A0C' }}>{sale.manualInvoiceData?.invoiceNumber || 'N/A'}</td>
                    <td style={{ border: '1px solid #477A0C', padding: '4px 6px', textAlign: 'right', fontWeight: 700 }}>{sale.totalAmount.toFixed(2)} €</td>
                    <td style={{ border: '1px solid #477A0C', padding: '4px 6px', textAlign: 'center', fontSize: '9pt' }}>
                      {sale.paymentMethod === 'card' ? 'CARTE' :
                       sale.paymentMethod === 'cash' ? 'ESPÈCES' :
                       sale.paymentMethod === 'check' ? 'CHÈQUE' : 'MIXTE'}
                    </td>
                    <td style={{ border: '1px solid #477A0C', padding: '4px 6px', textAlign: 'center', fontSize: '9pt' }}>
                      {new Date(sale.date).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                    </td>
                  </tr>
                ))}
              <tr style={{ background: '#e6f4ea', fontWeight: 700 }}>
                <td colSpan={3} style={{ borderWidth: '1.5px', borderStyle: 'solid', borderColor: '#477A0C', textAlign: 'right', color: '#477A0C' }}>
                  TOTAL FACTURES MANUELLES :
                </td>
                <td style={{ borderWidth: '1.5px', borderStyle: 'solid', borderColor: '#477A0C', textAlign: 'right', fontWeight: 700, color: '#477A0C' }}>
                  {calculs.salesWithManualInvoices.reduce((total, sale) => total + sale.totalAmount, 0).toFixed(2)} €
                </td>
                <td colSpan={2} style={{ borderWidth: '1.5px', borderStyle: 'solid', borderColor: '#477A0C', textAlign: 'center', fontSize: '9pt', color: '#477A0C' }}>
                  {calculs.salesWithManualInvoices.length} vente{calculs.salesWithManualInvoices.length > 1 ? 's' : ''}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {/* Tableau modes de paiement COMPACT */}
      <div className="print-section" style={{ marginBottom: 10 }}>
        <div style={{ fontSize: '12pt', fontWeight: 700, borderBottom: '1.5px solid #000', paddingBottom: 3, marginBottom: 6 }}>
          RÉPARTITION PAR MODE DE PAIEMENT
        </div>
        
        <table className="payments" style={{ width: '100%', borderCollapse: 'collapse', border: '1.5px solid #000' }}>
          <thead>
            <tr style={{ background: '#f0f0f0' }}>
              <th style={{ border: '1px solid #000', padding: '4px 5px', textAlign: 'left', fontSize: '10pt' }}>MODE DE PAIEMENT</th>
              <th style={{ border: '1px solid #000', padding: '4px 5px', textAlign: 'right', fontSize: '10pt' }}>MONTANT (€)</th>
              <th className="col-percent" style={{ border: '1px solid #000', padding: '4px 5px', textAlign: 'center', fontSize: '10pt', width: '16mm' }}>%</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={{ border: '1px solid #000', padding: '4px 5px', fontSize: '10pt', fontWeight: 700 }}>CARTE BANCAIRE</td>
              <td style={{ border: '1px solid #000', padding: '4px 5px', textAlign: 'right', fontSize: '10pt', fontWeight: 700 }}>{calculs.parPaiement.carte.toFixed(2)}</td>
              <td className="col-percent" style={{ border: '1px solid #000', padding: '4px 5px', textAlign: 'center', fontSize: '10pt' }}>{calculs.caTotal > 0 ? ((calculs.parPaiement.carte / calculs.caTotal) * 100).toFixed(1) : '0.0'}%</td>
            </tr>
            <tr>
              <td style={{ border: '1px solid #000', padding: '4px 5px', fontSize: '10pt', fontWeight: 700 }}>ESPÈCES</td>
              <td style={{ border: '1px solid #000', padding: '4px 5px', textAlign: 'right', fontSize: '10pt', fontWeight: 700 }}>{calculs.parPaiement.especes.toFixed(2)}</td>
              <td className="col-percent" style={{ border: '1px solid #000', padding: '4px 5px', textAlign: 'center', fontSize: '10pt' }}>{calculs.caTotal > 0 ? ((calculs.parPaiement.especes / calculs.caTotal) * 100).toFixed(1) : '0.0'}%</td>
            </tr>
            <tr>
              <td style={{ border: '1px solid #000', padding: '4px 5px', fontSize: '10pt', fontWeight: 700 }}>CHÈQUE</td>
              <td style={{ border: '1px solid #000', padding: '4px 5px', textAlign: 'right', fontSize: '10pt', fontWeight: 700 }}>{calculs.parPaiement.cheque.toFixed(2)}</td>
              <td className="col-percent" style={{ border: '1px solid #000', padding: '4px 5px', textAlign: 'center', fontSize: '10pt' }}>{calculs.caTotal > 0 ? ((calculs.parPaiement.cheque / calculs.caTotal) * 100).toFixed(1) : '0.0'}%</td>
            </tr>
            <tr>
              <td style={{ border: '1px solid #000', padding: '4px 5px', fontSize: '10pt', fontWeight: 700 }}>MIXTE</td>
              <td style={{ border: '1px solid #000', padding: '4px 5px', textAlign: 'right', fontSize: '10pt', fontWeight: 700 }}>{calculs.parPaiement.mixte.toFixed(2)}</td>
              <td className="col-percent" style={{ border: '1px solid #000', padding: '4px 5px', textAlign: 'center', fontSize: '10pt' }}>{calculs.caTotal > 0 ? ((calculs.parPaiement.mixte / calculs.caTotal) * 100).toFixed(1) : '0.0'}%</td>
            </tr>
            <tr style={{ background: '#eee', fontWeight: 700 }}>
              <td style={{ borderWidth: '1.5px', borderStyle: 'solid', padding: '4px 5px', fontSize: '10pt' }}>TOTAL GÉNÉRAL</td>
              <td style={{ borderWidth: '1.5px', borderStyle: 'solid', padding: '4px 5px', textAlign: 'right', fontSize: '10pt' }}>{calculs.caTotal.toFixed(2)}</td>
              <td className="col-percent" style={{ borderWidth: '1.5px', borderStyle: 'solid', padding: '4px 5px', textAlign: 'center', fontSize: '10pt' }}>100.0%</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* 🆕 SECTION IMPRIMABLE : DÉTAIL DES CHÈQUES (FUSION CLASSIQUE + FACTURIER) */}
      {checksPrintData.length > 0 && (
        <div className="print-section" style={{ marginBottom: 8 }}>
          <div style={{ fontSize: '12pt', fontWeight: 700, borderBottom: '1.5px solid #000', paddingBottom: 3, marginBottom: 6 }}>
            DÉTAIL DES CHÈQUES (CLASSIQUE + FACTURIER)
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse', border: '1.5px solid #000', fontSize: '9pt' }}>
            <thead>
              <tr style={{ background: '#f0f0f0' }}>
                <th style={{ border: '1px solid #000', padding: '4px 6px', textAlign: 'left', width: '12%' }}>N° FACTURE</th>
                <th style={{ border: '1px solid #000', padding: '4px 6px', textAlign: 'left', width: '25%' }}>NOM CLIENT</th>
                <th style={{ border: '1px solid #000', padding: '4px 6px', textAlign: 'left', width: '30%' }}>PRODUIT</th>
                <th style={{ border: '1px solid #000', padding: '4px 6px', textAlign: 'center', width: '10%' }}>NB CHÈQUES</th>
                <th style={{ border: '1px solid #000', padding: '4px 6px', textAlign: 'right', width: '11%' }}>MONTANT/CHÈQUE (€)</th>
                <th style={{ border: '1px solid #000', padding: '4px 6px', textAlign: 'right', width: '12%' }}>TOTAL FACTURE (€)</th>
              </tr>
            </thead>
            <tbody>
              {checksPrintData.map((r, i) => (
                <tr key={(r.id ?? r.invoiceNumber) + '_' + i}>
                  <td style={{ border: '1px solid #000', padding: '4px 6px', fontWeight: 700 }}>{r.invoiceNumber}</td>
                  <td style={{ border: '1px solid #000', padding: '4px 6px' }}>{r.clientName}</td>
                  <td style={{ border: '1px solid #000', padding: '4px 6px' }}>{r.product}</td>
                  <td style={{ border: '1px solid #000', padding: '4px 6px', textAlign:'center' }}>{r.nbCheques}</td>
                  <td style={{ border: '1px solid #000', padding: '4px 6px', textAlign:'right' }}>{r.perChequeAmount.toFixed(2)}</td>
                  <td style={{ border: '1px solid #000', padding: '4px 6px', textAlign:'right', fontWeight: 700, background:'#f7f7f7' }}>{r.invoiceTotal.toFixed(2)}</td>
                </tr>
              ))}
              <tr style={{ background:'#eee', fontWeight:700 }}>
                <td colSpan={5} style={{ border:'1.5px solid #000', textAlign:'right', padding:'6px' }}>TOTAL</td>
                <td style={{ border:'1.5px solid #000', textAlign:'right', padding:'6px' }}>
                  {checksPrintData.reduce((s,r)=> s + r.invoiceTotal, 0).toFixed(2)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {/* Pied de page */}
      <div className="print-section" style={{ marginTop: 12, paddingTop: 8, borderTop: '1.5px solid #000' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
          <div>
            <p style={{ margin: '0 0 10px', fontWeight: 700 }}>RESPONSABLE DE CAISSE :</p>
            <div style={{ borderBottom: '1.5px solid #000', height: 24, marginBottom: 6 }}></div>
            <p style={{ margin: 0, fontSize: '9pt' }}>Signature et date</p>
          </div>
          
          <div>
            <p style={{ margin: '0 0 6px', fontWeight: 700 }}>CLÔTURE :</p>
            <p style={{ margin: 0, fontSize: '11pt', fontWeight: 700 }}>
              {new Date().toLocaleString('fr-FR', {
                day: '2-digit',
                month: '2-digit', 
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default FeuilleDeRAZPro;
