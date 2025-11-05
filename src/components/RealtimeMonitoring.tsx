import { getDB } from '@/db/index';
import { useSupabaseInvoices } from '@/hooks/useSupabaseInvoices';
import { getCurrentSession } from '@/services/sessionService';
import { Activity, AlertCircle, Calendar, ChevronDown, ChevronRight, Clock, DollarSign, Eye, EyeOff, Package, ShoppingCart, TrendingUp, Users, Wifi, WifiOff } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { productCatalog } from '../data';
import { useRealtimeSync } from '../hooks/useRealtimeSync';
import type { Sale, SessionDB, Vendor } from '../types/index';
import { VendorCommissionTables } from './raz/VendorCommissionTables';

/**
 * Composant de monitoring temps réel
 * À afficher sur votre ordinateur pour suivre les ventes de l'iPad distant
 */
export function RealtimeMonitoring() {
  const {
    syncStatus,
    recentSales,
    vendorStats,
    activeSessions,
    loadRecentSales,
    loadVendorStats,
    loadActiveSessions,
    subscribeToSales,
    subscribeToVendorStats,
    subscribeToActiveSessions
  } = useRealtimeSync();

  const [isMonitoring, setIsMonitoring] = useState(true);
  const [selectedStore, setSelectedStore] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'today' | 'history' | 'commissions' | 'products'>('today');
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [expandedCategoriesSession, setExpandedCategoriesSession] = useState<Set<string>>(new Set());
  
  // Données pour tableaux de commission
  const [currentSession, setCurrentSession] = useState<SessionDB | null>(null);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [localSales, setLocalSales] = useState<Sale[]>([]);
  const { invoices: supabaseInvoices } = useSupabaseInvoices();

  // Créer un Map pour accès rapide aux prix catalogue
  const catalogPriceMap = new Map(
    productCatalog.map(product => [product.name, product.priceTTC])
  );

  // Fonction pour obtenir le prix officiel d'un produit depuis le catalogue
  const getCatalogPrice = (productName: string): number => {
    return catalogPriceMap.get(productName) || 0;
  };
  
  // Créer un Map pour retrouver la catégorie officielle d'un produit
  const productCategoryMap = new Map(
    productCatalog.map(product => [product.name, product.category])
  );

  // Fonction pour obtenir la VRAIE catégorie d'un produit depuis le catalogue (CLONE EXACT Stock Vendu)
  const getRealCategory = (productName: string): string => {
    // Chercher dans le catalogue
    const catalogCategory = productCategoryMap.get(productName);
    if (catalogCategory) {
      return catalogCategory;
    }
    
    // Si pas trouvé, essayer de deviner depuis le nom
    const nameLower = productName.toLowerCase();
    if (nameLower.includes('protège')) return 'Protège-matelas'; // Catégorie dédiée
    if (nameLower.includes('matelas') && !nameLower.includes('sur')) return 'Matelas';
    if (nameLower.includes('surmatelas') || nameLower.includes('sur-matelas')) return 'Sur-matelas';
    if (nameLower.includes('oreiller') || nameLower.includes('traversin')) return 'Oreillers';
    if (nameLower.includes('couette')) return 'Couettes';
    if (nameLower.includes('plateau') && nameLower.includes('fraîche')) return 'Plateau Fraîche';
    if (nameLower.includes('plateau')) return 'Plateau';
    if (nameLower.includes('taie') || nameLower.includes('régule') || nameLower.includes('pack')) return 'Accessoires';
    
    // Sinon, ignorer complètement (ne pas afficher Test, Divers, etc.)
    return 'IGNORE';
  };

  // Fonction pour vérifier si une date est aujourd'hui
  const isToday = (date: string | Date) => {
    const saleDate = new Date(date);
    const today = new Date();
    return saleDate.toDateString() === today.toDateString();
  };
  
  // Fonction pour toggle une catégorie
  const toggleCategorySession = (category: string) => {
    setExpandedCategoriesSession(prev => {
      const newSet = new Set(prev);
      if (newSet.has(category)) {
        newSet.delete(category);
      } else {
        newSet.add(category);
      }
      return newSet;
    });
  };

  // Calculer les stats produits DE LA SESSION "FOIRE DE DIJON" (1er-11 novembre 2025)
  const calculateProductStats = () => {
    interface ProductStat {
      name: string;
      quantity: number;
      revenue: number;
      unitPrice: number; // Prix catalogue officiel
      actualPrice: number; // Prix réellement pratiqué (pour détecter les écarts)
      hasDiscount: boolean; // Vrai si prix saisi ≠ prix catalogue
      isFree: boolean; // Vrai si prix = 0€ (offert)
      salesCount: number;
    }

    const productStatsMap = new Map<string, ProductStat>();

    // 🔧 FIX: Utiliser TOUJOURS les dates de la "Foire de Dijon" (1er-11 novembre 2025)
    // Même si la session actuelle n'a pas ces dates, on veut voir TOUTES les ventes de cette période
    const sessionStart = new Date('2025-11-01T00:00:00').getTime();
    const sessionEnd = new Date('2025-11-11T23:59:59').getTime();
    
    console.log('📊 Monitoring - Calcul produits session "Foire de Dijon":', {
      sessionStart: new Date(sessionStart).toLocaleString('fr-FR'),
      sessionEnd: new Date(sessionEnd).toLocaleString('fr-FR'),
      totalLocalSales: localSales.length,
      totalSupabaseInvoices: supabaseInvoices.length
    });
    
    // Filtrer ventes locales par dates de session (exclure Billy, Johan)
    const excludedVendors = ['Billy', 'Johan', 'billy', 'johan'];
    const sessionSales = localSales.filter(sale => {
      if (excludedVendors.includes(sale.vendorName)) return false;
      const saleTime = new Date(sale.date).getTime();
      return saleTime >= sessionStart && saleTime <= sessionEnd;
    });
    
    console.log('📊 Monitoring - Ventes filtrées session:', {
      sessionSales: sessionSales.length,
      filtered: localSales.length - sessionSales.length
    });

    // Parcourir les ventes de la session
    sessionSales.forEach(sale => {
      sale.items.forEach((item: any) => {
        const productName = item.name;
        const category = getRealCategory(productName);
        
        // 🔧 IGNORER produits Test, Divers sans correspondance (comme Stock Vendu)
        if (category === 'IGNORE') {
          console.log('⚠️ Produit ignoré (pas dans catalogue):', productName);
          return;
        }
        
        const catalogPrice = getCatalogPrice(productName);
        const existing = productStatsMap.get(productName) || {
          name: productName,
          quantity: 0,
          revenue: 0,
          unitPrice: catalogPrice,
          actualPrice: item.price,
          hasDiscount: false,
          isFree: false,
          salesCount: 0
        };

        existing.quantity += item.quantity;
        existing.revenue += item.price * item.quantity;
        existing.salesCount += 1;
        existing.unitPrice = catalogPrice;
        existing.actualPrice = item.price; // Prix réel de la dernière vente
        existing.hasDiscount = item.price !== catalogPrice && item.price > 0;
        existing.isFree = item.price === 0;

        productStatsMap.set(productName, existing);
      });
    });

    // Filtrer factures Supabase par dates "Foire de Dijon" (1er-11 novembre 2025) - exclure annulées
    const sessionInvoices = supabaseInvoices.filter(invoice => {
      if (invoice.status === 'canceled' || invoice.canceled === true) return false;
      const invoiceTime = new Date(invoice.created_at).getTime();
      // Inclure toutes les factures du 1er au 11 novembre 2025
      return invoiceTime >= sessionStart && invoiceTime <= sessionEnd;
    });
    
    console.log('📊 Monitoring - Factures filtrées session:', {
      totalInvoices: supabaseInvoices.length,
      sessionInvoices: sessionInvoices.length,
      produitsFactures: sessionInvoices.reduce((sum, inv) => sum + (Array.isArray(inv.produits) ? inv.produits.length : 0), 0)
    });
    
    // Ajouter les factures de la session
    console.log('🔍 MONITORING - ANALYSE FACTURES SESSION:');
    sessionInvoices.forEach((invoice, idx) => {
      console.log(`📄 Facture ${idx + 1}/${sessionInvoices.length}: ${invoice.numero_facture} - ${invoice.conseiller}`);
      console.log('   Produits:', invoice.produits);
      console.log('   Array?', Array.isArray(invoice.produits));
      
      if (invoice.produits && Array.isArray(invoice.produits)) {
        console.log(`   ${invoice.produits.length} produit(s):`);
        
        invoice.produits.forEach((item: any, itemIdx) => {
          const productName = item.nom || item.name;
          const category = getRealCategory(productName);
          const qty = item.quantite || item.quantity || 1;
          const price = item.prix_unitaire || item.price || 0;
          
          console.log(`   ${itemIdx + 1}. "${productName}" → Catégorie: ${category} | Qté: ${qty} | Prix: ${price}€`);
          
          // 🔧 IGNORER produits Test, Divers sans correspondance (comme Stock Vendu)
          if (category === 'IGNORE') {
            console.log(`      ❌ IGNORÉ (pas dans catalogue)`);
            return;
          }
          
          const catalogPrice = getCatalogPrice(productName);
          const existing = productStatsMap.get(productName) || {
            name: productName,
            quantity: 0,
            revenue: 0,
            unitPrice: catalogPrice,
            actualPrice: 0,
            hasDiscount: false,
            isFree: false,
            salesCount: 0
          };

          existing.quantity += qty;
          existing.revenue += price * qty;
          existing.salesCount += 1;
          existing.unitPrice = catalogPrice;
          existing.actualPrice = price; // Prix réel de la dernière vente
          existing.hasDiscount = price !== catalogPrice && price > 0;
          existing.isFree = price === 0;

          productStatsMap.set(productName, existing);
          
          console.log(`      ✅ AJOUTÉ: Total qté = ${existing.quantity}`);
        });
      } else {
        console.log('   ⚠️ Pas de produits ou format incorrect');
      }
    });

    // Convertir en tableau, FILTRER les produits sans CA, et trier par quantité
    const allProducts = Array.from(productStatsMap.values());
    const validProducts = allProducts.filter(p => p.revenue > 0);
    const invalidProducts = allProducts.filter(p => p.revenue === 0 && p.quantity > 0);
    
    // Log des produits exclus pour debugging
    if (invalidProducts.length > 0) {
      console.warn('⚠️ Produits exclus (CA = 0€):', invalidProducts.map(p => p.name).join(', '));
    }
    
    return validProducts.sort((a, b) => b.quantity - a.quantity);
  };

  // Calculer stats produits du jour uniquement
  const calculateDailyProductStats = () => {
    interface ProductStat {
      name: string;
      quantity: number;
      revenue: number;
      unitPrice: number; // Prix catalogue officiel
      actualPrice: number; // Prix réellement pratiqué (pour détecter les écarts)
      hasDiscount: boolean; // Vrai si prix saisi ≠ prix catalogue
      isFree: boolean; // Vrai si prix = 0€ (offert)
      salesCount: number;
    }

    const productStatsMap = new Map<string, ProductStat>();
    const razTimestamp = localStorage.getItem('lastRAZTimestamp');
    const razTime = razTimestamp ? parseInt(razTimestamp) : 0;

    // Filtrer ventes du jour (après RAZ)
    const todaySales = localSales.filter(sale => {
      const saleTime = new Date(sale.date).getTime();
      return saleTime > razTime;
    });

    todaySales.forEach(sale => {
      sale.items.forEach((item: any) => {
        const catalogPrice = getCatalogPrice(item.name);
        const existing = productStatsMap.get(item.name) || {
          name: item.name,
          quantity: 0,
          revenue: 0,
          unitPrice: catalogPrice,
          actualPrice: item.price,
          hasDiscount: false,
          isFree: false,
          salesCount: 0
        };

        existing.quantity += item.quantity;
        existing.revenue += item.price * item.quantity;
        existing.salesCount += 1;
        existing.unitPrice = catalogPrice;
        existing.actualPrice = item.price;
        existing.hasDiscount = item.price !== catalogPrice && item.price > 0;
        existing.isFree = item.price === 0;

        productStatsMap.set(item.name, existing);
      });
    });

    // Factures Supabase du jour (exclure annulées)
    const todayInvoices = supabaseInvoices.filter(inv => {
      // 🔧 Exclure les factures annulées
      if (inv.status === 'canceled' || inv.canceled === true) return false;
      
      const invTime = new Date(inv.created_at).getTime();
      return invTime > razTime;
    });

    todayInvoices.forEach(invoice => {
      if (invoice.produits && Array.isArray(invoice.produits)) {
        invoice.produits.forEach((item: any) => {
          const productName = item.nom || item.name;
          const catalogPrice = getCatalogPrice(productName);
          const existing = productStatsMap.get(productName) || {
            name: productName,
            quantity: 0,
            revenue: 0,
            unitPrice: catalogPrice,
            actualPrice: 0,
            hasDiscount: false,
            isFree: false,
            salesCount: 0
          };

          const qty = item.quantite || item.quantity || 1;
          const price = item.prix_unitaire || item.price || 0;

          existing.quantity += qty;
          existing.revenue += price * qty;
          existing.salesCount += 1;
          existing.unitPrice = catalogPrice;
          existing.actualPrice = price;
          existing.hasDiscount = price !== catalogPrice && price > 0;
          existing.isFree = price === 0;

          productStatsMap.set(productName, existing);
        });
      }
    });

    // Convertir en tableau, FILTRER les produits sans CA, et trier par quantité
    const allProducts = Array.from(productStatsMap.values());
    const validProducts = allProducts.filter(p => p.revenue > 0);
    const invalidProducts = allProducts.filter(p => p.revenue === 0 && p.quantity > 0);
    
    // Log des produits exclus pour debugging
    if (invalidProducts.length > 0) {
      console.warn('⚠️ Produits du jour exclus (CA = 0€):', invalidProducts.map(p => p.name).join(', '));
    }
    
    return validProducts.sort((a, b) => b.quantity - a.quantity);
  };

  const productStatsSession = calculateProductStats();
  const productStatsDay = calculateDailyProductStats();
  
  // Grouper les produits par catégorie pour la session
  interface CategoryGroup {
    category: string;
    products: any[];
    totalQuantity: number;
  }
  
  const groupProductsByCategory = (products: any[]): CategoryGroup[] => {
    const categoryMap = new Map<string, any[]>();
    
    products.forEach(product => {
      const category = getRealCategory(product.name);
      if (!categoryMap.has(category)) {
        categoryMap.set(category, []);
      }
      categoryMap.get(category)!.push(product);
    });
    
    const categoryGroups: CategoryGroup[] = [];
    categoryMap.forEach((products, category) => {
      const totalQuantity = products.reduce((sum, p) => sum + p.quantity, 0);
      categoryGroups.push({
        category,
        products,
        totalQuantity
      });
    });
    
    // Trier par quantité totale décroissante
    return categoryGroups.sort((a, b) => b.totalQuantity - a.totalQuantity);
  };
  
  const productsByCategorySession = groupProductsByCategory(productStatsSession);
  const totalSessionQty = productsByCategorySession.reduce((sum, cat) => sum + cat.totalQuantity, 0);
  
  // Calculer le nombre de produits exclus (CA = 0€)
  const countExcludedProducts = () => {
    const allProductsSession = new Map<string, { quantity: number; revenue: number }>();
    const allProductsDay = new Map<string, { quantity: number; revenue: number }>();
    
    // Session
    localSales.forEach(sale => {
      sale.items.forEach((item: any) => {
        const existing = allProductsSession.get(item.name) || { quantity: 0, revenue: 0 };
        existing.quantity += item.quantity;
        existing.revenue += item.price * item.quantity;
        allProductsSession.set(item.name, existing);
      });
    });
    
    supabaseInvoices
      .filter(invoice => invoice.status !== 'canceled' && invoice.canceled !== true)
      .forEach(invoice => {
      if (invoice.produits && Array.isArray(invoice.produits)) {
        invoice.produits.forEach((item: any) => {
          const existing = allProductsSession.get(item.nom || item.name) || { quantity: 0, revenue: 0 };
          const qty = item.quantite || item.quantity || 1;
          const price = item.prix_unitaire || item.price || 0;
          existing.quantity += qty;
          existing.revenue += price * qty;
          allProductsSession.set(item.nom || item.name, existing);
        });
      }
    });
    
    const excludedSession = Array.from(allProductsSession.values()).filter(p => p.revenue === 0 && p.quantity > 0).length;
    
    // Jour
    const razTimestamp = localStorage.getItem('lastRAZTimestamp');
    const razTime = razTimestamp ? parseInt(razTimestamp) : 0;
    const todaySales = localSales.filter(sale => new Date(sale.date).getTime() > razTime);
    const todayInvoices = supabaseInvoices.filter(inv => {
      // 🔧 Exclure les factures annulées
      if (inv.status === 'canceled' || inv.canceled === true) return false;
      return new Date(inv.created_at).getTime() > razTime;
    });
    
    todaySales.forEach(sale => {
      sale.items.forEach((item: any) => {
        const existing = allProductsDay.get(item.name) || { quantity: 0, revenue: 0 };
        existing.quantity += item.quantity;
        existing.revenue += item.price * item.quantity;
        allProductsDay.set(item.name, existing);
      });
    });
    
    todayInvoices.forEach(invoice => {
      if (invoice.produits && Array.isArray(invoice.produits)) {
        invoice.produits.forEach((item: any) => {
          const existing = allProductsDay.get(item.nom || item.name) || { quantity: 0, revenue: 0 };
          const qty = item.quantite || item.quantity || 1;
          const price = item.prix_unitaire || item.price || 0;
          existing.quantity += qty;
          existing.revenue += price * qty;
          allProductsDay.set(item.nom || item.name, existing);
        });
      }
    });
    
    const excludedDay = Array.from(allProductsDay.values()).filter(p => p.revenue === 0 && p.quantity > 0).length;
    
    return { excludedSession, excludedDay };
  };
  
  const { excludedSession: _excludedSession, excludedDay } = countExcludedProducts();


  // Actualisation automatique toutes les 20 secondes pour l'onglet "Aujourd'hui"
  useEffect(() => {
    if (activeTab === 'today' && isMonitoring) {
      const interval = setInterval(() => {
        console.log('🔄 Actualisation automatique des données...');
        loadRecentSales(); // 🔧 FORCER rechargement ventes synchronisées depuis Supabase
        loadVendorStats();
        loadActiveSessions();
        loadCommissionData(); // 🔧 Recharger aussi les ventes locales (IndexedDB)
        
        setLastRefresh(new Date());
      }, 20000); // 20 secondes

      return () => clearInterval(interval);
    }
  }, [activeTab, isMonitoring, loadRecentSales, loadVendorStats, loadActiveSessions]);

  // Charger les données initiales
  useEffect(() => {
    loadRecentSales();
    loadVendorStats();
    loadActiveSessions();
    loadCommissionData();
  }, [loadRecentSales, loadVendorStats, loadActiveSessions]);
  
  // Recharger les données quand les factures Supabase changent
  useEffect(() => {
    loadCommissionData();
  }, [supabaseInvoices]);
  
  // Charger données pour tableaux de commission
  const loadCommissionData = async () => {
    try {
      const db = await getDB();
      
      // Session
      const session = await getCurrentSession();
      setCurrentSession(session || null);
      
      // Vendeuses actives uniquement
      const vendorsData = await db.table('vendors').toArray();
      const activeVendorIds = ['1', '2', '3', '6', '7', '8']; // Sylvie, Babette, Lucia, Sabrina, Billy, Karima
      const activeVendors = vendorsData.filter(v => activeVendorIds.includes(v.id));
      setVendors(activeVendors);
      
      // Ventes locales
      const salesData = await db.table('sales').toArray();
      // 🔧 Filtrer les ventes de test (8h48-8h50 le 3 novembre 2025)
      const testDate = new Date('2025-11-03T08:48:00');
      const testStartTime = testDate.getTime();
      const testEndTime = new Date('2025-11-03T08:51:00').getTime();
      
      const filteredSales = salesData.filter(sale => {
        const saleTime = new Date(sale.date).getTime();
        // Exclure les ventes entre 8h48 et 8h51 le 3 novembre 2025
        return !(saleTime >= testStartTime && saleTime <= testEndTime);
      });
      
      setLocalSales(filteredSales);
      
      // 🔍 DEBUG: Vérifier présence vente Sabrina 150€
      const sabrina150Sales = filteredSales.filter(s => 
        s.vendorName?.includes('Sabrina') && s.totalAmount === 150
      );
      if (sabrina150Sales.length > 0) {
        console.log('✅ Vente Sabrina 150€ trouvée dans IndexedDB:', sabrina150Sales.map(s => ({
          id: s.id,
          date: s.date,
          vendorName: s.vendorName,
          totalAmount: s.totalAmount,
          canceled: s.canceled
        })));
      } else {
        console.warn('⚠️ Vente Sabrina 150€ NON trouvée dans IndexedDB');
      }
      
      console.log('💰 Données commission chargées dans Monitoring:', {
        session: session?.eventName,
        vendors: activeVendors.length,
        sales: salesData.length,
        filteredSales: filteredSales.length,
        sabrina150Count: sabrina150Sales.length
      });
    } catch (error) {
      console.error('❌ Erreur chargement données commission:', error);
    }
  };

  // S'abonner aux mises à jour temps réel
  useEffect(() => {
    if (!isMonitoring) return;

    const unsubscribeSales = subscribeToSales((sale) => {
      console.log('🔔 NOUVELLE VENTE !', sale);
      // Notification sonore ou visuelle
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('Nouvelle vente !', {
          body: `${sale.vendor_name} - ${sale.total_amount.toFixed(2)}€`,
          icon: '/favicon.ico'
        });
      }
    });

    const unsubscribeVendors = subscribeToVendorStats((stats) => {
      console.log('📊 Stats vendeur mises à jour:', stats);
    });

    const unsubscribeSessions = subscribeToActiveSessions((session) => {
      console.log('👤 Session mise à jour:', session);
    });

    return () => {
      unsubscribeSales();
      unsubscribeVendors();
      unsubscribeSessions();
    };
  }, [isMonitoring, subscribeToSales, subscribeToVendorStats, subscribeToActiveSessions]);

  // Demander permission notifications
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  // 🔧 Fonction pour filtrer les ventes de test (8h48-8h50 le 3 novembre 2025)
  const filterTestSales = (sales: any[]) => {
    // Date fixe: 3 novembre 2025, entre 8h48 et 8h51
    const testDate = new Date('2025-11-03T08:48:00');
    const testStartTime = testDate.getTime();
    const testEndTime = new Date('2025-11-03T08:51:00').getTime();
    
    return sales.filter(sale => {
      const saleTime = new Date(sale.date || sale.created_at).getTime();
      // Exclure les ventes entre 8h48 et 8h51 le 3 novembre 2025
      return !(saleTime >= testStartTime && saleTime <= testEndTime);
    });
  };

  // 🆕 Combiner ventes Caisse LOCALES + Supabase + factures App Facturation (en excluant les tests et doublons)
  const allSalesWithInvoices = React.useMemo(() => {
    const razTimestamp = localStorage.getItem('lastRAZTimestamp');
    const razTime = razTimestamp ? parseInt(razTimestamp) : 0;
    
    console.log('🔄 Monitoring - Recalcul allSalesWithInvoices avec:', {
      localSales: localSales.length,
      recentSales: recentSales.length,
      supabaseInvoices: supabaseInvoices.length,
      razTimestamp: razTime ? new Date(razTime).toLocaleString('fr-FR') : 'Jamais',
      recentSalesToday: recentSales.filter(s => {
        const saleDate = new Date(s.created_at);
        const saleTime = saleDate.getTime();
        const isAfterRAZ = razTime === 0 || saleTime > razTime;
        return isToday(saleDate) && isAfterRAZ && !s.canceled;
      }).length,
      supabaseInvoicesToday: supabaseInvoices.filter(inv => {
        if (inv.status === 'canceled' || inv.canceled === true) return false;
        const invTime = new Date(inv.created_at).getTime();
        const isAfterRAZ = razTime === 0 || invTime > razTime;
        return isToday(inv.created_at) && isAfterRAZ;
      }).length
    });
    
    // Convertir les factures Supabase en format compatible pour affichage (exclure annulées)
    const supabaseAsSales = supabaseInvoices
      .filter(inv => {
        // Exclure les factures annulées
        if (inv.status === 'canceled' || inv.canceled === true) return false;
        // Filtrer par date (aujourd'hui après RAZ)
        const invTime = new Date(inv.created_at).getTime();
        const isAfterRAZ = razTime === 0 || invTime > razTime;
        
        if (!isToday(inv.created_at)) return false;
        if (!isAfterRAZ) return false;
        
        return true;
      })
      .map(inv => {
        const produitsArray = Array.isArray(inv.produits) ? inv.produits : [];
        
        console.log(`✅ Facture Supabase incluse: ${inv.numero_facture} - ${inv.conseiller} - ${inv.montant_ttc}€`);
        
        return {
          id: `supabase-${inv.numero_facture}-${inv.id}`,
          created_at: inv.created_at,
          date: inv.created_at, // Ajouter date pour le filtre
          store_location: 'App Facturation', // Source = App Facturation
          vendor_name: inv.conseiller || 'Non défini',
          items: produitsArray.map((p: any) => ({
            name: p.nom || p.name || 'Produit',
            quantity: p.quantite || p.quantity || 1
          })),
          payment_method: inv.payment_method || 'card',
          total_amount: inv.montant_ttc || 0,
          canceled: false
        };
      });
    
    console.log(`📊 Monitoring - Factures Supabase converties en ventes: ${supabaseAsSales.length} factures`);
    
    // 🔧 Filtrer les ventes synchronisées (recentSales) par date et RAZ
    const recentSalesFiltered = recentSales.filter(sale => {
      const saleDate = new Date(sale.created_at);
      const saleTime = saleDate.getTime();
      const isAfterRAZ = razTime === 0 || saleTime > razTime;
      const isTodaySale = isToday(saleDate);
      
      if (!isTodaySale) return false;
      if (!isAfterRAZ) return false;
      if (sale.canceled) return false;
      
      return true;
    });
    
    console.log(`📊 Monitoring - Ventes synchronisées filtrées (aujourd'hui après RAZ): ${recentSalesFiltered.length} sur ${recentSales.length}`);
    
    // 🔧 Convertir les ventes locales et DÉDUPLIQUER avec recentSales
    // Les ventes locales synchronisées vers Supabase apparaissent dans recentSales
    // On garde seulement les ventes locales qui ne sont PAS dans recentSales
    const recentSalesIds = new Set(recentSalesFiltered.map(s => s.id));
    
    // 🔍 DEBUG: Log pour vérifier les ventes locales
    console.log('🔍 Monitoring - Ventes locales:', {
      totalLocalSales: localSales.length,
      localSalesToday: localSales.filter(s => {
        const saleDate = new Date(s.date);
        const saleTime = saleDate.getTime();
        const isAfterRAZ = razTime === 0 || saleTime > razTime;
        return isToday(saleDate) && isAfterRAZ && !s.canceled;
      }).length,
      recentSalesCount: recentSalesFiltered.length,
      recentSalesIds: Array.from(recentSalesIds).slice(0, 5)
    });
    
    const localSalesAsRealtime = localSales
      .filter(sale => {
        // Exclure annulées
        if (sale.canceled) {
          console.log(`⚠️ Vente locale ${sale.id} exclue: annulée`);
          return false;
        }
        // Filtrer par date et RAZ
        const saleDate = new Date(sale.date);
        const saleTime = saleDate.getTime();
        const isAfterRAZ = razTime === 0 || saleTime > razTime;
        const isTodaySale = isToday(saleDate);
        
        if (!isTodaySale) return false;
        if (!isAfterRAZ) return false;
        
        // Exclure si déjà dans recentSales (déjà synchronisée)
        if (recentSalesIds.has(sale.id)) {
          console.log(`⚠️ Vente locale ${sale.id} exclue: déjà dans recentSales (synchronisée)`);
          return false;
        }
        console.log(`✅ Vente locale ${sale.id} incluse: ${sale.vendorName} - ${sale.totalAmount}€`);
        return true;
      })
      .map(sale => ({
        id: sale.id,
        created_at: sale.date instanceof Date ? sale.date.toISOString() : new Date(sale.date).toISOString(),
        date: sale.date instanceof Date ? sale.date.toISOString() : new Date(sale.date).toISOString(),
        store_location: 'iPad Caisse', // Source = Caisse locale (pas encore synchronisée)
        vendor_name: sale.vendorName || 'Non défini',
        vendor_id: sale.vendorId || '',
        items: sale.items.map((item: any) => ({
          name: item.name || 'Produit',
          quantity: item.quantity || 1
        })),
        payment_method: sale.paymentMethod || 'card',
        total_amount: sale.totalAmount || 0,
        canceled: false
      }));
    
    console.log('🔍 Monitoring - Ventes locales converties:', {
      localSalesAsRealtime: localSalesAsRealtime.length,
      avecSabrina: localSalesAsRealtime.filter(s => s.vendor_name?.includes('Sabrina')).length,
      montants150: localSalesAsRealtime.filter(s => s.total_amount === 150).length
    });
    
    // Combiner : Ventes locales (non synchronisées) + Ventes Supabase synchronisées + Factures, puis filtrer les tests
    const combined = [...localSalesAsRealtime, ...recentSalesFiltered, ...supabaseAsSales];
    const filtered = filterTestSales(combined);
    
    console.log('🔍 Monitoring - Ventes combinées et filtrées:', {
      localSalesAsRealtime: localSalesAsRealtime.length,
      recentSalesFiltered: recentSalesFiltered.length,
      supabaseAsSales: supabaseAsSales.length,
      combined: combined.length,
      filtered: filtered.length,
      avecSabrina150: filtered.filter(s => s.vendor_name?.includes('Sabrina') && s.total_amount === 150).length
    });
    
    return filtered;
  }, [localSales, recentSales, supabaseInvoices]);

  // Filtrer les ventes par magasin sélectionné et par onglet
  const filteredSales = allSalesWithInvoices.filter(sale => {
    // Filtre par magasin
    if (selectedStore && sale.store_location !== selectedStore) {
      return false;
    }
    
    // Filtre par onglet
    if (activeTab === 'today') {
      const isSaleToday = isToday(sale.created_at || sale.date);
      if (!isSaleToday && sale.vendor_name?.includes('Sabrina') && sale.total_amount === 150) {
        console.log(`⚠️ Vente Sabrina 150€ exclue par filtre today:`, {
          created_at: sale.created_at,
          date: sale.date,
          isToday: isSaleToday
        });
      }
      return isSaleToday;
    } else if (activeTab === 'history') {
      return !isToday(sale.created_at || sale.date);
    }
    
    return true;
  });
  
  // 🔍 DEBUG: Log des ventes filtrées
  React.useEffect(() => {
    console.log('🔍 Monitoring - Ventes filtrées:', {
      activeTab,
      selectedStore,
      filteredSalesCount: filteredSales.length,
      avecSabrina: filteredSales.filter(s => s.vendor_name?.includes('Sabrina')).length,
      montants150: filteredSales.filter(s => s.total_amount === 150).length,
      sabrina150: filteredSales.filter(s => s.vendor_name?.includes('Sabrina') && s.total_amount === 150)
    });
  }, [filteredSales, activeTab, selectedStore]);

  // Filtrer les stats vendeurs pour ne garder que le store actif (le plus récent avec ventes > 0)
  const activeStoreLocation = vendorStats
    .filter(stat => stat.daily_sales > 0 || stat.total_sales > 0)
    .sort((a, b) => b.total_sales - a.total_sales)[0]?.store_location;
  
  const _filteredVendorStats = vendorStats.filter(stat => {
    // Garder uniquement les stats du store actif
    if (activeStoreLocation) {
      return stat.store_location === activeStoreLocation;
    }
    // Si aucun store actif, garder les stats avec des ventes > 0
    return stat.daily_sales > 0 || stat.total_sales > 0;
  });

  // Calculer les totaux
  const totalCA = filteredSales.reduce((sum, sale) => sum + (sale.canceled ? 0 : sale.total_amount), 0);
  const totalSales = filteredSales.filter(sale => !sale.canceled).length;
  const totalCanceled = filteredSales.filter(sale => sale.canceled).length;

  // Liste unique des magasins (filtrée pour n'afficher que le store actif)
  const storeLocations = Array.from(new Set([
    ...allSalesWithInvoices.map(s => s.store_location).filter(Boolean),
    ...activeSessions.map(s => s.store_location).filter(Boolean)
  ])).filter(store => !activeStoreLocation || store === activeStoreLocation) as string[];

  return (
    <div style={{
      padding: '20px',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      backgroundColor: '#f5f5f5',
      minHeight: '100vh',
      height: '100vh',
      overflowY: 'auto',
      WebkitOverflowScrolling: 'touch'
    }}>
      {/* Header */}
      <div style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        padding: '24px',
        marginBottom: '20px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '28px', color: '#333' }}>
              📡 Monitoring Temps Réel
            </h1>
            <p style={{ margin: '8px 0 0', color: '#666' }}>
              Suivez les ventes de tous vos magasins en direct
            </p>
          </div>

          {/* Indicateur de statut */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            backgroundColor: syncStatus.isOnline ? '#e8f5e9' : '#ffebee',
            padding: '12px 20px',
            borderRadius: '8px',
            border: `2px solid ${syncStatus.isOnline ? '#4caf50' : '#f44336'}`
          }}>
            {syncStatus.isOnline ? (
              <>
                <Wifi size={24} color="#4caf50" />
                <div>
                  <div style={{ fontWeight: 'bold', color: '#4caf50' }}>En ligne</div>
                  {syncStatus.lastSync && (
                    <div style={{ fontSize: '12px', color: '#666' }}>
                      Dernière sync: {new Date(syncStatus.lastSync).toLocaleTimeString()}
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
                <WifiOff size={24} color="#f44336" />
                <div>
                  <div style={{ fontWeight: 'bold', color: '#f44336' }}>Hors ligne</div>
                  {syncStatus.error && (
                    <div style={{ fontSize: '12px', color: '#666' }}>{syncStatus.error}</div>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Boutons de contrôle */}
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            {/* Indicateur de dernière actualisation */}
            {activeTab === 'today' && (
              <div style={{ fontSize: '12px', color: '#666', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Clock size={14} />
                Dernière MAJ: {lastRefresh.toLocaleTimeString()}
              </div>
            )}
            
            {/* Bouton monitoring */}
            <button
              onClick={() => setIsMonitoring(!isMonitoring)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '12px 24px',
                backgroundColor: isMonitoring ? '#4caf50' : '#9e9e9e',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: 'bold',
                fontSize: '14px'
              }}
            >
              {isMonitoring ? <Eye size={20} /> : <EyeOff size={20} />}
              {isMonitoring ? 'Monitoring actif' : 'Monitoring pausé'}
            </button>
          </div>
        </div>
      </div>

      {/* Onglets et filtres */}
      <div style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        padding: '16px',
        marginBottom: '20px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
      }}>
        {/* Onglets */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
          <button
            onClick={() => setActiveTab('today')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '12px 20px',
              backgroundColor: activeTab === 'today' ? '#477A0C' : '#e0e0e0',
              color: activeTab === 'today' ? 'white' : '#333',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: 'bold',
              fontSize: '14px'
            }}
          >
            <Calendar size={16} />
            Aujourd'hui
            {activeTab === 'today' && (
              <div style={{ fontSize: '10px', opacity: 0.8 }}>
                (Auto-refresh 20s)
              </div>
            )}
          </button>
          <button
            onClick={() => setActiveTab('history')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '12px 20px',
              backgroundColor: activeTab === 'history' ? '#477A0C' : '#e0e0e0',
              color: activeTab === 'history' ? 'white' : '#333',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: 'bold',
              fontSize: '14px'
            }}
          >
            <Clock size={16} />
            Antériorité
          </button>
          <button
            onClick={() => setActiveTab('commissions')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '12px 20px',
              backgroundColor: activeTab === 'commissions' ? '#477A0C' : '#e0e0e0',
              color: activeTab === 'commissions' ? 'white' : '#666',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: 'bold',
              fontSize: '14px'
            }}
          >
            <DollarSign size={16} />
            💰 Commissions
          </button>
          <button
            onClick={() => setActiveTab('products')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '12px 20px',
              backgroundColor: activeTab === 'products' ? '#F55D3E' : '#e0e0e0',
              color: activeTab === 'products' ? 'white' : '#333',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: 'bold',
              fontSize: '14px'
            }}
          >
            <Package size={16} />
            📦 Produits Vendus
          </button>
        </div>

        {/* Filtre magasins */}
        {storeLocations.length > 1 && (
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ fontWeight: 'bold', color: '#666' }}>Filtrer par magasin:</span>
            <button
              onClick={() => setSelectedStore(null)}
              style={{
                padding: '8px 16px',
                backgroundColor: !selectedStore ? '#4caf50' : '#e0e0e0',
                color: !selectedStore ? 'white' : '#666',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: 'bold'
              }}
            >
              Tous
            </button>
            {storeLocations.map(store => (
              <button
                key={store}
                onClick={() => setSelectedStore(store)}
                style={{
                  padding: '8px 16px',
                  backgroundColor: selectedStore === store ? '#4caf50' : '#e0e0e0',
                  color: selectedStore === store ? 'white' : '#666',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer'
                }}
              >
                {store}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* KPIs - Masqués dans les onglets Commissions et Produits */}
      {activeTab !== 'commissions' && activeTab !== 'products' && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: '20px',
          marginBottom: '20px'
        }}>
        {/* CA Total */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          padding: '24px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          borderLeft: '4px solid #4caf50'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
            <TrendingUp size={24} color="#4caf50" />
            <span style={{ color: '#666', fontSize: '14px' }}>CA Total</span>
          </div>
          <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#333' }}>
            {totalCA.toFixed(2)}€
          </div>
        </div>

        {/* Ventes */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          padding: '24px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          borderLeft: '4px solid #2196f3'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
            <ShoppingCart size={24} color="#2196f3" />
            <span style={{ color: '#666', fontSize: '14px' }}>Ventes</span>
          </div>
          <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#333' }}>
            {totalSales}
          </div>
        </div>

        {/* Sessions actives */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          padding: '24px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          borderLeft: '4px solid #ff9800'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
            <Activity size={24} color="#ff9800" />
            <span style={{ color: '#666', fontSize: '14px' }}>Sessions actives</span>
          </div>
          <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#333' }}>
            {activeSessions.length}
          </div>
        </div>

        {/* Annulations */}
        {totalCanceled > 0 && (
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            padding: '24px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            borderLeft: '4px solid #f44336'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
              <AlertCircle size={24} color="#f44336" />
              <span style={{ color: '#666', fontSize: '14px' }}>Annulations</span>
            </div>
            <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#333' }}>
              {totalCanceled}
            </div>
          </div>
        )}
        </div>
      )}

      {/* Sessions actives */}
      {activeSessions.length > 0 && (
        <div style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          padding: '24px',
          marginBottom: '20px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
        }}>
          <h2 style={{ margin: '0 0 16px', fontSize: '20px', color: '#333', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Users size={24} />
            Sessions actives
          </h2>
          <div style={{ display: 'grid', gap: '12px' }}>
            {activeSessions.map(session => (
              <div key={session.session_id} style={{
                padding: '16px',
                backgroundColor: '#f5f5f5',
                borderRadius: '8px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <div>
                  <div style={{ fontWeight: 'bold', color: '#333' }}>
                    {session.vendor_name || 'Aucun vendeur connecté'}
                  </div>
                  <div style={{ fontSize: '14px', color: '#666', marginTop: '4px' }}>
                    📍 {session.store_location} • CA: {session.current_ca.toFixed(2)}€
                  </div>
                </div>
                <div style={{ fontSize: '12px', color: '#999' }}>
                  Dernière activité: {new Date(session.last_activity).toLocaleTimeString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Onglet Commissions */}
      {activeTab === 'commissions' ? (
        <div style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          padding: '24px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
        }}>
          <VendorCommissionTables
            vendors={vendors}
            sales={localSales}
            supabaseInvoices={supabaseInvoices}
            sessionStart={currentSession?.eventStart || currentSession?.openedAt}
            sessionEnd={currentSession?.eventEnd}
            sessionName={currentSession?.eventName || 'Session en cours'}
          />
        </div>
      ) : activeTab === 'products' ? (
        // Onglet Produits Vendus
        <div>
          {/* Top Produits du Jour */}
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            padding: '24px',
            marginBottom: '20px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
          }}>
            <h2 style={{ 
              margin: '0 0 20px', 
              fontSize: '24px', 
              color: '#333',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              borderBottom: '3px solid #F55D3E',
              paddingBottom: '12px'
            }}>
              <Package size={28} color="#F55D3E" />
              📦 Top Produits du Jour
              <span style={{ fontSize: '14px', color: '#666', fontWeight: 'normal' }}>
                (depuis dernière RAZ)
              </span>
              {excludedDay > 0 && (
                <span style={{ 
                  marginLeft: 'auto',
                  fontSize: '13px', 
                  color: '#f44336',
                  fontWeight: 'normal',
                  backgroundColor: '#ffebee',
                  padding: '6px 12px',
                  borderRadius: '6px',
                  border: '1px solid #f44336'
                }}>
                  ⚠️ {excludedDay} produit{excludedDay > 1 ? 's' : ''} exclu{excludedDay > 1 ? 's' : ''} (CA = 0€)
                </span>
              )}
            </h2>
            
            {productStatsDay.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
                Aucun produit vendu aujourd'hui
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f5f5f5', borderBottom: '2px solid #477A0C' }}>
                      <th style={{ padding: '12px', textAlign: 'left', fontWeight: 'bold', color: '#333' }}>Rang</th>
                      <th style={{ padding: '12px', textAlign: 'left', fontWeight: 'bold', color: '#333' }}>Produit</th>
                      <th style={{ padding: '12px', textAlign: 'right', fontWeight: 'bold', color: '#333' }}>Qté vendue</th>
                      <th style={{ padding: '12px', textAlign: 'right', fontWeight: 'bold', color: '#333' }}>CA généré</th>
                      <th style={{ padding: '12px', textAlign: 'right', fontWeight: 'bold', color: '#333' }}>Prix unitaire</th>
                      <th style={{ padding: '12px', textAlign: 'right', fontWeight: 'bold', color: '#333' }}>Nb ventes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {productStatsDay.slice(0, 20).map((product, index) => (
                      <tr key={product.name} style={{ 
                        borderBottom: '1px solid #e0e0e0',
                        backgroundColor: index < 3 ? '#f0f8f0' : 'white'
                      }}>
                        <td style={{ padding: '12px', fontWeight: 'bold', color: '#333' }}>
                          {index === 0 && '🥇'}
                          {index === 1 && '🥈'}
                          {index === 2 && '🥉'}
                          {index > 2 && `${index + 1}`}
                        </td>
                        <td style={{ padding: '12px', fontWeight: index < 3 ? 'bold' : 'normal', color: '#333' }}>
                          {product.name}
                        </td>
                        <td style={{ padding: '12px', textAlign: 'right', fontWeight: 'bold', color: '#333' }}>
                          {product.quantity}
                        </td>
                        <td style={{ padding: '12px', textAlign: 'right', fontWeight: 'bold', color: '#333' }}>
                          {product.revenue.toFixed(2)} €
                        </td>
                        <td style={{ 
                          padding: '12px', 
                          textAlign: 'right',
                          color: product.isFree ? '#4caf50' : (product.hasDiscount ? '#f44336' : '#333'),
                          fontWeight: product.hasDiscount || product.isFree ? 'bold' : 'normal'
                        }}>
                          {product.isFree ? (
                            <span style={{ 
                              backgroundColor: '#e8f5e9', 
                              padding: '4px 8px', 
                              borderRadius: '4px',
                              border: '1px solid #4caf50'
                            }}>
                              🎁 Offert
                            </span>
                          ) : (
                            <>
                              {product.unitPrice.toFixed(2)} €
                              {product.hasDiscount && (
                                <span style={{ 
                                  display: 'block', 
                                  fontSize: '11px', 
                                  color: '#f44336',
                                  marginTop: '2px'
                                }}>
                                  (vendu {product.actualPrice.toFixed(2)}€)
                                </span>
                              )}
                            </>
                          )}
                        </td>
                        <td style={{ padding: '12px', textAlign: 'right', color: '#666' }}>
                          {product.salesCount}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Produits de la Session - Groupés par Catégorie */}
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            padding: '24px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
          }}>
            <h2 style={{ 
              margin: '0 0 20px', 
              fontSize: '24px', 
              color: '#333',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              borderBottom: '3px solid #477A0C',
              paddingBottom: '12px'
            }}>
              <TrendingUp size={28} color="#477A0C" />
              📈 Produits de la Session - {currentSession?.eventName || 'Session en cours'}
              <span style={{ 
                marginLeft: 'auto', 
                fontSize: '16px', 
                fontWeight: 'bold',
                color: '#477A0C' 
              }}>
                Total: {totalSessionQty} produits
              </span>
            </h2>
            
            {productsByCategorySession.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
                Aucun produit vendu dans cette session
              </div>
            ) : (
              <div>
                {productsByCategorySession.map((categoryGroup) => {
                  const isExpanded = expandedCategoriesSession.has(categoryGroup.category);
                  return (
                    <div key={categoryGroup.category} style={{ marginBottom: '12px' }}>
                      {/* En-tête catégorie cliquable */}
                      <button
                        onClick={() => toggleCategorySession(categoryGroup.category)}
                        style={{
                          width: '100%',
                          padding: '14px 18px',
                          backgroundColor: isExpanded ? '#477A0C' : '#f0f8f0',
                          color: isExpanded ? 'white' : '#333',
                          border: `2px solid #477A0C`,
                          borderRadius: '8px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          fontWeight: 'bold',
                          fontSize: '16px',
                          transition: 'all 0.2s'
                        }}
                      >
                        <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          {isExpanded ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                          📦 {categoryGroup.category}
                        </span>
                        <span>{categoryGroup.totalQuantity} produits ({((categoryGroup.totalQuantity / totalSessionQty) * 100).toFixed(1)}%)</span>
                      </button>
                      
                      {/* Liste des produits (visible si déployé) */}
                      {isExpanded && (
                        <div style={{ 
                          marginTop: '8px', 
                          padding: '16px', 
                          backgroundColor: '#fafafa',
                          borderRadius: '6px',
                          border: '1px solid #e0e0e0'
                        }}>
                          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                              <tr style={{ backgroundColor: '#f5f5f5', borderBottom: '2px solid #477A0C' }}>
                                <th style={{ padding: '10px', textAlign: 'left', fontWeight: 'bold', color: '#333', fontSize: '13px' }}>Produit</th>
                                <th style={{ padding: '10px', textAlign: 'right', fontWeight: 'bold', color: '#333', fontSize: '13px' }}>Quantité</th>
                                <th style={{ padding: '10px', textAlign: 'right', fontWeight: 'bold', color: '#333', fontSize: '13px' }}>CA</th>
                                <th style={{ padding: '10px', textAlign: 'right', fontWeight: 'bold', color: '#333', fontSize: '13px' }}>Prix</th>
                              </tr>
                            </thead>
                            <tbody>
                              {categoryGroup.products.map((product, idx) => (
                                <tr key={idx} style={{ 
                                  borderBottom: '1px solid #e5e5e5',
                                  backgroundColor: 'white'
                                }}>
                                  <td style={{ padding: '10px', fontSize: '14px' }}>{product.name}</td>
                                  <td style={{ padding: '10px', textAlign: 'right', fontWeight: 'bold', fontSize: '14px' }}>{product.quantity}</td>
                                  <td style={{ padding: '10px', textAlign: 'right', fontWeight: 'bold', fontSize: '14px', color: '#477A0C' }}>{product.revenue.toFixed(2)} €</td>
                                  <td style={{ padding: '10px', textAlign: 'right', fontSize: '14px' }}>
                                    {product.isFree ? (
                                      <span style={{ 
                                        backgroundColor: '#e8f5e9', 
                                        padding: '4px 8px', 
                                        borderRadius: '4px',
                                        border: '1px solid #4caf50',
                                        fontSize: '12px'
                                      }}>
                                        🎁 Offert
                                      </span>
                                    ) : (
                                      <>
                                        {product.unitPrice.toFixed(2)} €
                                        {product.hasDiscount && (
                                          <span style={{ 
                                            display: 'block', 
                                            fontSize: '11px', 
                                            color: '#f44336',
                                            marginTop: '2px'
                                          }}>
                                            (vendu {product.actualPrice.toFixed(2)}€)
                                          </span>
                                        )}
                                      </>
                                    )}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      ) : (
        <>
          {/* Ventes récentes */}
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            padding: '24px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
          }}>
            <h2 style={{ margin: '0 0 16px', fontSize: '20px', color: '#333', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ShoppingCart size={24} />
              {activeTab === 'today' ? 'Ventes d\'aujourd\'hui' : 'Ventes antérieures'} 
              {filteredSales.length > 0 && ` (${filteredSales.length})`}
              {activeTab === 'today' && (
                <span style={{ fontSize: '12px', color: '#666', marginLeft: '8px' }}>
                  🔄 Actualisation automatique
                </span>
              )}
            </h2>
        
        {filteredSales.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
            {activeTab === 'today' 
              ? 'Aucune vente aujourd\'hui pour le moment' 
              : 'Aucune vente antérieure trouvée'
            }
          </div>
        ) : (
          <div style={{ maxHeight: '600px', overflowY: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: '#f5f5f5', borderBottom: '2px solid #e0e0e0' }}>
                  <th style={{ padding: '12px', textAlign: 'left' }}>Date/Heure</th>
                  <th style={{ padding: '12px', textAlign: 'left' }}>Magasin</th>
                  <th style={{ padding: '12px', textAlign: 'left' }}>Vendeur</th>
                  <th style={{ padding: '12px', textAlign: 'left' }}>Produits</th>
                  <th style={{ padding: '12px', textAlign: 'left' }}>Paiement</th>
                  <th style={{ padding: '12px', textAlign: 'right' }}>Montant</th>
                  <th style={{ padding: '12px', textAlign: 'center' }}>Statut</th>
                </tr>
              </thead>
              <tbody>
                {filteredSales.map(sale => (
                  <tr key={sale.id} style={{
                    borderBottom: '1px solid #e0e0e0',
                    backgroundColor: sale.canceled ? '#ffebee' : 'white',
                    opacity: sale.canceled ? 0.7 : 1
                  }}>
                    <td style={{ padding: '12px' }}>
                      {new Date(sale.created_at).toLocaleString('fr-FR', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </td>
                    <td style={{ padding: '12px', fontSize: '12px', color: '#666' }}>
                      {sale.store_location || 'N/A'}
                    </td>
                    <td style={{ padding: '12px', fontWeight: 'bold' }}>
                      {sale.vendor_name}
                    </td>
                    <td style={{ padding: '12px' }}>
                      <div style={{ fontSize: '14px' }}>
                        {sale.items.slice(0, 2).map((item, idx) => (
                          <div key={idx} style={{ color: '#666' }}>
                            {item.quantity}x {item.name}
                          </div>
                        ))}
                        {sale.items.length > 2 && (
                          <div style={{ fontSize: '12px', color: '#999' }}>
                            +{sale.items.length - 2} autre(s)
                          </div>
                        )}
                      </div>
                    </td>
                    <td style={{ padding: '12px', fontSize: '14px', color: '#666' }}>
                      {sale.payment_method === 'cash' && '💵 Espèces'}
                      {sale.payment_method === 'card' && '💳 Carte'}
                      {sale.payment_method === 'check' && '📝 Chèque'}
                      {sale.payment_method === 'multi' && '🔀 Multi'}
                    </td>
                    <td style={{ padding: '12px', textAlign: 'right', fontWeight: 'bold', fontSize: '16px' }}>
                      {sale.total_amount.toFixed(2)}€
                    </td>
                    <td style={{ padding: '12px', textAlign: 'center' }}>
                      {sale.canceled ? (
                        <span style={{
                          backgroundColor: '#f44336',
                          color: 'white',
                          padding: '4px 12px',
                          borderRadius: '12px',
                          fontSize: '12px',
                          fontWeight: 'bold'
                        }}>
                          ANNULÉE
                        </span>
                      ) : (
                        <span style={{
                          backgroundColor: '#4caf50',
                          color: 'white',
                          padding: '4px 12px',
                          borderRadius: '12px',
                          fontSize: '12px',
                          fontWeight: 'bold'
                        }}>
                          VALIDÉE
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Stats vendeurs - MASQUÉ (données dans onglet Commissions) */}
      {/* Section supprimée car redondante avec l'onglet Commissions */}
        </>
      )}
    </div>
  );
}

