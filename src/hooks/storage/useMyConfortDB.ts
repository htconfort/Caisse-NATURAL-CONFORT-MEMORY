// src/hooks/storage/useMyConfortDB.ts
// Hook métier spécialisé pour les données MyConfort
import { useCallback, useState, useEffect } from 'react';
import { db, saleToSaleDB, saleDBToSale, cartItemToCartItemDB } from '@/db';
import type { 
  Sale, 
  Vendor, 
  VendorDB,
  StockDB,
  StockMovement,
  ProductCategory,
  PaymentMethod,
  SalesStats 
} from '../../types';

/**
 * Hook métier pour les opérations MyConfort
 * Fournit une interface haut niveau pour toutes vos données métier
 */
export function useMyConfortDB() {
  const [isReady, setIsReady] = useState(false);

  // ============================================================================
  // 🔧 UTILITAIRES INTERNES
  // ============================================================================
  
  const createEmptyPaymentMethodBreakdown = (): Record<PaymentMethod, number> => ({
    cash: 0,
    card: 0,
    check: 0,
    multi: 0
  });
  
  const createEmptyCategoryBreakdown = (): Record<ProductCategory, number> => ({
    'Matelas': 0,
    'Sur-matelas': 0,
    'Couettes': 0,
    'Oreillers': 0,
    'Plateau': 0,
    'Accessoires': 0
  });

  // ============================================================================
  // 🚀 INITIALISATION
  // ============================================================================
  
  useEffect(() => {
    const initDB = async () => {
      try {
        // Attendre que la DB soit prête (Dexie v4)
        await db.open();
        setIsReady(true);
        console.log('✅ MyConfort DB prête');
      } catch (error) {
        console.error('❌ Erreur initialisation DB:', error);
      }
    };
    
    initDB();
  }, []);

  // ============================================================================
  // 🛒 GESTION DES VENTES
  // ============================================================================

  const addSale = useCallback(async (sale: Sale): Promise<string> => {
    try {
      const saleDB = saleToSaleDB(sale);
      await db.sales.add(saleDB);
      
      // Ajouter les items du panier avec référence à la vente
      if (sale.items.length > 0) {
        const cartItemsDB = sale.items.map(item => 
          cartItemToCartItemDB(item, sale.id)
        );
        await db.cartItems.bulkAdd(cartItemsDB);
      }
      
      // Mise à jour automatique des stats vendeur
      await db.updateVendorStats(sale.vendorId);
      
      // Créer des mouvements de stock pour chaque produit vendu
      for (const item of sale.items) {
        const movement: Omit<StockMovement, 'id'> = {
          productId: item.id,
          type: 'sale',
          quantity: -item.quantity, // Négatif = sortie de stock
          reason: `Vente ${sale.id}`,
          vendorId: sale.vendorId,
          saleId: sale.id,
          timestamp: Date.now(),
          metadata: {
            productName: item.name,
            unitPrice: item.price
          }
        };
        
        await db.stockMovements.add(movement);
      }
      
      console.log(`✅ Vente ajoutée: ${sale.id} (${sale.totalAmount}€)`);
      return sale.id;
      
    } catch (error) {
      console.error('❌ Erreur ajout vente:', error);
      throw error;
    }
  }, []);

  const getSales = useCallback(async (): Promise<Sale[]> => {
    try {
      const salesDB = await db.sales.orderBy('date').reverse().toArray();
      return salesDB.map(saleDBToSale);
    } catch (error) {
      console.error('❌ Erreur récupération ventes:', error);
      return [];
    }
  }, []);

  const getVendorSales = useCallback(async (vendorId: string, startDate?: Date, endDate?: Date): Promise<Sale[]> => {
    try {
      const salesDB = await db.getVendorSales(vendorId, startDate, endDate);
      return salesDB.map(saleDBToSale);
    } catch (error) {
      console.error(`❌ Erreur ventes vendeur ${vendorId}:`, error);
      return [];
    }
  }, []);

  const cancelSale = useCallback(async (saleId: string): Promise<void> => {
    try {
      const saleDB = await db.sales.where('saleId').equals(saleId).first();
      if (!saleDB) {
        throw new Error(`Vente ${saleId} non trouvée`);
      }

      // Marquer comme annulée
      await db.sales.update(saleDB.id!, { canceled: true });
      
      // Recalculer les stats vendeur
      await db.updateVendorStats(saleDB.vendorId);
      
      console.log(`✅ Vente annulée: ${saleId}`);
      
    } catch (error) {
      console.error(`❌ Erreur annulation vente ${saleId}:`, error);
      throw error;
    }
  }, []);

  // ============================================================================
  // 👥 GESTION DES VENDEURS
  // ============================================================================

  const addVendor = useCallback(async (vendor: Vendor): Promise<void> => {
    try {
      const vendorDB: VendorDB = {
        ...vendor,
        salesCount: 0,
        averageTicket: 0,
        lastUpdate: Date.now()
      };
      
      await db.vendors.add(vendorDB);
      console.log(`✅ Vendeur ajouté: ${vendor.name}`);
      
    } catch (error) {
      console.error('❌ Erreur ajout vendeur:', error);
      throw error;
    }
  }, []);

  const getVendors = useCallback(async (): Promise<Vendor[]> => {
    try {
      const vendorsDB = await db.vendors.toArray();
      
      // Conversion VendorDB → Vendor (retirer les champs étendus)
      return vendorsDB.map(vendorDB => ({
        id: vendorDB.id,
        name: vendorDB.name,
        dailySales: vendorDB.dailySales,
        totalSales: vendorDB.totalSales,
        color: vendorDB.color
      }));
      
    } catch (error) {
      console.error('❌ Erreur récupération vendeurs:', error);
      return [];
    }
  }, []);

  const updateVendorStats = useCallback(async (vendorId: string): Promise<void> => {
    try {
      await db.updateVendorStats(vendorId);
    } catch (error) {
      console.error(`❌ Erreur mise à jour stats vendeur ${vendorId}:`, error);
    }
  }, []);

  // ============================================================================
  // 📦 GESTION DU STOCK
  // ============================================================================

  const getStock = useCallback(async (): Promise<StockDB[]> => {
    try {
      return await db.stock.toArray();
    } catch (error) {
      console.error('❌ Erreur récupération stock:', error);
      return [];
    }
  }, []);

  const updateStock = useCallback(async (
    productId: string, 
    physicalStock?: number, 
    generalStock?: number,
    reason: string = 'Mise à jour manuelle'
  ): Promise<void> => {
    try {
      const updates: Partial<StockDB> = {
        lastUpdate: Date.now()
      };
      
      if (physicalStock !== undefined) {
        updates.physicalStock = physicalStock;
        
        // Créer un mouvement de stock pour traçabilité
        const movement: Omit<StockMovement, 'id'> = {
          productId,
          type: 'adjustment',
          quantity: physicalStock, // Note: ici c'est la nouvelle quantité, pas le delta
          reason,
          timestamp: Date.now()
        };
        
        await db.stockMovements.add(movement);
      }
      
      if (generalStock !== undefined) {
        updates.generalStock = generalStock;
      }
      
      await db.stock.update(productId, updates);
      console.log(`✅ Stock mis à jour: ${productId}`);
      
    } catch (error) {
      console.error(`❌ Erreur mise à jour stock ${productId}:`, error);
      throw error;
    }
  }, []);

  const getStockMovements = useCallback(async (productId?: string): Promise<StockMovement[]> => {
    try {
      if (productId) {
        return await db.stockMovements
          .where('productId').equals(productId)
          .reverse()
          .sortBy('timestamp');
      } else {
        return await db.stockMovements
          .orderBy('timestamp')
          .reverse()
          .toArray();
      }
    } catch (error) {
      console.error('❌ Erreur récupération mouvements stock:', error);
      return [];
    }
  }, []);

  // ============================================================================
  // 📊 ANALYTICS & RAPPORTS
  // ============================================================================

  const getDailyStats = useCallback(async (date: Date = new Date()): Promise<SalesStats> => {
    try {
      const dailySales = await db.getDailySales(date);
      
      const totalSales = dailySales.length;
      const totalAmount = dailySales.reduce((sum, sale) => sum + sale.totalAmount, 0);
      const averageTransaction = totalSales > 0 ? totalAmount / totalSales : 0;
      
      // Statistiques par vendeur
      const vendorStats = new Map<string, number>();
      dailySales.forEach(sale => {
        vendorStats.set(sale.vendorName, (vendorStats.get(sale.vendorName) || 0) + sale.totalAmount);
      });
      
      const topVendor = Array.from(vendorStats.entries())
        .sort(([,a], [,b]) => b - a)[0]?.[0] || 'Aucun';
      
      // Statistiques par moyen de paiement
      const paymentMethodBreakdown = createEmptyPaymentMethodBreakdown();
      dailySales.forEach(sale => {
        paymentMethodBreakdown[sale.paymentMethod as PaymentMethod] = 
          (paymentMethodBreakdown[sale.paymentMethod as PaymentMethod] || 0) + sale.totalAmount;
      });
      
      // Récupérer tous les items pour les stats produits
      const allItems = await Promise.all(
        dailySales.map(sale => 
          db.cartItems.where('saleId').equals(sale.saleId).toArray()
        )
      );
      
      const flatItems = allItems.flat();
      const productStats = new Map<string, number>();
      const categoryBreakdown = createEmptyCategoryBreakdown();
      
      flatItems.forEach(item => {
        productStats.set(item.name, (productStats.get(item.name) || 0) + (item.price * item.quantity));
        categoryBreakdown[item.category as ProductCategory] = 
          (categoryBreakdown[item.category as ProductCategory] || 0) + (item.price * item.quantity);
      });
      
      const topProduct = Array.from(productStats.entries())
        .sort(([,a], [,b]) => b - a)[0]?.[0] || 'Aucun';
      
      return {
        totalSales,
        totalAmount,
        averageTransaction,
        topVendor,
        topProduct,
        paymentMethodBreakdown,
        categoryBreakdown,
        dailyTrend: [{
          date: date.toISOString().split('T')[0],
          sales: totalSales,
          amount: totalAmount
        }]
      };
      
    } catch (error) {
      console.error('❌ Erreur calcul stats journalières:', error);
      return {
        totalSales: 0,
        totalAmount: 0,
        averageTransaction: 0,
        topVendor: 'Erreur',
        topProduct: 'Erreur',
        paymentMethodBreakdown: createEmptyPaymentMethodBreakdown(),
        categoryBreakdown: createEmptyCategoryBreakdown(),
        dailyTrend: []
      };
    }
  }, []);

  const getTopProducts = useCallback(async (
    category?: ProductCategory, 
    limit: number = 10
  ): Promise<Array<{productName: string, totalSold: number, revenue: number}>> => {
    try {
      if (category) {
        return await db.getTopProductsByCategory(category, limit);
      } else {
        // Top produits toutes catégories
        const allItems = await db.cartItems.toArray();
        const productStats = new Map<string, {quantity: number, revenue: number}>();
        
        allItems.forEach(item => {
          const current = productStats.get(item.name) || {quantity: 0, revenue: 0};
          current.quantity += item.quantity;
          current.revenue += item.price * item.quantity;
          productStats.set(item.name, current);
        });
        
        return Array.from(productStats.entries())
          .map(([name, stats]) => ({
            productName: name,
            totalSold: stats.quantity,
            revenue: stats.revenue
          }))
          .sort((a, b) => b.totalSold - a.totalSold)
          .slice(0, limit);
      }
    } catch (error) {
      console.error('❌ Erreur récupération top produits:', error);
      return [];
    }
  }, []);

  // ============================================================================
  // 🔄 MIGRATION & MAINTENANCE
  // ============================================================================

  const migrate = useCallback(async (): Promise<void> => {
    try {
      await db.migrateFromLocalStorage();
    } catch (error) {
      console.error('❌ Erreur migration:', error);
      throw error;
    }
  }, []);

  const cleanup = useCallback(async (): Promise<void> => {
    try {
      await db.cleanExpiredCache();
      console.log('✅ Nettoyage terminé');
    } catch (error) {
      console.error('❌ Erreur nettoyage:', error);
    }
  }, []);

  // ============================================================================
  // 📤 INTERFACE PUBLIQUE
  // ============================================================================

  return {
    // État
    isReady,
    
    // Ventes
    addSale,
    getSales,
    getVendorSales,
    cancelSale,
    
    // Vendeurs
    addVendor,
    getVendors,
    updateVendorStats,
    
    // Stock
    getStock,
    updateStock,
    getStockMovements,
    
    // Analytics
    getDailyStats,
    getTopProducts,
    
    // Maintenance
    migrate,
    cleanup
  };
}

export default useMyConfortDB;
