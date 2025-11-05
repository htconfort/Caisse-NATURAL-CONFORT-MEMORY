import type { Invoice } from '@/services/syncService';
import { DollarSign, TrendingUp } from 'lucide-react';
import React, { useEffect, useMemo, useState } from 'react';
import { useRealtimeSync } from '@/hooks/useRealtimeSync';
import type { Sale, Vendor } from '../../types';

interface CATabProps {
  sales: Sale[];
  vendorStats: Vendor[];
  invoices: Invoice[];
}

export const CATab: React.FC<CATabProps> = ({ sales, vendorStats, invoices }) => {
  console.log('🔄 CATab RENDER - Inputs:', {
    salesCount: sales.length,
    vendorStatsCount: vendorStats.length,
    invoicesCount: invoices.length,
    currentTime: new Date().toLocaleTimeString()
  });

  // Debug simple - doit apparaître dans la console
  console.log('🟢 CATab: Composant rendu avec succès');

  // 🔧 CHARGER LES VENTES SYNCHRONISÉES DEPUIS SUPABASE (comme le monitoring)
  const { recentSales, loadRecentSales } = useRealtimeSync();
  
  // Charger les ventes récentes au montage
  useEffect(() => {
    loadRecentSales(100);
  }, [loadRecentSales]);

  // 🔧 COMBINER VENTES LOCALES + VENTES SYNCHRONISÉES (comme le monitoring)
  const allSales = useMemo(() => {
    // Convertir recentSales (Supabase) en format Sale
    const syncedSalesAsSales: Sale[] = recentSales.map(sale => ({
      id: sale.id,
      vendorId: sale.vendor_id,
      vendorName: sale.vendor_name,
      items: sale.items.map(item => ({
        id: item.id,
        name: item.name,
        category: item.category,
        quantity: item.quantity,
        price: item.price,
        unitPrice: item.price,
        totalPrice: item.price * item.quantity,
        addedAt: sale.created_at
      })),
      totalAmount: sale.total_amount,
      paymentMethod: sale.payment_method,
      date: sale.created_at,
      canceled: sale.canceled,
      isFromOtherTablet: true,
      syncedFromSupabase: true
    }));

    // Dédupliquer : si une vente existe dans sales locales, on garde la locale
    const salesIds = new Set(sales.map(s => s.id));
    const uniqueSyncedSales = syncedSalesAsSales.filter(s => !salesIds.has(s.id));

    const combined = [...sales, ...uniqueSyncedSales];
    
    console.log(`📊 CATab - Ventes combinées:`, {
      salesLocales: sales.length,
      syncedSales: recentSales.length,
      uniqueSyncedSales: uniqueSyncedSales.length,
      total: combined.length,
      avecKarima: combined.filter(s => s.vendorName?.includes('Karima')).length
    });

    return combined;
  }, [sales, recentSales]);

  // État local pour les factures externes (se met à jour via événements)
  const [externalInvoices, setExternalInvoices] = useState<Invoice[]>(invoices);
  const [lastUpdate, setLastUpdate] = useState(Date.now());

  // 🔄 Synchroniser avec les props invoices
  useEffect(() => {
    console.log(`🔄 CATab: Mise à jour invoices - ${invoices.length} factures reçues`);
    setExternalInvoices(invoices);
    setLastUpdate(Date.now()); // Force re-render
  }, [invoices]);

  // Écouter les événements de mise à jour des factures externes
  useEffect(() => {
    console.log('🔄 CA Instant: initialisation des écouteurs d événements');

    const handleExternalInvoicesUpdate = () => {
      console.log('🔄 CA Instant: événement external-invoices-updated reçu');
      setLastUpdate(Date.now()); // Force re-render
    };

    const handleExternalInvoiceReceived = (event: CustomEvent) => {
      console.log('🔄 CA Instant: événement external-invoice-received reçu', event.detail);
      setLastUpdate(Date.now()); // Force re-render
    };

    const handleVendorStatsUpdated = () => {
      console.log('🔄 CA Instant: événement vendor-stats-updated reçu');
      setLastUpdate(Date.now()); // Force re-render
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('external-invoices-updated', handleExternalInvoicesUpdate as EventListener);
      window.addEventListener('external-invoice-received', handleExternalInvoiceReceived as EventListener);
      window.addEventListener('vendor-stats-updated', handleVendorStatsUpdated as EventListener);
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('external-invoices-updated', handleExternalInvoicesUpdate as EventListener);
        window.removeEventListener('external-invoice-received', handleExternalInvoiceReceived as EventListener);
        window.removeEventListener('vendor-stats-updated', handleVendorStatsUpdated as EventListener);
      }
    };
  }, []);

  // Utiliser les factures externes mises à jour
  const currentInvoices = useMemo(() => {
    // 🔧 CORRECTION: Utiliser directement les props invoices (depuis supabaseInvoices dans App.tsx)
    // plutôt que externalInvoiceService qui peut avoir des données différentes
    console.log(`🔄 CA Instant: ${invoices.length} factures reçues via props`);
    
    // Log détaillé pour debug
    if (invoices.length > 0) {
      console.log(`📄 Factures reçues:`, invoices.map(inv => ({
        number: inv.invoiceNumber || inv.number,
        vendorName: inv.vendorName,
        vendorId: inv.vendorId,
        totalTTC: inv.totalTTC,
        createdAt: inv.createdAt
      })));
    }
    
    return invoices;
  }, [invoices, lastUpdate]);
  // Fonction pour récupérer la couleur d'une vendeuse
  const getVendorColor = (vendorId: string): string => {
    const vendor = vendorStats.find(v => v.id === vendorId);
    return vendor?.color || '#6B7280';
  };

  // 🎯 FONCTION UTILITAIRE : Vérifier si une date est aujourd'hui
  const isToday = (date: Date | string): boolean => {
    const today = new Date();
    const checkDate = new Date(date);
    return checkDate.toDateString() === today.toDateString();
  };

  // 🔧 FONCTION UTILITAIRE : Normaliser un nom de vendeuse (comme dans FeuilleDeRAZPro.tsx)
  // Inclut la gestion des variations connues (Bavette → Babette, etc.)
  const normalizeName = (name: string | undefined | null): string => {
    if (!name) return '';
    const normalized = name.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    
    // Gérer les variations connues
    if (normalized.includes('bavette') || normalized.includes('babeth')) {
      return 'babette';
    }
    
    return normalized;
  };

  // 🔧 CALCUL CA INSTANT TOTAL : Calculer depuis sales + invoices APRÈS le timestamp de RAZ
  const totalCA = useMemo(() => {
    // Récupérer le timestamp de la dernière RAZ (pour CA journalier depuis RAZ)
    const lastRAZTimestamp = localStorage.getItem('lastRAZTimestamp');
    const razTimestamp = lastRAZTimestamp ? parseInt(lastRAZTimestamp) : 0; // Si pas de RAZ, tout compte
    
    // Filtrer ventes APRÈS le RAZ (ou toutes si pas de RAZ) - utiliser allSales maintenant
    const afterRAZSales = allSales.filter(sale => {
      if (sale.canceled || !isToday(sale.date)) return false;
      if (razTimestamp === 0) return true; // Pas de RAZ, tout compte
      const saleTimestamp = sale.date instanceof Date ? sale.date.getTime() : new Date(sale.date).getTime();
      return saleTimestamp > razTimestamp; // Strictement après (pas >=)
    });
    
    // Filtrer factures APRÈS le RAZ (ou toutes si pas de RAZ)
    const afterRAZInvoices = currentInvoices.filter(invoice => {
      if (!isToday(invoice.createdAt)) return false;
      if (razTimestamp === 0) return true; // Pas de RAZ, tout compte
      const invoiceTimestamp = new Date(invoice.createdAt).getTime();
      return invoiceTimestamp > razTimestamp; // Strictement après (pas >=)
    });
    
    // CA depuis ventes caisse
    const caFromSales = afterRAZSales.reduce((sum, sale) => sum + (sale.totalAmount || 0), 0);
    // CA depuis factures externes
    const caFromInvoices = afterRAZInvoices.reduce((sum, inv) => sum + (inv.totalTTC || 0), 0);
    
    const total = caFromSales + caFromInvoices;
    
    console.log(`💰 CA INSTANTANÉ TOTAL (calculé depuis RAZ):`);
    console.log(`   📅 Dernière RAZ: ${razTimestamp ? new Date(razTimestamp).toLocaleString('fr-FR') : 'Jamais'}`);
    console.log(`   - Ventes caisse après RAZ: ${caFromSales.toFixed(2)}€ (${afterRAZSales.length} ventes)`);
    console.log(`   - Factures externes après RAZ: ${caFromInvoices.toFixed(2)}€ (${afterRAZInvoices.length} factures)`);
    console.log(`   - TOTAL: ${total.toFixed(2)}€`);

    return total;
  }, [allSales, currentInvoices]);

  // 🔧 CA par vendeuse : Calculer depuis sales + invoices APRÈS le timestamp de RAZ
  const vendorCAs = useMemo(() => {
    console.log(`👥 AFFICHAGE CA PAR VENDEUSE (calculé depuis RAZ):`);
    
    // Récupérer le timestamp de la dernière RAZ
    const lastRAZTimestamp = localStorage.getItem('lastRAZTimestamp');
    const razTimestamp = lastRAZTimestamp ? parseInt(lastRAZTimestamp) : 0;
    
    // Filtrer ventes et factures APRÈS le RAZ (ou toutes si pas de RAZ) - utiliser allSales maintenant
    const afterRAZSales = allSales.filter(sale => {
      if (sale.canceled || !isToday(sale.date)) return false;
      if (razTimestamp === 0) return true;
      const saleTimestamp = sale.date instanceof Date ? sale.date.getTime() : new Date(sale.date).getTime();
      return saleTimestamp > razTimestamp;
    });
    
    const afterRAZInvoices = currentInvoices.filter(invoice => {
      if (!isToday(invoice.createdAt)) {
        console.log(`⚠️ Facture ${invoice.invoiceNumber || invoice.number} exclue: pas aujourd'hui (${invoice.createdAt})`);
        return false;
      }
      if (razTimestamp === 0) return true;
      const invoiceTimestamp = new Date(invoice.createdAt).getTime();
      const isAfterRAZ = invoiceTimestamp > razTimestamp;
      if (!isAfterRAZ) {
        console.log(`⚠️ Facture ${invoice.invoiceNumber || invoice.number} exclue: avant RAZ`);
      }
      return isAfterRAZ;
    });
    
    console.log(`📊 Factures après RAZ: ${afterRAZInvoices.length} factures`);
    if (afterRAZInvoices.length > 0) {
      console.log(`📄 Factures après RAZ:`, afterRAZInvoices.map(inv => ({
        number: inv.invoiceNumber || inv.number,
        vendorName: inv.vendorName,
        vendorId: inv.vendorId,
        totalTTC: inv.totalTTC
      })));
    }
    
    const result = vendorStats.map(vendor => {
      // Normaliser le nom de la vendeuse
      const normalizedVendorName = normalizeName(vendor.name);
      
      // Filtrer ventes de cette vendeuse (par vendorName normalisé) APRÈS RAZ
      const vendorSales = afterRAZSales.filter(sale => {
        if (sale.vendorId === vendor.id) return true;
        const saleName = normalizeName(sale.vendorName);
        return saleName === normalizedVendorName;
      });
      
      // Filtrer factures de cette vendeuse (par vendorName normalisé) APRÈS RAZ
      const vendorInvoices = afterRAZInvoices.filter(invoice => {
        // Match par vendorId d'abord
        if (invoice.vendorId === vendor.id) {
          console.log(`✅ Facture ${invoice.invoiceNumber || invoice.number} matchée par vendorId pour ${vendor.name}`);
          return true;
        }
        // Sinon, match par nom normalisé
        const invoiceName = normalizeName(invoice.vendorName);
        const matches = invoiceName === normalizedVendorName;
        if (matches) {
          console.log(`✅ Facture ${invoice.invoiceNumber || invoice.number} matchée par nom: "${invoice.vendorName}" → "${vendor.name}"`);
        }
        return matches;
      });
      
      if (vendorInvoices.length > 0) {
        console.log(`   📄 ${vendor.name}: ${vendorInvoices.length} facture(s) trouvée(s)`, vendorInvoices.map(inv => ({
          number: inv.invoiceNumber || inv.number,
          totalTTC: inv.totalTTC,
          vendorId: inv.vendorId,
          vendorName: inv.vendorName
        })));
      } else {
        // Log si aucune facture trouvée pour cette vendeuse mais qu'il y en a après RAZ
        if (afterRAZInvoices.length > 0) {
          const potentialMatches = afterRAZInvoices.filter(inv => {
            const invName = normalizeName(inv.vendorName);
            return invName.includes('bav') || invName.includes('babeth') || inv.vendorId === vendor.id;
          });
          if (potentialMatches.length > 0 && (vendor.name.includes('Babette') || vendor.id === '2')) {
            console.warn(`⚠️ ${vendor.name}: Aucune facture trouvée mais ${potentialMatches.length} facture(s) potentielle(s):`, potentialMatches.map(inv => ({
              number: inv.invoiceNumber || inv.number,
              vendorId: inv.vendorId,
              vendorName: inv.vendorName,
              normalizedName: normalizeName(inv.vendorName),
              vendorNormalized: normalizedVendorName
            })));
          }
        }
      }
      
      // Calculer CA total (ventes + factures) APRÈS RAZ
      const caFromSales = vendorSales.reduce((sum, sale) => sum + (sale.totalAmount || 0), 0);
      const caFromInvoices = vendorInvoices.reduce((sum, inv) => sum + (inv.totalTTC || 0), 0);
      const realCA = caFromSales + caFromInvoices;
      
      console.log(`   📊 ${vendor.name}: ${realCA.toFixed(2)}€ (${vendorSales.length} ventes, ${vendorInvoices.length} factures)`);
      
      // 🔍 DEBUG: Log spécifique pour factures externes
      if (vendorInvoices.length > 0) {
        console.log(`   📄 Factures externes ${vendor.name}:`, vendorInvoices.map(inv => ({
          number: inv.invoiceNumber || inv.number,
          vendorName: inv.vendorName,
          vendorId: inv.vendorId,
          totalTTC: inv.totalTTC,
          createdAt: inv.createdAt
        })));
      }
      
      return {
        ...vendor,
        realCA: realCA,
        salesCount: vendorSales.length,
        invoicesCount: vendorInvoices.length
      };
    }).sort((a, b) => b.realCA - a.realCA); // Trier par CA décroissant

    console.log(`👥 CA PAR VENDEUSE (calculé):`, result.filter(v => v.realCA > 0));

    return result;
  }, [vendorStats, allSales, currentInvoices]);

  // Calcul du nombre total de ventes APRÈS RAZ (ventes caisse + factures externes)
  const totalSalesCount = useMemo(() => {
    // Récupérer le timestamp de la dernière RAZ
    const lastRAZTimestamp = localStorage.getItem('lastRAZTimestamp');
    const razTimestamp = lastRAZTimestamp ? parseInt(lastRAZTimestamp) : 0;
    
    // Filtrer ventes APRÈS le RAZ (ou toutes si pas de RAZ) - utiliser allSales maintenant
    const salesCount = allSales.filter(sale => {
      if (sale.canceled || !isToday(sale.date)) return false;
      if (razTimestamp === 0) return true;
      const saleTimestamp = sale.date instanceof Date ? sale.date.getTime() : new Date(sale.date).getTime();
      return saleTimestamp > razTimestamp;
    }).length;
    
    // Filtrer factures APRÈS le RAZ (ou toutes si pas de RAZ)
    const invoicesCount = currentInvoices.filter(invoice => {
      if (!isToday(invoice.createdAt)) return false;
      if (razTimestamp === 0) return true;
      const invoiceTimestamp = new Date(invoice.createdAt).getTime();
      return invoiceTimestamp > razTimestamp;
    }).length;
    
    const totalCount = salesCount + invoicesCount;

    console.log(`📊 TRANSACTIONS APRÈS RAZ:
    - Ventes caisse après RAZ: ${salesCount}
    - Factures externes après RAZ: ${invoicesCount}
    - TOTAL: ${totalCount} transactions`);

    return totalCount;
  }, [allSales, currentInvoices]);

  console.log('🟡 CATab: Rendu du JSX commencé');

  return (
    <div className="animate-fadeIn">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-bold" style={{ color: '#000000' }}>
          Chiffre d'Affaires Instantané
        </h2>
        <div className="flex items-center gap-2 text-sm" style={{ color: '#6B7280' }}>
          <TrendingUp size={16} />
          <span>Mis à jour en temps réel</span>
        </div>
      </div>

      {/* CA Global */}
      <div className="card mb-6" style={{ backgroundColor: '#F0FDF4', borderLeft: '6px solid #16A34A' }}>
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold mb-2" style={{ color: '#000000' }}>
              Chiffre d'Affaires Total
            </h3>
            <p className="text-sm" style={{ color: '#6B7280' }}>
              {totalSalesCount} vente{totalSalesCount > 1 ? 's' : ''} réalisée{totalSalesCount > 1 ? 's' : ''}
            </p>
          </div>
          <div className="text-right">
            <div className="text-4xl font-bold" style={{ color: '#16A34A' }}>
              {totalCA.toFixed(2)}€
            </div>
            <div className="flex items-center gap-1 mt-1" style={{ color: '#16A34A' }}>
              <DollarSign size={14} />
              <span className="text-sm font-medium">Total</span>
            </div>
          </div>
        </div>
      </div>

      {/* CA par Vendeuse */}
      <div className="card">
        <h3 className="text-xl font-bold mb-6" style={{ color: '#000000' }}>
          Chiffre d'Affaires par Vendeuse
        </h3>

        {vendorCAs.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-lg" style={{ color: '#000000' }}>
              Aucune vendeuse enregistrée
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {vendorCAs.map((vendor, index) => {
              const percentage = totalCA > 0 ? (vendor.realCA / totalCA) * 100 : 0;
              // Utiliser les comptages déjà calculés dans vendorCAs
              const totalVendorSales = (vendor.salesCount || 0) + (vendor.invoicesCount || 0);

              // 🔍 DEBUG : Log pour diagnostiquer les incohérences
              if (vendor.dailySales > 0 && totalVendorSales === 0) {
                console.warn(`⚠️ CA INSTANT - Incohérence détectée pour ${vendor.name}:`, {
                  vendeuse: vendor.name,
                  dailySales: vendor.dailySales.toFixed(2) + '€',
                  ventesCaisse: salesCount,
                  facturesExternes: invoicesCount,
                  totalVentes: totalVendorSales,
                  debug: {
                    salesIds: sales.filter(s => !s.canceled && isToday(s.date)).map(s => ({ vendorId: s.vendorId, vendorName: s.vendorName })),
                    invoiceIds: currentInvoices.filter(i => isToday(i.createdAt)).map(i => ({ vendorId: i.vendorId, vendorName: i.vendorName }))
                  }
                });
              }

              return (
                <div
                  key={vendor.id}
                  className="card relative overflow-hidden"
                  style={{
                    borderLeft: `8px solid ${getVendorColor(vendor.id)}`,
                    backgroundColor: `${getVendorColor(vendor.id)}30`,
                    border: `2px solid ${getVendorColor(vendor.id)}40`
                  }}
                >
                  {/* Badge du classement pour le top 3 */}
                  {index < 3 && vendor.realCA > 0 && (
                    <div
                      className="absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white"
                      style={{
                        backgroundColor: index === 0 ? '#FFD700' : index === 1 ? '#C0C0C0' : '#CD7F32'
                      }}
                    >
                      {index + 1}
                    </div>
                  )}

                  <div className="flex items-center gap-3 mb-4">
                    <div
                      className="w-6 h-6 rounded-full border-2 border-white shadow-lg"
                      style={{ backgroundColor: getVendorColor(vendor.id) }}
                    ></div>
                  </div>

                  <div className="space-y-3">
                    <div className="text-center mb-4">
                      <h4 className="font-bold text-lg" style={{ color: '#000000' }}>
                        {vendor.name}
                      </h4>
                    </div>
                    
                    <div>
                      <div className="text-2xl font-bold" style={{ color: '#000000' }}>
                        {vendor.realCA.toFixed(2)}€
                      </div>
                      <div className="text-sm font-semibold" style={{ color: '#000000' }}>
                        Chiffre d'affaires
                      </div>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-sm font-semibold" style={{ color: '#000000' }}>
                        {totalVendorSales} vente{totalVendorSales > 1 ? 's' : ''}
                      </span>
                      <span className="text-sm font-bold px-2 py-1 rounded" 
                            style={{ 
                              color: 'white',
                              backgroundColor: getVendorColor(vendor.id)
                            }}>
                        {percentage.toFixed(1)}%
                      </span>
                    </div>

                    {/* Barre de progression */}
                    <div className="w-full bg-gray-300 rounded-full h-3 border border-gray-400">
                      <div
                        className="h-3 rounded-full transition-all duration-500 shadow-inner"
                        style={{
                          width: `${percentage}%`,
                          backgroundColor: getVendorColor(vendor.id),
                          boxShadow: `inset 0 1px 3px rgba(0,0,0,0.2)`
                        }}
                      ></div>
                    </div>

                    {vendor.realCA > 0 && (
                      <div className="text-xs font-semibold" style={{ color: '#000000' }}>
                        Moyenne: {totalVendorSales > 0 ? (vendor.realCA / totalVendorSales).toFixed(2) : '0.00'}€ / vente
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Résumé statistique */}
        {totalCA > 0 && (
          <div className="mt-6 pt-6 border-t">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-lg font-bold" style={{ color: '#000000' }}>
                  {vendorCAs.filter(v => v.realCA > 0).length}
                </div>
                <div className="text-sm font-semibold" style={{ color: '#000000' }}>
                  Vendeuses actives
                </div>
              </div>
              <div>
                <div className="text-lg font-bold" style={{ color: '#000000' }}>
                  {totalSalesCount > 0 ? (totalCA / totalSalesCount).toFixed(2) : '0.00'}€
                </div>
                <div className="text-sm font-semibold" style={{ color: '#000000' }}>
                  Panier moyen
                </div>
              </div>
              <div>
                <div className="text-lg font-bold" style={{ color: '#000000' }}>
                  {vendorCAs.length > 0 && totalCA > 0 ? (totalCA / vendorCAs.filter(v => v.realCA > 0).length).toFixed(2) : '0.00'}€
                </div>
                <div className="text-sm font-semibold" style={{ color: '#000000' }}>
                  CA moyen / vendeuse
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
