/**
 * Onglet Factures avec design compact et intégration factures externes
 * Remplace l'ancien InvoicesTabElegant avec une approche moderne
 * Version: 3.8.2 - MyConfort avec correspondances complètes
 */

import { Calendar, CheckCircle, CreditCard, Euro, FileText, Package, User } from 'lucide-react';
import React, { useMemo, useState } from 'react';
import { useExternalInvoices } from '../hooks/useExternalInvoices';
import { useSupabaseInvoices } from '../hooks/useSupabaseInvoices';
import { useNotifications } from '../hooks/useNotifications';
// import { useSyncInvoices } from '../hooks/useSyncInvoices'; // Temporairement désactivé
import { externalInvoiceService } from '../services/externalInvoiceService';
import { sendInvoiceEmail } from '../services/invoiceEmail';
import { listInvoices } from '../services/n8nClient';
import { testInsert } from '../services/supabaseTest';
import '../styles/invoices-compact.css';
import { PaymentMethod, Sale } from '../types';
import CompactInvoicesDisplay from './CompactInvoicesDisplay';
import ExternalInvoicesDisplay from './ExternalInvoicesDisplay';
import { NotificationCenter } from './NotificationCenter';
import SupabaseN8nMemo from './SupabaseN8nMemo';

interface UnifiedInvoice {
  id: string;
  number: string;
  client: { name: string; email?: string; phone?: string; };
  date: string;
  products: { count: number; firstProduct: string; };
  status: string;
  amount: number;
  type: 'internal' | 'external';
  paymentMethod: PaymentMethod;
  checkDetails?: {
    count: number;
    amount: number;
    totalAmount: number;
    notes?: string;
  };
  vendorName?: string;
  originalData: any;
}

type ViewType = 'compact' | 'external' | 'detailed';

interface InvoicesTabCompactProps {
  sales?: Sale[]; // Ventes internes optionnelles
}

const InvoicesTabCompact: React.FC<InvoicesTabCompactProps> = ({ sales = [] }) => {
  const [activeView, setActiveView] = useState<'compact' | 'external' | 'detailed'>('compact');
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const [showMemo, setShowMemo] = useState<boolean>(false);

  // Temporairement désactivé - À réactiver après migration
  const syncedInvoices: any[] = [];
  const syncLoading = false;
  const syncError: string | null = null;
  const syncInvoices = async () => {};

  const {
    invoices: externalInvoices,
    stats: externalStats,
    isLoading: externalLoading,
    error: externalError,
    syncWithAPI: syncExternal
  } = useExternalInvoices();

  // 🆕 Charger aussi les factures depuis Supabase
  const {
    invoices: supabaseInvoices,
    stats: supabaseStats,
    isLoading: supabaseLoading,
    error: supabaseError
  } = useSupabaseInvoices();

  const {
    notifications,
    removeNotification
  } = useNotifications();

  // Fonctions utilitaires pour les modes de paiement
  const getPaymentMethodLabel = (method: PaymentMethod | string): string => {
    const methods: Record<string, string> = {
      'cash': 'Espèces',
      'card': 'Carte',
      'check': 'Chèque',
      'multi': 'Mixte',
      'Carte': 'Carte',
      'Chèque': 'Chèque',
      'Espèces': 'Espèces'
    };
    return methods[method] || method;
  };

  const getPaymentMethodColor = (method: PaymentMethod | string): string => {
    const colors: Record<string, string> = {
      'cash': '#4caf50',     // Vert pour espèces
      'card': '#2196f3',     // Bleu pour carte
      'check': '#ff9800',    // Orange pour chèque
      'multi': '#9c27b0',    // Violet pour mixte
      'Carte': '#2196f3',
      'Chèque': '#ff9800',
      'Espèces': '#4caf50'
    };
    return colors[method] || '#666';
  };

  // Convertir les ventes en format facture pour l'affichage unifié
  const salesAsInvoices: Sale[] = useMemo(() => {
    return sales.filter(sale => !sale.canceled);
  }, [sales]);

  // 🆕 Grouper les ventes par tablette/magasin
  const salesByStore = useMemo(() => {
    const grouped: Record<string, Sale[]> = {};
    
    salesAsInvoices.forEach(sale => {
      const storeId = sale.originalStoreId || 'local';
      if (!grouped[storeId]) {
        grouped[storeId] = [];
      }
      grouped[storeId].push(sale);
    });
    
    return grouped;
  }, [salesAsInvoices]);

  // 🆕 Obtenir le nom du magasin pour l'affichage
  const getStoreName = (storeId: string): string => {
    if (storeId === 'local') return '📱 Cette tablette';
    // Extraire un nom plus lisible de l'ID
    const match = storeId.match(/store-(\d+)/);
    if (match) {
      const timestamp = parseInt(match[1]);
      const date = new Date(timestamp);
      return `📱 Tablette ${date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })}`;
    }
    return `📱 Tablette ${storeId.slice(-8)}`;
  };

  // Statistiques globales
  const globalStats = useMemo(() => {
    const totalInternal = syncedInvoices.length + salesAsInvoices.length;
    const totalExternal = externalInvoices.length + supabaseInvoices.length; // 🆕 Ajouter Supabase
    const totalInvoices = totalInternal + totalExternal;
    
    const totalAmountInternal = syncedInvoices.reduce((sum, inv) => sum + (inv.totalTTC || 0), 0) +
                               salesAsInvoices.reduce((sum, sale) => sum + sale.totalAmount, 0);
    const totalAmountExternal = externalStats.totalAmount + supabaseStats.totalAmount; // 🆕 Ajouter Supabase CA
    const totalAmount = totalAmountInternal + totalAmountExternal;

    console.log('📊 InvoicesTabCompact - globalStats:', {
      totalInternal,
      totalExternal,
      supabaseCount: supabaseInvoices.length,
      supabaseAmount: supabaseStats.totalAmount,
      totalInvoices,
      totalAmount
    });

    return {
      totalInvoices,
      totalInternal,
      totalExternal,
      totalAmount,
      totalAmountInternal,
      totalAmountExternal,
      todayExternal: externalStats.today + supabaseStats.today, // 🆕 Ajouter Supabase du jour
      todayAmountExternal: externalStats.todayAmount + supabaseStats.todayAmount
    };
  }, [syncedInvoices, salesAsInvoices, externalInvoices, externalStats, supabaseInvoices, supabaseStats]);

  const handleInvoiceClick = (invoice: any) => {
    setSelectedInvoice(invoice);
    setActiveView('detailed');
  };

  const handleSyncAll = async () => {
    console.log('🔄 Synchronisation globale des factures (proxy n8n + hooks)...');
    try {
      // 1) tenter via hooks existants
      await Promise.allSettled([
        syncInvoices(),
        syncExternal(true)
      ]);

      // 2) fallback explicite via proxy n8n pour garantir un retour utilisateur
      const res = await listInvoices(100);
      // Supporter plusieurs formats de réponses n8n
      const extractArray = (r: any): any[] => {
        if (!r) return [];
        if (Array.isArray(r)) return r;
        if (Array.isArray(r.invoices)) return r.invoices;
        if (Array.isArray(r.data)) return r.data;
        if (Array.isArray(r.items)) return r.items;
        if (Array.isArray(r.records)) return r.records;
        if (Array.isArray(r.result)) return r.result;
        // n8n peut aussi envelopper sous { success, count, data: [...] }
        if (typeof r === 'object') {
          for (const key of Object.keys(r)) {
            const v = (r as any)[key];
            if (Array.isArray(v)) return v;
          }
          // Si c'est un objet simple (une seule facture), l'encapsuler
          return [r];
        }
        return [];
      };
      const arr = extractArray(res);
      const count = arr.length;
      console.log('✅ Synchronisation terminée (détails):', res);

      // 2bis) Peupler immédiatement l'UI avec les factures détectées
      if (arr.length > 0) {
        // Utiliser la normalisation officielle du service pour éviter les écarts de format
        const normalize = (externalInvoiceService as any).normalizeAnyToInvoicePayload.bind(externalInvoiceService);
        const normalized = arr.map((raw: any) => normalize(raw));
        const result = externalInvoiceService.receiveInvoiceBatch(normalized as any);
        console.log('📦 Insertion locale factures:', result);
        // notifier le hook pour recharger
        window.dispatchEvent(new CustomEvent('external-invoices-updated')); 
      } else {
        console.log('ℹ️ Réponse n8n sans tableau exploitable, rien à insérer.', res);
      }

      alert(`✅ Synchronisation terminée — ${count} facture(s) détectée(s)`);

      // 3) Envoi email via n8n avec HTML pré-rendu (Alternative 1)
      try {
        const inv = externalInvoices?.[0];
        if (inv) {
          const invoiceData = {
            numero_facture: inv.invoiceNumber || inv.number || `INV-${Date.now()}`,
            date_facture: inv.invoiceDate || new Date().toISOString().slice(0, 10),
            client: {
              name: inv.client?.name || 'Client',
              email: inv.client?.email,
              phone: inv.client?.phone,
              address: inv.client?.address,
            },
            items: (inv.items || []).map((it: any) => ({
              name: it.name || it.productName || 'Produit',
              qty: Number(it.qty || it.quantity || 1),
              unitPriceHT: Number(it.unitPriceHT || it.unitPrice || 0),
            })),
            totals: { ttc: Number(inv.totals?.ttc || inv.totalTTC || 0) },
            payment: { method: inv.payment?.method },
          } as any;

          const ok = await sendInvoiceEmail(invoiceData);
          console.log('📧 Envoi email (HTML pré-rendu) via n8n:', ok ? 'OK' : 'ECHEC');
        } else {
          console.log('ℹ️ Pas de facture externe disponible pour email immédiat.');
        }
      } catch (mailErr) {
        console.warn('✉️ Envoi email HTML pré-rendu ignoré:', mailErr);
      }
    } catch (error: any) {
      console.error('❌ Erreur lors de la synchronisation:', error);
      alert(`❌ Erreur synchronisation: ${error?.message || 'inconnue'}`);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount);
  };

  const isLoading = syncLoading || externalLoading;
  const hasError = syncError || externalError;

  return (
    <div className="invoices-tab-compact">
      {/* En-tête avec statistiques */}
      <div style={{
        background: 'linear-gradient(135deg, #477A0C 0%, #14281D 100%)',
        color: 'white',
        padding: '1.5rem',
        borderRadius: '12px',
        marginBottom: '1rem'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '1rem',
          flexWrap: 'wrap',
          gap: '1rem'
        }}>
          <h2 style={{ margin: 0, fontSize: '1.5rem' }}>
            📊 Centre de Facturation MyConfort
          </h2>
          
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <button
              onClick={() => setShowMemo(true)}
              style={{
                background: '#14281D',
                color: 'white',
                border: 'none',
                padding: '0.5rem 1rem',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '0.9rem'
              }}
            >
              📘 Mémo Supabase · n8n
            </button>
            {/* Bouton de test pour ajouter des factures factices */}
            {import.meta.env.DEV && (
              <button
                onClick={() => {
                  // Ajouter des factures de test
                  const testInvoices = [
                    {
                      invoiceNumber: "TEST-001",
                      invoiceDate: new Date().toISOString(),
                      client: { name: "Client Test 1", email: "test1@email.com", phone: "06 12 34 56 78" },
                      items: [{ sku: "TEST", name: "Matelas Test", qty: 1, unitPriceHT: 1000, tvaRate: 0.20 }],
                      totals: { ht: 1000, tva: 200, ttc: 1200 },
                      payment: { method: "Carte", paid: true, paidAmount: 1200 },
                      channels: { source: "Test", via: "Manuel" },
                      idempotencyKey: "TEST-001"
                    },
                    {
                      invoiceNumber: "TEST-002",
                      invoiceDate: new Date().toISOString(),
                      client: { name: "Client Test 2", email: "test2@email.com", phone: "06 98 76 54 32" },
                      items: [{ sku: "TEST2", name: "Sommier Test", qty: 1, unitPriceHT: 800, tvaRate: 0.20 }],
                      totals: { ht: 800, tva: 160, ttc: 960 },
                      payment: { method: "Chèque", paid: false, paidAmount: 0 },
                      channels: { source: "Test", via: "Manuel" },
                      idempotencyKey: "TEST-002"
                    }
                  ];
                  
                  testInvoices.forEach(invoice => {
                    const w = window as any;
                    if (w.externalInvoiceService) {
                      w.externalInvoiceService.receiveInvoice(invoice);
                    }
                  });
                  
                  // Forcer le rechargement
                  window.location.reload();
                }}
                style={{
                  background: '#f59e0b',
                  color: 'white',
                  border: 'none',
                  padding: '0.5rem 1rem',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '0.9rem'
                }}
              >
                🧪 Ajouter Test Data
              </button>
            )}

            {/* Test insert Supabase */}
            <button
              onClick={async () => {
                const { data, error } = await testInsert();
                if (error) {
                  alert(`Data Error: ${error.message || JSON.stringify(error)}`);
                } else {
                  alert('Insert OK');
                }
              }}
              style={{
                background: '#10b981',
                color: 'white',
                border: 'none',
                padding: '0.5rem 1rem',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '0.9rem'
              }}
            >
              🧪 Test insert Supabase
            </button>
            
            <button
              onClick={handleSyncAll}
              disabled={isLoading}
              style={{
                background: 'rgba(255,255,255,0.2)',
                border: 'none',
                color: 'white',
                padding: '0.5rem 1rem',
                borderRadius: '8px',
                cursor: isLoading ? 'not-allowed' : 'pointer',
                fontSize: '0.9rem',
                marginRight: '0.5rem'
              }}
            >
              {isLoading ? '🔄 Sync...' : '🔄 Synchroniser tout'}
            </button>
            
            {/* Bouton de diagnostic */}
            <button
              onClick={() => {
                console.log('🔍 DIAGNOSTIC FACTURES EXTERNES:');
                console.log('Nombre de factures externes:', externalInvoices.length);
                console.log('Factures externes:', externalInvoices);
                if (externalInvoices.length > 0) {
                  console.log('Exemple de facture:', externalInvoices[0]);
                  console.log('Client:', externalInvoices[0].client);
                  console.log('Items:', externalInvoices[0].items);
                  console.log('Totaux:', externalInvoices[0].totals);
                }
                // Fallback réseau direct via proxy n8n
                void (async () => {
                  try {
                    const res = await listInvoices(10);
                    const count = Array.isArray(res) ? res.length : (res ? 1 : 0);
                    console.log('🔍 DIAGNOSTIC (proxy n8n):', res);
                    alert(`${count} facture(s) détectée(s) via n8n. Voir console pour détails.`);
                  } catch (e: any) {
                    console.error('❌ Diagnostic n8n échoué:', e);
                    alert(`❌ Diagnostic n8n échoué: ${e?.message || 'inconnu'}`);
                  }
                })();
              }}
              style={{
                background: '#17a2b8',
                border: 'none',
                color: 'white',
                padding: '0.5rem 1rem',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '0.9rem'
              }}
            >
              🔍 Diagnostic
            </button>

            {/* Bouton de diagnostic localStorage */}
            <button
              onClick={() => {
                if (typeof window !== 'undefined' && (window as any).externalInvoiceService) {
                  (window as any).externalInvoiceService.diagnoseStorage();
                  alert('🔍 Diagnostic localStorage lancé - voir la console pour détails');
                } else {
                  alert('❌ Service externalInvoiceService non disponible');
                }
              }}
              style={{
                background: '#6f42c1',
                color: 'white',
                border: 'none',
                padding: '0.6rem 1rem',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '0.9rem'
              }}
            >
              🔧 Réparer Storage
            </button>
          </div>
        </div>

        {/* Statistiques principales */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '1rem',
          marginBottom: '1rem'
        }}>
          <div style={{
            background: 'rgba(255,255,255,0.1)',
            padding: '1rem',
            borderRadius: '8px',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>
              {globalStats.totalInvoices}
            </div>
            <div style={{ fontSize: '0.9rem', opacity: 0.9 }}>
              Total Factures
            </div>
          </div>
          
          <div style={{
            background: 'rgba(255,255,255,0.1)',
            padding: '1rem',
            borderRadius: '8px',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>
              {formatCurrency(globalStats.totalAmount)}
            </div>
            <div style={{ fontSize: '0.9rem', opacity: 0.9 }}>
              Chiffre d'Affaires Total
            </div>
          </div>
          
          <div style={{
            background: 'rgba(255,255,255,0.1)',
            padding: '1rem',
            borderRadius: '8px',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '1.2rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>
              {globalStats.totalInternal} / {globalStats.totalExternal}
            </div>
            <div style={{ fontSize: '0.9rem', opacity: 0.9 }}>
              Internes / Externes
            </div>
          </div>
          
          <div style={{
            background: 'rgba(255,255,255,0.1)',
            padding: '1rem',
            borderRadius: '8px',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '1.2rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>
              {globalStats.todayExternal}
            </div>
            <div style={{ fontSize: '0.9rem', opacity: 0.9 }}>
              Externes Aujourd'hui
            </div>
          </div>
        </div>

        {/* Navigation des vues */}
        <div style={{
          display: 'flex',
          gap: '0.5rem',
          background: 'rgba(0,0,0,0.2)',
          padding: '0.25rem',
          borderRadius: '8px'
        }}>
          {[
            { id: 'compact', label: '📋 Vue Compacte', description: 'Toutes les factures' },
            { id: 'external', label: '🔗 Externes', description: `${globalStats.totalExternal} factures` },
            { id: 'detailed', label: '📄 Détails', description: selectedInvoice ? 'Facture sélectionnée' : 'Aucune sélection' }
          ].map(view => (
            <button
              key={view.id}
              onClick={() => setActiveView(view.id as any)}
              style={{
                flex: 1,
                background: activeView === view.id ? 'rgba(255,255,255,0.2)' : 'transparent',
                border: 'none',
                color: 'white',
                padding: '0.75rem',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '0.9rem',
                textAlign: 'center',
                transition: 'background-color 0.2s'
              }}
            >
              <div style={{ fontWeight: 'bold' }}>{view.label}</div>
              <div style={{ fontSize: '0.8rem', opacity: 0.8 }}>{view.description}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Section de correspondances : Mode de règlement, Client, N° Facture, Produit, Montant, Nb Chèques */}
      <div style={{
        background: 'white',
        borderRadius: '12px',
        padding: '1.5rem',
        marginBottom: '1rem',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
      }}>
        <h3 style={{
          margin: '0 0 1rem 0',
          fontSize: '1.2rem',
          color: '#477A0C',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem'
        }}>
          <FileText size={20} />
          Correspondances Factures & Règlements
        </h3>

        {/* Tableau de correspondances */}
        <div style={{
          overflowX: 'auto',
          marginBottom: '1rem'
        }}>
          <table style={{
            width: '100%',
            borderCollapse: 'collapse',
            fontSize: '0.9rem'
          }}>
            <thead>
              <tr style={{ backgroundColor: '#f8f9fa' }}>
                <th style={{ padding: '0.75rem', textAlign: 'left', borderBottom: '2px solid #dee2e6' }}>
                  <CreditCard size={16} style={{ display: 'inline', marginRight: '0.5rem' }} />
                  Mode de Règlement
                </th>
                <th style={{ padding: '0.75rem', textAlign: 'left', borderBottom: '2px solid #dee2e6' }}>
                  <User size={16} style={{ display: 'inline', marginRight: '0.5rem' }} />
                  Nom Client
                </th>
                <th style={{ padding: '0.75rem', textAlign: 'left', borderBottom: '2px solid #dee2e6' }}>
                  <FileText size={16} style={{ display: 'inline', marginRight: '0.5rem' }} />
                  N° Facture
                </th>
                <th style={{ padding: '0.75rem', textAlign: 'left', borderBottom: '2px solid #dee2e6' }}>
                  <Package size={16} style={{ display: 'inline', marginRight: '0.5rem' }} />
                  Produit(s)
                </th>
                <th style={{ padding: '0.75rem', textAlign: 'right', borderBottom: '2px solid #dee2e6' }}>
                  <Euro size={16} style={{ display: 'inline', marginRight: '0.5rem' }} />
                  Montant
                </th>
                <th style={{ padding: '0.75rem', textAlign: 'center', borderBottom: '2px solid #dee2e6' }}>
                  <CheckCircle size={16} style={{ display: 'inline', marginRight: '0.5rem' }} />
                  Nb Chèques
                </th>
                <th style={{ padding: '0.75rem', textAlign: 'left', borderBottom: '2px solid #dee2e6' }}>
                  <Calendar size={16} style={{ display: 'inline', marginRight: '0.5rem' }} />
                  Date
                </th>
              </tr>
            </thead>
            <tbody>
              {/* 🆕 Ventes groupées par tablette */}
              {Object.entries(salesByStore).map(([storeId, storeSales]) => (
                <React.Fragment key={`store-${storeId}`}>
                  {/* En-tête du groupe */}
                  <tr style={{ background: '#f8f9fa', borderTop: '2px solid #dee2e6' }}>
                    <td colSpan={7} style={{ padding: '0.75rem', fontWeight: 'bold' }}>
                      {getStoreName(storeId)}
                      {storeId !== 'local' && (
                        <span style={{
                          marginLeft: '0.5rem',
                          background: '#2196f3',
                          color: 'white',
                          padding: '0.15rem 0.5rem',
                          borderRadius: '4px',
                          fontSize: '0.7rem',
                          fontWeight: 'normal'
                        }}>
                          🔄 Synchronisé
                        </span>
                      )}
                      <span style={{ 
                        marginLeft: '0.5rem', 
                        color: '#666', 
                        fontSize: '0.85rem',
                        fontWeight: 'normal'
                      }}>
                        ({storeSales.length} vente{storeSales.length > 1 ? 's' : ''})
                      </span>
                    </td>
                  </tr>
                  
                  {/* Ventes du groupe */}
                  {storeSales.map(sale => (
                    <tr key={`sale-${sale.id}`} style={{ borderBottom: '1px solid #dee2e6' }}>
                      <td style={{ padding: '0.75rem' }}>
                        <span style={{
                          background: getPaymentMethodColor(sale.paymentMethod),
                          color: 'white',
                          padding: '0.25rem 0.5rem',
                          borderRadius: '4px',
                          fontSize: '0.8rem'
                        }}>
                          {getPaymentMethodLabel(sale.paymentMethod)}
                        </span>
                      </td>
                      <td style={{ padding: '0.75rem', fontWeight: '500' }}>
                        {sale.manualInvoiceData?.clientName || 'Client Standard'}
                        {sale.vendorName && (
                          <div style={{ fontSize: '0.7rem', color: '#666', marginTop: '0.2rem' }}>
                            👤 {sale.vendorName}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '0.75rem', fontFamily: 'monospace' }}>
                        {sale.manualInvoiceData?.invoiceNumber || `VENTE-${sale.id.slice(-6)}`}
                      </td>
                      <td style={{ padding: '0.75rem' }}>
                        {sale.items.length === 0
                          ? '-'
                          : sale.items.length === 1
                            ? (sale.items[0]?.name || 'Produit')
                            : `${sale.items[0]?.name || 'Produit'} +${sale.items.length - 1} autres`}
                      </td>
                      <td style={{ padding: '0.75rem', textAlign: 'right', fontWeight: 'bold' }}>
                        {formatCurrency(sale.totalAmount)}
                      </td>
                      <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                        {sale.checkDetails ? (
                          <span style={{
                            background: '#e3f2fd',
                            color: '#1976d2',
                            padding: '0.25rem 0.5rem',
                            borderRadius: '4px',
                            fontSize: '0.8rem'
                          }}>
                            {sale.checkDetails.count} chèque{sale.checkDetails.count > 1 ? 's' : ''}
                          </span>
                        ) : (
                          <span style={{ color: '#666', fontSize: '0.8rem' }}>-</span>
                        )}
                      </td>
                      <td style={{ padding: '0.75rem', fontSize: '0.8rem' }}>
                        {new Date(sale.date).toLocaleDateString('fr-FR')}
                      </td>
                    </tr>
                  ))}
                </React.Fragment>
              ))}
              
              {/* Correspondances depuis les factures externes */}
              {externalInvoices.map((invoice, idx) => (
                <tr key={`external-${(invoice.idempotencyKey || invoice.invoiceNumber || 'inv')}-${idx}`} style={{ borderBottom: '1px solid #dee2e6' }}>
                  <td style={{ padding: '0.75rem' }}>
                    <span style={{
                      background: getPaymentMethodColor(invoice.payment?.method || 'card'),
                      color: 'white',
                      padding: '0.25rem 0.5rem',
                      borderRadius: '4px',
                      fontSize: '0.8rem'
                    }}>
                      {getPaymentMethodLabel(invoice.payment?.method || 'card')}
                    </span>
                  </td>
                  <td style={{ padding: '0.75rem', fontWeight: '500' }}>
                    {invoice.client?.name || 'Client Externe'}
                  </td>
                  <td style={{ padding: '0.75rem', fontFamily: 'monospace' }}>
                    {invoice.invoiceNumber}
                  </td>
                  <td style={{ padding: '0.75rem' }}>
                    {invoice.items?.length === 1 
                      ? invoice.items[0].name 
                      : `${invoice.items?.[0]?.name || 'Produit'} +${(invoice.items?.length || 1) - 1} autres`
                    }
                  </td>
                  <td style={{ padding: '0.75rem', textAlign: 'right', fontWeight: 'bold' }}>
                    {formatCurrency(invoice.totals?.ttc || 0)}
                  </td>
                  <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                    {invoice.payment?.method === 'check' && invoice.payment?.checkCount ? (
                      <span style={{
                        background: '#e3f2fd',
                        color: '#1976d2',
                        padding: '0.25rem 0.5rem',
                        borderRadius: '4px',
                        fontSize: '0.8rem'
                      }}>
                        {invoice.payment.checkCount} chèque{invoice.payment.checkCount > 1 ? 's' : ''}
                      </span>
                    ) : (
                      <span style={{ color: '#666', fontSize: '0.8rem' }}>-</span>
                    )}
                  </td>
                  <td style={{ padding: '0.75rem', fontSize: '0.8rem' }}>
                    {new Date(invoice.invoiceDate).toLocaleDateString('fr-FR')}
                  </td>
                </tr>
              ))}

              {/* 🆕 Correspondances depuis les factures Supabase */}
              {supabaseInvoices.map((invoice) => {
                const isCheck = invoice.payment_method?.toLowerCase().includes('chèque') || 
                               invoice.payment_method?.toLowerCase().includes('cheque');
                const checkCount = invoice.montant_restant > 0 ? 
                  (invoice.montant_restant > 500 ? Math.ceil(invoice.montant_restant / 300) : 1) : 0;
                
                return (
                  <tr key={`supabase-${invoice.id}`} style={{ borderBottom: '1px solid #dee2e6' }}>
                    <td style={{ padding: '0.75rem' }}>
                      <span style={{
                        background: getPaymentMethodColor(isCheck ? 'check' : 'card'),
                        color: 'white',
                        padding: '0.25rem 0.5rem',
                        borderRadius: '4px',
                        fontSize: '0.8rem'
                      }}>
                        {invoice.payment_method || 'Carte'}
                      </span>
                    </td>
                    <td style={{ padding: '0.75rem', fontWeight: '500' }}>
                      {invoice.nom_client}
                      <div style={{ fontSize: '0.7rem', color: '#666', marginTop: '0.2rem' }}>
                        👤 {invoice.conseiller || 'Non assigné'}
                      </div>
                    </td>
                    <td style={{ padding: '0.75rem', fontFamily: 'monospace' }}>
                      {invoice.numero_facture}
                    </td>
                    <td style={{ padding: '0.75rem' }}>
                      {invoice.produits?.length === 1 
                        ? invoice.produits[0].nom 
                        : `${invoice.produits?.[0]?.nom || 'Produit'} +${(invoice.produits?.length || 1) - 1} autres`
                      }
                    </td>
                    <td style={{ padding: '0.75rem', textAlign: 'right', fontWeight: 'bold' }}>
                      {formatCurrency(invoice.montant_ttc)}
                    </td>
                    <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                      {isCheck && checkCount > 0 ? (
                        <span style={{
                          background: '#e3f2fd',
                          color: '#1976d2',
                          padding: '0.25rem 0.5rem',
                          borderRadius: '4px',
                          fontSize: '0.8rem'
                        }}>
                          {checkCount} chèque{checkCount > 1 ? 's' : ''}
                        </span>
                      ) : (
                        <span style={{ color: '#666', fontSize: '0.8rem' }}>-</span>
                      )}
                    </td>
                    <td style={{ padding: '0.75rem', fontSize: '0.8rem' }}>
                      {new Date(invoice.created_at).toLocaleDateString('fr-FR')}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Message si aucune donnée */}
        {salesAsInvoices.length === 0 && externalInvoices.length === 0 && supabaseInvoices.length === 0 && (
          <div style={{
            textAlign: 'center',
            padding: '2rem',
            color: '#666',
            background: '#f8f9fa',
            borderRadius: '8px'
          }}>
            <FileText size={48} style={{ opacity: 0.3, marginBottom: '1rem' }} />
            <p style={{ margin: 0, fontSize: '1.1rem' }}>
              Aucune facture trouvée
            </p>
            <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.9rem' }}>
              Les correspondances s'afficheront ici dès qu'il y aura des ventes ou des factures.
            </p>
          </div>
        )}
      </div>

      {/* Centre de notifications */}
      {notifications.length > 0 && (
        <div style={{ marginBottom: '1rem' }}>
          <NotificationCenter
            notifications={notifications}
            onRemove={removeNotification}
          />
        </div>
      )}

      {/* Affichage des erreurs */}
      {hasError && (
        <div style={{
          background: '#fee',
          border: '1px solid #f88',
          borderRadius: '8px',
          padding: '1rem',
          marginBottom: '1rem',
          color: '#c33'
        }}>
          <strong>❌ Erreurs de synchronisation:</strong>
          {syncError && <div>• Factures internes: {syncError}</div>}
          {externalError && <div>• Factures externes: {externalError}</div>}
        </div>
      )}

      {/* Contenu principal selon la vue active */}
      <div style={{ minHeight: '400px' }}>
        {activeView === 'compact' && (
          <CompactInvoicesDisplay
            internalInvoices={salesAsInvoices}
            onInvoiceClick={handleInvoiceClick}
          />
        )}

        {activeView === 'external' && (
          <ExternalInvoicesDisplay
            showStats={true}
            maxHeight="600px"
          />
        )}

        {activeView === 'detailed' && (
          <div style={{
            background: 'white',
            border: '1px solid #ddd',
            borderRadius: '12px',
            padding: '1.5rem'
          }}>
            {selectedInvoice ? (
              <div>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '1.5rem',
                  paddingBottom: '1rem',
                  borderBottom: '2px solid #f0f0f0'
                }}>
                  <h3 style={{ margin: 0, color: '#477A0C' }}>
                    📄 Détails de la facture {selectedInvoice.number}
                  </h3>
                  <button
                    onClick={() => setActiveView('compact')}
                    style={{
                      background: '#477A0C',
                      color: 'white',
                      border: 'none',
                      padding: '0.5rem 1rem',
                      borderRadius: '8px',
                      cursor: 'pointer'
                    }}
                  >
                    ← Retour à la liste
                  </button>
                </div>

                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                  gap: '1.5rem'
                }}>
                  <div>
                    <h4 style={{ color: '#477A0C', marginBottom: '1rem' }}>
                      👤 Informations Client
                    </h4>
                    <div style={{ background: '#f9f9f9', padding: '1rem', borderRadius: '8px' }}>
                      <div><strong>Nom:</strong> {selectedInvoice.client.name}</div>
                      {selectedInvoice.client.email && (
                        <div><strong>Email:</strong> {selectedInvoice.client.email}</div>
                      )}
                      {selectedInvoice.client.phone && (
                        <div><strong>Téléphone:</strong> {selectedInvoice.client.phone}</div>
                      )}
                    </div>
                  </div>

                  <div>
                    <h4 style={{ color: '#477A0C', marginBottom: '1rem' }}>
                      💰 Informations Financières
                    </h4>
                    <div style={{ background: '#f9f9f9', padding: '1rem', borderRadius: '8px' }}>
                      <div><strong>Montant:</strong> {formatCurrency(selectedInvoice.amount)}</div>
                      <div><strong>Statut:</strong> {selectedInvoice.status}</div>
                      <div><strong>Type:</strong> {selectedInvoice.type === 'external' ? 'Externe' : 'Interne'}</div>
                    </div>
                  </div>

                  <div>
                    <h4 style={{ color: '#477A0C', marginBottom: '1rem' }}>
                      🛍️ Produits
                    </h4>
                    <div style={{ background: '#f9f9f9', padding: '1rem', borderRadius: '8px' }}>
                      <div><strong>Nombre:</strong> {selectedInvoice.products.count}</div>
                      <div><strong>Premier produit:</strong> {selectedInvoice.products.firstProduct}</div>
                    </div>
                  </div>
                  
                  {/* Section de paiement par chèques si applicable */}
                  {selectedInvoice.originalData?.paymentDetails?.checkDetails && (
                    <div>
                      <h4 style={{ color: '#F59E0B', marginBottom: '1rem' }}>
                        📄 Règlement par chèques
                      </h4>
                      <div style={{
                        background: '#FEF3C7',
                        border: '2px solid #F59E0B',
                        borderRadius: '8px',
                        padding: '1rem'
                      }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                          <div>
                            <div style={{ fontSize: '0.875rem', color: '#78350F', marginBottom: '0.25rem' }}>Nombre de chèques</div>
                            <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#92400E' }}>
                              {selectedInvoice.originalData.paymentDetails.checkDetails.totalChecks}
                            </div>
                          </div>
                          <div>
                            <div style={{ fontSize: '0.875rem', color: '#78350F', marginBottom: '0.25rem' }}>Montant par chèque</div>
                            <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#92400E' }}>
                              {formatCurrency(selectedInvoice.originalData.paymentDetails.checkDetails.checkAmounts?.[0] || 
                                (selectedInvoice.amount / selectedInvoice.originalData.paymentDetails.checkDetails.totalChecks))}
                            </div>
                          </div>
                          <div>
                            <div style={{ fontSize: '0.875rem', color: '#78350F', marginBottom: '0.25rem' }}>Montant total</div>
                            <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#92400E' }}>
                              {formatCurrency(selectedInvoice.amount)}
                            </div>
                          </div>
                        </div>
                        {selectedInvoice.originalData.paymentDetails.checkDetails.characteristics && (
                          <div style={{ 
                            padding: '0.75rem', 
                            background: 'rgba(255,255,255,0.7)', 
                            borderRadius: '4px',
                            fontSize: '0.875rem',
                            color: '#78350F',
                            marginBottom: '0.5rem'
                          }}>
                            <strong>Caractéristiques :</strong> {selectedInvoice.originalData.paymentDetails.checkDetails.characteristics}
                          </div>
                        )}
                        {selectedInvoice.originalData.paymentDetails.paymentNotes && (
                          <div style={{ 
                            padding: '0.75rem', 
                            background: 'rgba(255,255,255,0.7)', 
                            borderRadius: '4px',
                            fontSize: '0.875rem',
                            color: '#78350F'
                          }}>
                            <strong>Notes de règlement :</strong> {selectedInvoice.originalData.paymentDetails.paymentNotes}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Données brutes en mode développement */}
                {import.meta.env.DEV && (
                  <details style={{ marginTop: '2rem' }}>
                    <summary style={{ cursor: 'pointer', color: '#666' }}>
                      🔧 Données brutes (dev)
                    </summary>
                    <pre style={{
                      background: '#f5f5f5',
                      padding: '1rem',
                      borderRadius: '8px',
                      overflow: 'auto',
                      fontSize: '0.8rem',
                      marginTop: '1rem'
                    }}>
                      {JSON.stringify(selectedInvoice.originalData, null, 2)}
                    </pre>
                  </details>
                )}
              </div>
            ) : (
              <div style={{
                textAlign: 'center',
                color: '#666',
                padding: '3rem'
              }}>
                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📄</div>
                <h3>Aucune facture sélectionnée</h3>
                <p>Cliquez sur une facture dans la vue compacte pour voir ses détails</p>
                <button
                  onClick={() => setActiveView('compact')}
                  style={{
                    background: '#477A0C',
                    color: 'white',
                    border: 'none',
                    padding: '0.75rem 1.5rem',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    marginTop: '1rem'
                  }}
                >
                  Voir toutes les factures
                </button>
              </div>
            )}
          </div>
        )}
      </div>
      {showMemo && (<SupabaseN8nMemo onClose={() => setShowMemo(false)} />)}
    </div>
  );
};

export default InvoicesTabCompact;
