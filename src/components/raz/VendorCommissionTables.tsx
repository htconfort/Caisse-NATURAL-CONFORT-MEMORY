import { getDB } from '@/db/index';
import type { SupabaseInvoice } from '@/services/supabaseInvoicesService';
import type { Sale, Vendor } from '@/types';
import React, { useCallback, useEffect, useMemo, useState, useTransition } from 'react';

interface VendorCommissionTablesProps {
  vendors: Vendor[];
  sales: Sale[];
  supabaseInvoices: SupabaseInvoice[];
  sessionStart?: number;
  sessionEnd?: number;
  sessionName?: string;
  sessionId?: string; // 🆕 ID de la session pour charger les tableaux archivés
}

interface DailyStats {
  date: string;
  dateTimestamp: number;
  cheque: number;
  cb: number;
  espece: number;
  total: number;
  isAboveThreshold: boolean;
  salary: number;
}

interface VendorCommission {
  vendorId: string;
  vendorName: string;
  dailyStats: DailyStats[];
  totalCheque: number;
  totalCB: number;
  totalEspece: number;
  grandTotal: number;
  totalSalary: number;
  housingFee: number;
  transportFee: number;
  netAmount: number;
  commissionRate: number;
}

export const VendorCommissionTables: React.FC<VendorCommissionTablesProps> = ({
  vendors,
  sales,
  supabaseInvoices,
  sessionStart,
  sessionEnd,
  sessionName,
  sessionId
}) => {
  // 🔑 Clé de stockage unique par session
  const storageKey = useMemo(() => {
    const sessionId = sessionStart || Date.now();
    return `commissionData_${sessionId}`;
  }, [sessionStart]);
  
  // 🆕 État pour les tableaux archivés chargés depuis IndexedDB
  const [archivedTables, setArchivedTables] = useState<any[] | null>(null);
  const [loadingArchives, setLoadingArchives] = useState(true);
  
  // 🆕 CHARGER LES TABLEAUX ARCHIVÉS DEPUIS IndexedDB
  useEffect(() => {
    const loadArchivedTables = async () => {
      if (!sessionId) {
        setLoadingArchives(false);
        return;
      }
      
      try {
        const db = await getDB();
        const archives = await db.table('vendorCommissionArchives')
          .where('sessionId').equals(sessionId)
          .filter(archive => archive.type === 'opening')
          .toArray();
        
        if (archives.length > 0) {
          // Prendre le plus récent
          const latestArchive = archives.sort((a, b) => (b.archivedAt || 0) - (a.archivedAt || 0))[0];
          
          if (latestArchive.tables) {
            try {
              const tables = typeof latestArchive.tables === 'string' 
                ? JSON.parse(latestArchive.tables)
                : latestArchive.tables;
              
              setArchivedTables(tables);
              console.log(`✅ Tableaux archivés chargés depuis IndexedDB: ${tables.length} tableaux pour session ${sessionId}`);
              
              // Initialiser les taux de commission et forfaits depuis les tableaux archivés
              const rates: Record<string, number> = {};
              const housing: Record<string, number> = {};
              
              tables.forEach((table: any) => {
                if (table.vendorId && table.commissionRate !== undefined) {
                  rates[table.vendorId] = table.commissionRate;
                }
                if (table.vendorId && table.forfaitLogement !== undefined) {
                  housing[table.vendorId] = table.forfaitLogement;
                }
              });
              
              if (Object.keys(rates).length > 0) {
                setCommissionRates(prev => ({ ...prev, ...rates }));
              }
              if (Object.keys(housing).length > 0) {
                setHousingFees(prev => ({ ...prev, ...housing }));
              }
            } catch (parseError) {
              console.error('❌ Erreur parsing tableaux archivés:', parseError);
              setArchivedTables(null);
            }
          } else {
            console.log('⚠️ Archive trouvée mais sans tableaux');
            setArchivedTables(null);
          }
        } else {
          console.log(`⚠️ Aucun tableau archivé trouvé pour session ${sessionId}`);
          setArchivedTables(null);
        }
      } catch (error) {
        console.error('❌ Erreur chargement tableaux archivés:', error);
        setArchivedTables(null);
      } finally {
        setLoadingArchives(false);
      }
    };
    
    loadArchivedTables();
  }, [sessionId]);

  // État pour les frais de transport par vendeuse
  const [transportFees, setTransportFees] = useState<Record<string, number>>({});
  
  // 🆕 État pour les taux de commission modifiables par vendeuse
  const [commissionRates, setCommissionRates] = useState<Record<string, number>>({});
  
  // 🆕 État pour les forfaits logement modifiables par vendeuse
  const [housingFees, setHousingFees] = useState<Record<string, number>>({});
  
  // 🆕 État pour les ajustements manuels de CA (vendorId-dateIndex -> montant ajusté)
  const [manualAdjustments, setManualAdjustments] = useState<Record<string, number>>({});
  
  // 🆕 État pour les ajustements manuels par mode de paiement (vendorId-dateIndex-type -> montant)
  const [paymentAdjustments, setPaymentAdjustments] = useState<Record<string, number>>({});
  
  // 🆕 État pour les ajustements manuels de SALAIRE (vendorId-dateIndex -> montant salaire)
  const [salaryAdjustments, setSalaryAdjustments] = useState<Record<string, number>>({});
  
  // 🆕 État local temporaire pour édition (éviter lag)
  const [editingValues, setEditingValues] = useState<Record<string, string>>({});
  
  // ⚡ Transition pour mises à jour non-bloquantes
  const [isPending, startTransition] = useTransition();

  // 💾 PERSISTANCE: Charger les données sauvegardées au montage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const data = JSON.parse(saved);
        if (data.manualAdjustments) setManualAdjustments(data.manualAdjustments);
        if (data.paymentAdjustments) setPaymentAdjustments(data.paymentAdjustments);
        if (data.transportFees) setTransportFees(data.transportFees);
        if (data.commissionRates) setCommissionRates(data.commissionRates);
        if (data.housingFees) setHousingFees(data.housingFees);
        if (data.salaryAdjustments) setSalaryAdjustments(data.salaryAdjustments);
        console.log('✅ Ajustements manuels restaurés:', data);
      }
    } catch (error) {
      console.error('❌ Erreur chargement ajustements:', error);
    }
  }, [storageKey]);

  // 💾 PERSISTANCE: Sauvegarder à chaque modification
  useEffect(() => {
    try {
      const dataToSave = {
        manualAdjustments,
        paymentAdjustments,
        transportFees,
        commissionRates,
        housingFees,
        salaryAdjustments
      };
      localStorage.setItem(storageKey, JSON.stringify(dataToSave));
      console.log('💾 Ajustements sauvegardés:', dataToSave);
    } catch (error) {
      console.error('❌ Erreur sauvegarde ajustements:', error);
    }
  }, [manualAdjustments, paymentAdjustments, transportFees, commissionRates, housingFees, salaryAdjustments, storageKey]);

  // Fonction pour obtenir les dates de la session
  const sessionDates = useMemo(() => {
    // Si pas de dates, utiliser aujourd'hui uniquement
    if (!sessionStart) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return [{
        date: today.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }),
        timestamp: today.getTime()
      }];
    }
    
    const dates: { date: string; timestamp: number }[] = [];
    const start = new Date(sessionStart);
    const end = sessionEnd ? new Date(sessionEnd) : new Date(); // Si pas de fin, jusqu'à aujourd'hui
    
    // Réinitialiser à minuit
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);
    
    let current = new Date(start);
    while (current <= end) {
      dates.push({
        date: current.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }),
        timestamp: current.getTime()
      });
      current.setDate(current.getDate() + 1);
    }
    
    return dates;
  }, [sessionStart, sessionEnd]);

  // Fonction pour mapper le nom de vendeuse Supabase → vendorId
  const getVendorIdByName = (name: string): string => {
    const normalized = name.toLowerCase().trim();
    
    if (normalized.includes('sylvie')) return '1';
    if (normalized.includes('babette') || normalized.includes('babeth') || normalized.includes('bavette')) return '2';
    if (normalized.includes('lucia')) return '3';
    if (normalized.includes('sabrina')) return '4';
    if (normalized.includes('johan')) return '5';
    if (normalized.includes('marie')) return '6';
    if (normalized.includes('billy') || normalized.includes('billie')) return '7';
    if (normalized.includes('karima')) return '8';
    
    return '1'; // Par défaut Sylvie
  };

  // Calcul des commissions par vendeuse
  const vendorCommissions = useMemo((): VendorCommission[] => {
    return vendors.map(vendor => {
      const dailyStats: DailyStats[] = sessionDates.map(({ date, timestamp }, dateIndex) => {
        const dayStart = timestamp;
        const dayEnd = timestamp + 86400000 - 1; // Fin de journée

        // Ventes locales (IndexedDB)
        const daySales = sales.filter(sale => {
          if (sale.canceled) return false;
          if (sale.vendorId !== vendor.id) return false;
          
          // 🔧 FIX: Convertir sale.date en timestamp pour comparaison
          const saleTimestamp = sale.date instanceof Date ? sale.date.getTime() : Number(sale.date);
          
          return saleTimestamp >= dayStart && saleTimestamp <= dayEnd;
        });

        // Factures Supabase (exclure les annulées)
        const dayInvoices = supabaseInvoices.filter(inv => {
          // 🔧 Exclure les factures annulées
          if (inv.status === 'canceled' || inv.canceled === true) return false;
          
          const invDate = new Date(inv.created_at).getTime();
          const vendorId = getVendorIdByName(inv.conseiller || '');
          return vendorId === vendor.id && invDate >= dayStart && invDate <= dayEnd;
        });

        // Calcul Chèque, CB, Espèce
        let cheque = 0;
        let cb = 0;
        let espece = 0;

        // Ventes locales
        daySales.forEach(sale => {
          const amount = sale.totalAmount || 0;
          if (sale.paymentMethod === 'check' || sale.checkDetails) {
            cheque += amount;
          } else if (sale.paymentMethod === 'cash') {
            espece += amount;
          } else {
            cb += amount; // card, transfer, multiple
          }
        });

        // Factures Supabase
        dayInvoices.forEach(inv => {
          const amount = inv.montant_ttc || 0;
          const paymentMethod = (inv.payment_method || '').toLowerCase();
          
          if (paymentMethod.includes('chèque') || paymentMethod.includes('cheque') || inv.montant_restant > 0) {
            cheque += amount;
          } else if (paymentMethod.includes('espèce') || paymentMethod.includes('espece')) {
            espece += amount;
          } else {
            cb += amount; // carte, virement, autres
          }
        });

        // 🔧 Vérifier s'il y a des ajustements manuels par mode de paiement
        const adjustmentKeyBase = `${vendor.id}-${dateIndex}`;
        const chequeAdjusted = paymentAdjustments[`${adjustmentKeyBase}-cheque`] !== undefined 
          ? paymentAdjustments[`${adjustmentKeyBase}-cheque`] 
          : cheque;
        const cbAdjusted = paymentAdjustments[`${adjustmentKeyBase}-cb`] !== undefined 
          ? paymentAdjustments[`${adjustmentKeyBase}-cb`] 
          : cb;
        const especeAdjusted = paymentAdjustments[`${adjustmentKeyBase}-espece`] !== undefined 
          ? paymentAdjustments[`${adjustmentKeyBase}-espece`] 
          : espece;
        
        // Le total est TOUJOURS la somme des modes de paiement (ajustés ou non)
        const total = chequeAdjusted + cbAdjusted + especeAdjusted;
        const isAboveThreshold = total >= 1500;
        
        // Calcul du salaire selon les règles
        // IMPORTANT: 140€ minimum MÊME si 0€ de ventes (logique de l'entreprise)
        // MAIS: si un ajustement manuel de salaire existe, l'utiliser
        const salaryKey = `${vendor.id}-${dateIndex}`;
        let salary = 0;
        
        if (salaryAdjustments[salaryKey] !== undefined) {
          // 🆕 SALAIRE MANUEL: utiliser l'ajustement directement
          salary = salaryAdjustments[salaryKey];
        } else {
          // Calcul automatique selon les règles
          if (!isAboveThreshold) {
            salary = 140; // Fixe en dessous de 1500€ (Y COMPRIS 0€)
          } else {
            // 🆕 Taux personnalisable (par défaut: 17% Sylvie, 20% autres)
            const defaultRate = vendor.name === 'Sylvie' ? 17 : 20;
            const customRate = commissionRates[vendor.id] || defaultRate;
            const rate = customRate / 100; // Convertir en décimal
            salary = total * rate;
          }
        }

        return {
          date,
          dateTimestamp: timestamp,
          cheque: chequeAdjusted,
          cb: cbAdjusted,
          espece: especeAdjusted,
          total,
          isAboveThreshold,
          salary: Math.round(salary * 100) / 100 // Arrondi à 2 décimales
        };
      });

      // Totaux (en tenant compte des ajustements manuels)
      const totalCheque = dailyStats.reduce((sum, day) => sum + day.cheque, 0);
      const totalCB = dailyStats.reduce((sum, day) => sum + day.cb, 0);
      const totalEspece = dailyStats.reduce((sum, day) => sum + day.espece, 0);
      
      // 🔧 FIX CRITIQUE: Recalculer grandTotal avec les ajustements manuels
      const grandTotal = dailyStats.reduce((sum, day, dayIndex) => {
        const adjustmentKey = `${vendor.id}-${dayIndex}`;
        const adjustedTotal = manualAdjustments[adjustmentKey] !== undefined 
          ? manualAdjustments[adjustmentKey] 
          : day.total;
        return sum + adjustedTotal;
      }, 0);
      
      // 🔧 FIX CRITIQUE: Recalculer totalSalary avec les totaux ajustés ET les ajustements de salaire
      const totalSalary = dailyStats.reduce((sum, day, dayIndex) => {
        const salaryKey = `${vendor.id}-${dayIndex}`;
        
        // Si un ajustement manuel de salaire existe, l'utiliser directement
        if (salaryAdjustments[salaryKey] !== undefined) {
          return sum + salaryAdjustments[salaryKey];
        }
        
        // Sinon, calculer automatiquement
        const adjustmentKey = `${vendor.id}-${dayIndex}`;
        const adjustedTotal = manualAdjustments[adjustmentKey] !== undefined 
          ? manualAdjustments[adjustmentKey] 
          : day.total;
        
        // Recalculer le salaire avec le total ajusté
        const isAboveThreshold = adjustedTotal >= 1500;
        let salary = 0;
        
        if (!isAboveThreshold) {
          salary = 140; // Minimum garanti
        } else {
          const defaultRate = vendor.name === 'Sylvie' ? 17 : 20;
          const customRate = commissionRates[vendor.id] || defaultRate;
          const rate = customRate / 100;
          salary = adjustedTotal * rate;
        }
        
        return sum + salary;
      }, 0);
      
      // 🆕 Frais modifiables
      const defaultHousingFee = vendor.name === 'Sylvie' ? 0 : 300;
      const housingFee = housingFees[vendor.id] !== undefined ? housingFees[vendor.id] : defaultHousingFee;
      const transportFee = transportFees[vendor.id] || 0;
      const netAmount = totalSalary + housingFee + transportFee;
      
      // 🆕 Taux de commission personnalisable
      const defaultRate = vendor.name === 'Sylvie' ? 17 : 20;
      const commissionRate = commissionRates[vendor.id] || defaultRate;

      return {
        vendorId: vendor.id,
        vendorName: vendor.name,
        dailyStats,
        totalCheque: Math.round(totalCheque),
        totalCB: Math.round(totalCB),
        totalEspece: Math.round(totalEspece),
        grandTotal: Math.round(grandTotal),
        totalSalary: Math.round(totalSalary * 100) / 100, // Garder 2 décimales pour salaires (centimes importants)
        housingFee,
        transportFee,
        netAmount: Math.round(netAmount * 100) / 100,
        commissionRate
      };
    }); // Afficher TOUTES les vendeuses, même sans ventes
  }, [vendors, sales, supabaseInvoices, sessionDates, transportFees, commissionRates, housingFees, manualAdjustments, salaryAdjustments, paymentAdjustments]);

  // Mise à jour des frais de transport
  const updateTransportFee = (vendorId: string, value: number) => {
    setTransportFees(prev => ({
      ...prev,
      [vendorId]: value
    }));
  };

  // 🆕 Mise à jour du taux de commission
  const updateCommissionRate = (vendorId: string, rate: number) => {
    setCommissionRates(prev => ({
      ...prev,
      [vendorId]: rate
    }));
  };

  // 🆕 Mise à jour du forfait logement
  const updateHousingFee = (vendorId: string, value: number) => {
    setHousingFees(prev => ({
      ...prev,
      [vendorId]: value
    }));
  };
  
  // 🆕 Mise à jour d'un ajustement manuel de CA (OBSOLÈTE - Gardé pour compatibilité)
  const updateManualAdjustment = (vendorId: string, dateIndex: number, value: number) => {
    const key = `${vendorId}-${dateIndex}`;
    setManualAdjustments(prev => ({
      ...prev,
      [key]: value
    }));
  };
  
  // 🆕 Mise à jour d'un ajustement manuel par mode de paiement (NON-BLOQUANT)
  const updatePaymentAdjustment = (vendorId: string, dateIndex: number, paymentType: 'cheque' | 'cb' | 'espece', value: number) => {
    const key = `${vendorId}-${dateIndex}-${paymentType}`;
    startTransition(() => {
      setPaymentAdjustments(prev => ({
        ...prev,
        [key]: value
      }));
    });
  };
  
  // 🆕 Mise à jour d'un ajustement manuel de SALAIRE
  const updateSalaryAdjustment = (vendorId: string, dateIndex: number, value: number) => {
    const key = `${vendorId}-${dateIndex}`;
    setSalaryAdjustments(prev => ({
      ...prev,
      [key]: value
    }));
    console.log(`💾 Ajustement salaire sauvegardé: ${vendorId}-${dateIndex} = ${value}€`);
  };
  
  // 🆕 Calculer le salaire d'un jour en tenant compte des ajustements
  const calculateDailySalary = (vendorId: string, vendorName: string, dayIndex: number, originalTotal: number): number => {
    const salaryKey = `${vendorId}-${dayIndex}`;
    
    // Si un ajustement manuel de salaire existe, l'utiliser directement
    if (salaryAdjustments[salaryKey] !== undefined) {
      return salaryAdjustments[salaryKey];
    }
    
    // Sinon, calculer automatiquement
    const adjustmentKey = `${vendorId}-${dayIndex}`;
    const adjustedTotal = manualAdjustments[adjustmentKey] !== undefined 
      ? manualAdjustments[adjustmentKey] 
      : originalTotal;
    
    const isAboveThreshold = adjustedTotal >= 1500;
    
    if (!isAboveThreshold) {
      return 140; // Minimum garanti
    } else {
      const defaultRate = vendorName === 'Sylvie' ? 17 : 20;
      const customRate = commissionRates[vendorId] || defaultRate;
      const rate = customRate / 100;
      return adjustedTotal * rate;
    }
  };
  
  // 🆕 Fonction pour sauvegarder les tableaux actuels avec tous les ajustements
  const saveCurrentTables = useCallback(async () => {
    if (!sessionId) {
      alert('❌ Aucune session active. Impossible de sauvegarder.');
      return;
    }
    
    try {
      const db = await getDB();
      
      // Construire les tableaux avec tous les ajustements actuels
      const tablesToSave = vendorCommissions.map(commission => ({
        vendorId: commission.vendorId,
        vendorName: commission.vendorName,
        commissionRate: commission.commissionRate,
        dailyRows: commission.dailyStats.map((day, index) => ({
          date: day.date,
          dateMs: day.dateTimestamp,
          cheque: day.cheque,
          cb: day.cb,
          espece: day.espece,
          total: day.total,
          isAboveThreshold: day.isAboveThreshold,
          salary: calculateDailySalary(commission.vendorId, commission.vendorName, index, day.total)
        })),
        grandTotal: commission.grandTotal,
        totalSalary: commission.totalSalary,
        forfaitLogement: commission.housingFee,
        fraisTransport: commission.transportFee,
        netAPayer: commission.netAmount
      }));
      
      // Sauvegarder dans IndexedDB comme archive de type 'opening' (mise à jour)
      const archives = await db.table('vendorCommissionArchives')
        .where('sessionId').equals(sessionId)
        .filter(archive => archive.type === 'opening')
        .toArray();
      
      if (archives.length > 0) {
        // Mettre à jour l'archive la plus récente
        const latestArchive = archives.sort((a, b) => (b.archivedAt || 0) - (a.archivedAt || 0))[0];
        await db.table('vendorCommissionArchives').update(latestArchive.id, {
          tables: JSON.stringify(tablesToSave),
          archivedAt: Date.now()
        });
        console.log(`✅ Tableaux mis à jour dans archive ${latestArchive.id}`);
      } else {
        // Créer une nouvelle archive
        const session = await db.getCurrentSession();
        if (!session) {
          throw new Error('Session introuvable');
        }
        
        const archiveEntry = {
          id: `commission-${sessionId}-${Date.now()}`,
          sessionId: sessionId,
          sessionName: session.eventName || sessionName || 'Session',
          sessionStart: sessionStart || session.eventStart || session.openedAt,
          sessionEnd: sessionEnd || session.eventEnd || Date.now(),
          archivedAt: Date.now(),
          tables: JSON.stringify(tablesToSave),
          type: 'opening' as const
        };
        
        await db.table('vendorCommissionArchives').add(archiveEntry);
        console.log(`✅ Nouvelle archive créée: ${archiveEntry.id}`);
      }
      
      // Sauvegarder aussi les ajustements dans localStorage (déjà fait automatiquement)
      
      alert(`✅ Tableaux sauvegardés avec succès !\n\n` +
            `📊 ${tablesToSave.length} tableaux sauvegardés\n` +
            `💾 Ajustements sauvegardés dans localStorage\n` +
            `📁 Archive mise à jour dans IndexedDB`);
    } catch (error) {
      console.error('❌ Erreur sauvegarde tableaux:', error);
      alert('❌ Erreur lors de la sauvegarde: ' + (error instanceof Error ? error.message : String(error)));
    }
  }, [sessionId, vendorCommissions, sessionName, sessionStart, sessionEnd]);
  
  // Exposer la fonction de sauvegarde globalement
  useEffect(() => {
    if (sessionId) {
      (window as any).saveCommissionTables = saveCurrentTables;
      console.log('💾 Fonction saveCommissionTables disponible globalement');
      
      // 🆕 Fonction pour appliquer les corrections demandées par l'utilisateur
      (window as any).applyCommissionCorrections = async () => {
        try {
          console.log('🔧 Application des corrections...');
          
          // 1. Sylvie - 1er novembre (index 0) : CB = 790€ (au lieu de 300€)
          const keyCB = '1-0-cb';
          setPaymentAdjustments(prev => ({ ...prev, [keyCB]: 790 }));
          console.log('✅ Sylvie 1er nov: CB corrigé à 790€');
          
          // 2. Babette - 3 novembre (index 2) : Chèques = 140€ (au lieu de 930€)
          const keyCheque = '2-2-cheque';
          setPaymentAdjustments(prev => ({ ...prev, [keyCheque]: 140 }));
          console.log('✅ Babette 3 nov: Chèques corrigé à 140€');
          
          // 3. Lucia - 4 novembre (index 3) : Salaire = 0€ (absence)
          const keySalary3 = '3-3';
          setSalaryAdjustments(prev => ({ ...prev, [keySalary3]: 0 }));
          console.log('✅ Lucia 4 nov: Salaire mis à 0€ (absence)');
          
          // 4. Lucia - 5 novembre (index 4) : Salaire = 0€ (absence)
          const keySalary4 = '3-4';
          setSalaryAdjustments(prev => ({ ...prev, [keySalary4]: 0 }));
          console.log('✅ Lucia 5 nov: Salaire mis à 0€ (absence)');
          
          // Attendre un peu pour que les états se mettent à jour
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          // Sauvegarder après les corrections
          console.log('💾 Sauvegarde des corrections...');
          await saveCurrentTables();
          
          alert('✅ Corrections appliquées et sauvegardées !\n\n' +
                '📝 Corrections appliquées:\n' +
                '• Sylvie 1er nov: CB = 790€\n' +
                '• Babette 3 nov: Chèques = 140€\n' +
                '• Lucia 4 nov: Salaire = 0€ (absence)\n' +
                '• Lucia 5 nov: Salaire = 0€ (absence)\n\n' +
                '💾 Tableaux sauvegardés dans IndexedDB');
        } catch (error) {
          console.error('❌ Erreur application corrections:', error);
          alert('❌ Erreur: ' + (error instanceof Error ? error.message : String(error)));
        }
      };
      
      console.log('🔧 Fonction applyCommissionCorrections disponible globalement');
    }
  }, [sessionId, saveCurrentTables, setPaymentAdjustments, setSalaryAdjustments]);
  
  if (vendorCommissions.length === 0) {
    return (
      <div style={{ padding: 20, textAlign: 'center', color: '#666' }}>
        <p>📊 Aucune vendeuse enregistrée</p>
        <p style={{ fontSize: '0.9em', marginTop: 8 }}>
          Allez dans l'onglet "Gestion" pour ajouter des vendeuses.
        </p>
      </div>
    );
  }

  return (
    <div style={{ padding: 20 }}>
      {/* 🆕 Bouton de sauvegarde */}
      <div style={{ marginBottom: '20px', textAlign: 'right' }}>
        <button
          onClick={saveCurrentTables}
          style={{
            padding: '12px 24px',
            fontSize: '1em',
            fontWeight: 'bold',
            backgroundColor: '#059669',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
            transition: 'all 0.3s ease'
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.backgroundColor = '#047857';
            e.currentTarget.style.transform = 'translateY(-2px)';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.backgroundColor = '#059669';
            e.currentTarget.style.transform = 'translateY(0)';
          }}
        >
          💾 Sauvegarder les tableaux
        </button>
      </div>
      {/* En-tête */}
      <div style={{ marginBottom: 30, textAlign: 'center' }}>
        <h2 style={{ margin: 0, fontSize: '1.8em', color: '#14532d' }}>
          📊 Tableaux de Commission par Vendeuse
        </h2>
        {sessionName && (
          <p style={{ margin: '8px 0 0 0', fontSize: '1.1em', color: '#666', fontWeight: 600 }}>
            {sessionName}
          </p>
        )}
        {sessionStart && (
          <p style={{ margin: '4px 0 0 0', fontSize: '0.95em', color: '#999' }}>
            {sessionEnd 
              ? `Du ${new Date(sessionStart).toLocaleDateString('fr-FR')} au ${new Date(sessionEnd).toLocaleDateString('fr-FR')}`
              : `Depuis le ${new Date(sessionStart).toLocaleDateString('fr-FR')}`
            }
          </p>
        )}
        {!sessionStart && (
          <p style={{ margin: '4px 0 0 0', fontSize: '0.95em', color: '#f59e0b' }}>
            ⚠️ Session sans dates d'événement - Affichage des ventes d'aujourd'hui uniquement
          </p>
        )}
      </div>

      {/* Tableaux par vendeuse */}
      {vendorCommissions.map((commission) => (
        <div 
          key={commission.vendorId} 
          style={{ 
            marginBottom: 40, 
            background: 'white', 
            borderRadius: 12, 
            boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
            overflow: 'hidden'
          }}
        >
          {/* En-tête du tableau */}
          <div style={{ 
            background: '#477A0C', // Vert MyConfort (identique au header de l'app)
            color: 'white',
            padding: '15px 20px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.4em' }}>{commission.vendorName}</h3>
              <div style={{ margin: '4px 0 0 0', fontSize: '0.85em', opacity: 0.9, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>Commission :</span>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={commission.commissionRate}
                  onChange={(e) => {
                    const value = parseFloat(e.target.value) || 0;
                    if (value >= 0 && value <= 100) {
                      updateCommissionRate(commission.vendorId, value);
                    }
                  }}
                  style={{
                    width: '70px',
                    padding: '6px 10px',
                    fontSize: '0.95em',
                    fontWeight: 'bold',
                    border: '2px solid white',
                    borderRadius: '6px',
                    backgroundColor: 'rgba(255, 255, 255, 0.95)',
                    color: '#477A0C',
                    textAlign: 'center',
                    outline: 'none'
                  }}
                /> <span style={{ fontWeight: 'bold' }}>%</span>
                {commission.vendorName === 'Sylvie' && <span style={{ marginLeft: '8px' }}>(Gérante)</span>}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.85em', opacity: 0.9 }}>Total ventes</div>
              <div style={{ fontSize: '1.6em', fontWeight: 'bold' }}>
                {Math.round(commission.grandTotal)} €
              </div>
            </div>
          </div>

          {/* Tableau des ventes quotidiennes */}
          <div style={{ overflowX: 'auto' }}>
            <table style={{ 
              width: '100%', 
              borderCollapse: 'collapse',
              fontSize: '0.95em'
            }}>
              <thead>
                <tr>
                  <th style={{ ...headerCellStyle, background: '#90EE90', color: '#000' }}>
                    {commission.vendorName}
                  </th>
                  <th style={{ ...headerCellStyle, background: '#FF6B6B', color: 'white' }}>Chèque</th>
                  <th style={{ ...headerCellStyle, background: '#4169E1', color: 'white' }}>CB</th>
                  <th style={{ ...headerCellStyle, background: '#FFD700', color: '#000' }}>Espèce</th>
                  <th style={{ ...headerCellStyle, background: '#9370DB', color: 'white' }}>Total</th>
                  <th style={{ ...headerCellStyle, background: '#FFA500', color: 'white' }}>
                    Pourcentage {commission.isAboveThreshold ? 'vrai' : 'faux'} = {commission.commissionRate}%
                  </th>
                  <th style={{ ...headerCellStyle, background: '#90EE90', color: '#000' }}>Salaire</th>
                </tr>
              </thead>
              <tbody>
                {commission.dailyStats.map((day, index) => (
                  <tr 
                    key={day.dateTimestamp}
                    style={{ 
                      borderBottom: '1px solid #e5e7eb',
                      background: index % 2 === 0 ? 'white' : '#f9fafb'
                    }}
                  >
                    <td style={{ ...cellStyle, background: index % 2 === 0 ? '#E8F5E9' : '#C8E6C9' }}>
                      <strong>{day.date}</strong>
                    </td>
                    {/* Chèque - Éditable */}
                    <td style={{ ...cellStyle, background: index % 2 === 0 ? '#FFEBEE' : '#FFCDD2' }}>
                      <input
                        type="text"
                        value={(() => {
                          const key = `${commission.vendorId}-${index}-cheque`;
                          return editingValues[key] !== undefined ? editingValues[key] : Math.round(day.cheque).toString();
                        })()}
                        onChange={(e) => {
                          const key = `${commission.vendorId}-${index}-cheque`;
                          setEditingValues(prev => ({ ...prev, [key]: e.target.value }));
                        }}
                        onBlur={(e) => {
                          const key = `${commission.vendorId}-${index}-cheque`;
                          const val = parseFloat(e.target.value);
                          if (!isNaN(val)) {
                            updatePaymentAdjustment(commission.vendorId, index, 'cheque', val);
                          } else if (e.target.value === '') {
                            updatePaymentAdjustment(commission.vendorId, index, 'cheque', 0);
                          }
                          setEditingValues(prev => {
                            const newVals = { ...prev };
                            delete newVals[key];
                            return newVals;
                          });
                        }}
                        style={{
                          width: '100%',
                          padding: '8px',
                          fontSize: '1.1em',
                          border: paymentAdjustments[`${commission.vendorId}-${index}-cheque`] !== undefined ? '3px solid #f59e0b' : '2px solid #EF5350',
                          borderRadius: '6px',
                          textAlign: 'right',
                          fontWeight: 'bold',
                          background: paymentAdjustments[`${commission.vendorId}-${index}-cheque`] !== undefined ? '#fef3c7' : 'white',
                          outline: 'none'
                        }}
                      />
                    </td>
                    
                    {/* CB - Éditable */}
                    <td style={{ ...cellStyle, background: index % 2 === 0 ? '#E3F2FD' : '#BBDEFB' }}>
                      <input
                        type="text"
                        value={(() => {
                          const key = `${commission.vendorId}-${index}-cb`;
                          return editingValues[key] !== undefined ? editingValues[key] : Math.round(day.cb).toString();
                        })()}
                        onChange={(e) => {
                          const key = `${commission.vendorId}-${index}-cb`;
                          setEditingValues(prev => ({ ...prev, [key]: e.target.value }));
                        }}
                        onBlur={(e) => {
                          const key = `${commission.vendorId}-${index}-cb`;
                          const val = parseFloat(e.target.value);
                          if (!isNaN(val)) {
                            updatePaymentAdjustment(commission.vendorId, index, 'cb', val);
                          } else if (e.target.value === '') {
                            updatePaymentAdjustment(commission.vendorId, index, 'cb', 0);
                          }
                          setEditingValues(prev => {
                            const newVals = { ...prev };
                            delete newVals[key];
                            return newVals;
                          });
                        }}
                        style={{
                          width: '100%',
                          padding: '8px',
                          fontSize: '1.1em',
                          border: paymentAdjustments[`${commission.vendorId}-${index}-cb`] !== undefined ? '3px solid #f59e0b' : '2px solid #2196F3',
                          borderRadius: '6px',
                          textAlign: 'right',
                          fontWeight: 'bold',
                          background: paymentAdjustments[`${commission.vendorId}-${index}-cb`] !== undefined ? '#fef3c7' : 'white',
                          outline: 'none'
                        }}
                      />
                    </td>
                    
                    {/* Espèces - Éditable */}
                    <td style={{ ...cellStyle, background: index % 2 === 0 ? '#FFF9C4' : '#FFF59D' }}>
                      <input
                        type="text"
                        value={(() => {
                          const key = `${commission.vendorId}-${index}-espece`;
                          return editingValues[key] !== undefined ? editingValues[key] : Math.round(day.espece).toString();
                        })()}
                        onChange={(e) => {
                          const key = `${commission.vendorId}-${index}-espece`;
                          setEditingValues(prev => ({ ...prev, [key]: e.target.value }));
                        }}
                        onBlur={(e) => {
                          const key = `${commission.vendorId}-${index}-espece`;
                          const val = parseFloat(e.target.value);
                          if (!isNaN(val)) {
                            updatePaymentAdjustment(commission.vendorId, index, 'espece', val);
                          } else if (e.target.value === '') {
                            updatePaymentAdjustment(commission.vendorId, index, 'espece', 0);
                          }
                          setEditingValues(prev => {
                            const newVals = { ...prev };
                            delete newVals[key];
                            return newVals;
                          });
                        }}
                        style={{
                          width: '100%',
                          padding: '8px',
                          fontSize: '1.1em',
                          border: paymentAdjustments[`${commission.vendorId}-${index}-espece`] !== undefined ? '3px solid #f59e0b' : '2px solid #FDD835',
                          borderRadius: '6px',
                          textAlign: 'right',
                          fontWeight: 'bold',
                          background: paymentAdjustments[`${commission.vendorId}-${index}-espece`] !== undefined ? '#fef3c7' : 'white',
                          outline: 'none'
                        }}
                      />
                    </td>
                    {/* Total CA - Calculé automatiquement (NON éditable) */}
                    <td style={{ ...cellStyle, fontWeight: 'bold', background: index % 2 === 0 ? '#F3E5F5' : '#E1BEE7', textAlign: 'center' }}>
                      <strong style={{ fontSize: '1.2em' }}>{Math.round(day.total)} €</strong>
                    </td>
                    <td style={{ ...cellStyle, textAlign: 'center', background: index % 2 === 0 ? '#FFE0B2' : '#FFCC80' }}>
                      <span style={{
                        fontWeight: 'bold'
                      }}>
                        {(() => {
                          const adjustmentKey = `${commission.vendorId}-${index}`;
                          const adjustedTotal = manualAdjustments[adjustmentKey] !== undefined 
                            ? manualAdjustments[adjustmentKey] 
                            : day.total;
                          return adjustedTotal >= 1500 ? 'VRAI' : 'FAUX';
                        })()}
                      </span>
                    </td>
                    <td style={{ ...cellStyle, fontWeight: 'bold', background: index % 2 === 0 ? '#E8F5E9' : '#C8E6C9' }}>
                      <input
                        type="text"
                        value={(() => {
                          const key = `${commission.vendorId}-${index}-salary`;
                          const calculatedSalary = calculateDailySalary(commission.vendorId, commission.vendorName, index, day.total);
                          return editingValues[key] !== undefined ? editingValues[key] : calculatedSalary.toFixed(2);
                        })()}
                        onChange={(e) => {
                          const key = `${commission.vendorId}-${index}-salary`;
                          setEditingValues(prev => ({ ...prev, [key]: e.target.value }));
                        }}
                        onBlur={(e) => {
                          const key = `${commission.vendorId}-${index}-salary`;
                          const val = parseFloat(e.target.value);
                          if (!isNaN(val) && val >= 0) {
                            updateSalaryAdjustment(commission.vendorId, index, val);
                          } else if (e.target.value === '' || e.target.value === '0') {
                            // Permettre de mettre 0€ pour annuler une journée
                            updateSalaryAdjustment(commission.vendorId, index, 0);
                          }
                          setEditingValues(prev => {
                            const newVals = { ...prev };
                            delete newVals[key];
                            return newVals;
                          });
                        }}
                        style={{
                          width: '100%',
                          padding: '8px',
                          fontSize: '1.1em',
                          border: salaryAdjustments[`${commission.vendorId}-${index}`] !== undefined 
                            ? '3px solid #f59e0b' 
                            : '2px solid #90EE90',
                          borderRadius: '6px',
                          textAlign: 'right',
                          fontWeight: 'bold',
                          background: salaryAdjustments[`${commission.vendorId}-${index}`] !== undefined 
                            ? '#fef3c7' 
                            : (index % 2 === 0 ? '#E8F5E9' : '#C8E6C9'),
                          outline: 'none'
                        }}
                        title={salaryAdjustments[`${commission.vendorId}-${index}`] !== undefined 
                          ? 'Salaire modifié manuellement (cliquez pour réinitialiser)' 
                          : 'Salaire calculé automatiquement (cliquez pour modifier)'}
                        onDoubleClick={(e) => {
                          // Double-clic pour réinitialiser au calcul automatique
                          const key = `${commission.vendorId}-${index}`;
                          setSalaryAdjustments(prev => {
                            const newVals = { ...prev };
                            delete newVals[key];
                            return newVals;
                          });
                          e.currentTarget.blur();
                        }}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                {/* Ligne de totaux */}
                <tr>
                  <td style={{ ...cellStyle, fontWeight: 'bold', background: '#90EE90' }}>TOTAL</td>
                  <td style={{ ...cellStyle, fontWeight: 'bold', background: '#FF6B6B', color: 'white' }}>
                    {Math.round(commission.totalCheque)} €
                  </td>
                  <td style={{ ...cellStyle, fontWeight: 'bold', background: '#4169E1', color: 'white' }}>
                    {Math.round(commission.totalCB)} €
                  </td>
                  <td style={{ ...cellStyle, fontWeight: 'bold', background: '#FFD700', color: '#000' }}>
                    {Math.round(commission.totalEspece)} €
                  </td>
                  <td style={{ ...cellStyle, fontWeight: 'bold', background: '#9370DB', color: 'white', fontSize: '1.05em' }}>
                    {Math.round(commission.grandTotal)} €
                  </td>
                  <td style={{ ...cellStyle, background: '#FFA500' }}></td>
                  <td style={{ ...cellStyle, fontWeight: 'bold', background: '#90EE90', fontSize: '1.05em' }}>
                    {commission.totalSalary.toFixed(2)} €
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Section frais et net */}
          <div style={{ 
            padding: 20, 
            background: '#fafafa',
            borderTop: '2px solid #e5e7eb'
          }}>
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
              gap: 15 
            }}>
              {/* Total salaire */}
              <div>
                <div style={{ fontSize: '0.85em', color: '#666', marginBottom: 4 }}>
                  Total salaire
                </div>
                <div style={{ fontSize: '1.3em', fontWeight: 'bold', color: '#059669' }}>
                  {commission.totalSalary.toFixed(2)} €
                </div>
              </div>

              {/* Forfait logement (éditable) */}
              <div>
                <div style={{ fontSize: '0.85em', color: '#666', marginBottom: 4 }}>
                  Forfait logement
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: '1.1em', fontWeight: 'bold' }}>+</span>
                  <input 
                    type="number"
                    value={commission.housingFee}
                    onChange={(e) => updateHousingFee(commission.vendorId, parseFloat(e.target.value) || 0)}
                    style={{
                      width: 100,
                      padding: '8px 12px',
                      fontSize: '1.1em',
                      fontWeight: 'bold',
                      border: '2px solid #d1d5db',
                      borderRadius: 6,
                      textAlign: 'right',
                      color: commission.housingFee > 0 ? '#059669' : '#999'
                    }}
                    min="0"
                    step="10"
                  />
                  <span style={{ fontSize: '1.1em', fontWeight: 'bold' }}>€</span>
                </div>
              </div>

              {/* Frais transport (éditable) */}
              <div>
                <div style={{ fontSize: '0.85em', color: '#666', marginBottom: 4 }}>
                  Frais transport
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: '1.1em', fontWeight: 'bold' }}>+</span>
                  <input 
                    type="number"
                    value={commission.transportFee}
                    onChange={(e) => updateTransportFee(commission.vendorId, parseFloat(e.target.value) || 0)}
                    style={{
                      width: 100,
                      padding: '6px 10px',
                      border: '2px solid #d1d5db',
                      borderRadius: 6,
                      fontSize: '1em',
                      fontWeight: 'bold'
                    }}
                    step="0.01"
                    min="0"
                  />
                  <span style={{ fontSize: '1.1em', fontWeight: 'bold' }}>€</span>
                </div>
              </div>

              {/* Net à payer */}
              <div style={{ 
                background: 'white', 
                padding: 15, 
                borderRadius: 8,
                border: '2px solid #059669'
              }}>
                <div style={{ fontSize: '0.85em', color: '#666', marginBottom: 4 }}>
                  💰 Net à payer
                </div>
                <div style={{ fontSize: '1.5em', fontWeight: 'bold', color: '#059669' }}>
                  {commission.netAmount.toFixed(2)} €
                </div>
              </div>
            </div>
          </div>
        </div>
      ))}

      {/* Récapitulatif général */}
      <div style={{ 
        marginTop: 30, 
        padding: 20, 
        background: 'linear-gradient(135deg, #14532d 0%, #166534 100%)',
        color: 'white',
        borderRadius: 12,
        boxShadow: '0 4px 20px rgba(0,0,0,0.15)'
      }}>
        <h3 style={{ margin: '0 0 15px 0', fontSize: '1.3em' }}>📈 Récapitulatif Général</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 15 }}>
          <div>
            <div style={{ fontSize: '0.85em', opacity: 0.9 }}>Ventes totales</div>
            <div style={{ fontSize: '1.4em', fontWeight: 'bold', marginTop: 4 }}>
              {vendorCommissions.reduce((sum, vc) => sum + vc.grandTotal, 0).toFixed(2)} €
            </div>
          </div>
          <div>
            <div style={{ fontSize: '0.85em', opacity: 0.9 }}>Total salaires</div>
            <div style={{ fontSize: '1.4em', fontWeight: 'bold', marginTop: 4 }}>
              {vendorCommissions.reduce((sum, vc) => sum + vc.totalSalary, 0).toFixed(2)} €
            </div>
          </div>
          <div>
            <div style={{ fontSize: '0.85em', opacity: 0.9 }}>Total frais</div>
            <div style={{ fontSize: '1.4em', fontWeight: 'bold', marginTop: 4 }}>
              {vendorCommissions.reduce((sum, vc) => sum + vc.housingFee + vc.transportFee, 0).toFixed(2)} €
            </div>
          </div>
          <div>
            <div style={{ fontSize: '0.85em', opacity: 0.9 }}>Total net</div>
            <div style={{ fontSize: '1.4em', fontWeight: 'bold', marginTop: 4 }}>
              {vendorCommissions.reduce((sum, vc) => sum + vc.netAmount, 0).toFixed(2)} €
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Styles des cellules
const headerCellStyle: React.CSSProperties = {
  padding: '12px',
  textAlign: 'left',
  fontWeight: 'bold',
  fontSize: '0.9em',
  color: '#374151',
  borderBottom: '2px solid #d1d5db'
};

const cellStyle: React.CSSProperties = {
  padding: '10px 12px',
  textAlign: 'left'
};

