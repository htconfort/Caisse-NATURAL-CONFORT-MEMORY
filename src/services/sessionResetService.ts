// services/sessionResetService.ts
// Service pour la réinitialisation de fin de session
// Supprime tout sauf le stock physique

import { getDB } from '@/db/schema';

export interface SessionResetResult {
  success: boolean;
  message: string;
  details: string[];
  errors?: string[];
}

/**
 * Service de réinitialisation de fin de session
 * Garde uniquement le stock physique, supprime tout le reste
 */
export class SessionResetService {
  
  /**
   * RAZ complète de fin de session - GARDE LE STOCK
   * Supprime :
   * - Toutes les ventes de la session
   * - Tous les items du panier
   * - Les chèques à venir / règlements à venir
   * - Les factures N8N en cache
   * - Les stats de vendeurs (remise à zéro)
   * - Les sessions (fermeture propre)
   * - Le cache système
   * 
   * GARDE :
   * - Le stock physique (quantités)
   * - Les produits du catalogue
   * - La configuration système
   */
  static async executeSessionReset(): Promise<SessionResetResult> {
    const details: string[] = [];
    const errors: string[] = [];
    
    try {
      console.log('🧹 DÉBUT DE LA RAZ DE FIN DE SESSION');
      console.log('📦 Conservation du stock physique uniquement');
      
      const db = getDB();
      
      // 1. Sauvegarder le stock physique avant suppression
      console.log('💾 Sauvegarde du stock physique...');
      const stockSauvegarde = await db.stock.toArray();
      const stockQuantites = stockSauvegarde.reduce((acc, item) => {
        acc[item.id] = {
          physicalStock: item.physicalStock,
          minStock: item.minStock
        };
        return acc;
      }, {} as Record<string, { physicalStock: number; minStock: number }>);
      details.push(`📦 ${stockSauvegarde.length} produits en stock sauvegardés`);
      
      // 2. Fermer la session en cours proprement
      console.log('🔒 Fermeture de la session...');
      try {
        await db.closeSession();
        details.push('✅ Session fermée correctement');
      } catch {
        console.warn('⚠️ Session déjà fermée ou inexistante');
        details.push('⚠️ Aucune session active à fermer');
      }
      
      // 3. Supprimer TOUTES les ventes
      console.log('🗑️ Suppression des ventes...');
      await db.sales.clear();
      details.push(`🗑️ Toutes les ventes supprimées`);
      
      // 4. Supprimer TOUS les items de panier
      console.log('🛒 Suppression des items de panier...');
      await db.cartItems.clear();
      details.push(`🛒 Tous les items de panier supprimés`);
      
      // 5. Remettre à zéro les stats vendeurs (mais garder les vendeurs)
      console.log('👥 RAZ des statistiques vendeurs...');
      const allVendors = await db.vendors.toArray();
      for (const vendor of allVendors) {
        await db.vendors.update(vendor.id, {
          totalSales: 0,
          dailySales: 0,
          salesCount: 0,
          averageTicket: 0,
          lastSaleDate: undefined,
          lastUpdate: Date.now()
        });
      }
      details.push(`👥 ${allVendors.length} vendeurs remis à zéro`);
      
      // 6. Supprimer les mouvements de stock de vente (garder les réapprovisionnements)
      console.log('📦 Nettoyage des mouvements de stock...');
      const deletedMovements = await db.stockMovements
        .where('type')
        .equals('sale')
        .delete();
      details.push(`📦 ${deletedMovements} mouvements de vente supprimés`);
      
      // 7. Supprimer TOUTES les analytics
      console.log('📊 Suppression des analytics...');
      await db.vendorAnalytics.clear();
      await db.productAnalytics.clear();
      details.push('📊 Toutes les analytics supprimées');
      
      // 8. Supprimer TOUTES les sessions (historique complet)
      console.log('🗂️ Suppression de l\'historique des sessions...');
      await db.sessions.clear();
      details.push('🗂️ Historique des sessions supprimé');
      
      // 9. Nettoyer le cache système
      console.log('🧹 Nettoyage du cache...');
      await db.cache.clear();
      details.push('🧹 Cache système vidé');
      
      // 10. Supprimer les factures N8N en cache (chèques à venir inclus)
      console.log('📄 Suppression des factures et chèques à venir...');
      try {
        // Supprimer le cache des factures N8N
        localStorage.removeItem('cachedInvoices');
        localStorage.removeItem('lastSyncTime');
        localStorage.removeItem('processedInvoicesIds');
        
        details.push('📄 Factures N8N et chèques à venir supprimés');
      } catch (error) {
        console.warn('⚠️ Erreur lors du nettoyage des factures:', error);
        errors.push('Erreur partielle lors du nettoyage des factures');
      }
      
      // 11. Nettoyer le localStorage des données de session
      console.log('💾 Nettoyage du localStorage...');
      const keysToRemove = [
        'myconfort-cart',
        'myconfort-sales', 
        'myconfort-current-vendor',
        'current_session_id',
        'lastSyncTime',
        'processedInvoicesIds',
        'stockMovements'
      ];
      
      keysToRemove.forEach(key => {
        localStorage.removeItem(key);
      });
      details.push(`💾 ${keysToRemove.length} clés localStorage nettoyées`);
      
      // 12. Restaurer UNIQUEMENT le stock physique
      console.log('🔄 Restauration du stock physique...');
      let stockRestored = 0;
      for (const [productId, stockData] of Object.entries(stockQuantites)) {
        try {
          await db.stock.update(productId, {
            physicalStock: stockData.physicalStock,
            minStock: stockData.minStock,
            lastUpdate: Date.now()
          });
          stockRestored++;
        } catch (error) {
          console.warn(`⚠️ Impossible de restaurer le stock pour ${productId}:`, error);
        }
      }
      details.push(`🔄 ${stockRestored} produits en stock restaurés`);
      
      console.log('✅ RAZ DE FIN DE SESSION TERMINÉE');
      
      return {
        success: true,
        message: `✅ Réinitialisation de fin de session réussie ! ${stockRestored} produits en stock conservés.`,
        details
      };
      
    } catch (error) {
      console.error('❌ Erreur durant la RAZ de fin de session:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
      errors.push(errorMessage);
      
      return {
        success: false,
        message: '❌ Erreur durant la réinitialisation de fin de session',
        details,
        errors
      };
    }
  }
  
  /**
   * RAZ UNIQUEMENT des chèques à venir / règlements à venir
   * Garde tout le reste (ventes, session, stock)
   */
  static async clearPendingChecksOnly(): Promise<SessionResetResult> {
    const details: string[] = [];
    const errors: string[] = [];
    
    try {
      console.log('🧹 SUPPRESSION DES CHÈQUES À VENIR UNIQUEMENT');
      
      // Supprimer les factures N8N en cache (qui contiennent les chèques à venir)
      localStorage.removeItem('cachedInvoices');
      localStorage.removeItem('lastSyncTime');
      localStorage.removeItem('processedInvoicesIds');
      
      details.push('📄 Chèques à venir et factures N8N supprimés');
      details.push('💰 Ventes de caisse conservées');
      details.push('📦 Stock physique conservé');
      details.push('👥 Statistiques vendeurs conservées');
      
      return {
        success: true,
        message: '✅ Chèques à venir supprimés avec succès',
        details
      };
      
    } catch (error) {
      console.error('❌ Erreur lors de la suppression des chèques à venir:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
      errors.push(errorMessage);
      
      return {
        success: false,
        message: '❌ Erreur lors de la suppression des chèques à venir',
        details,
        errors
      };
    }
  }
  
  /**
   * Vérification de l'état avant RAZ
   * Affiche ce qui sera supprimé et ce qui sera conservé
   */
  static async previewSessionReset(): Promise<{
    toDelete: Record<string, number>;
    toKeep: Record<string, number>;
  }> {
    try {
      const db = getDB();
      
      const [
        salesCount,
        cartItemsCount,
        vendorsCount,
        stockCount,
        movementsCount,
        sessionsCount,
        invoicesCount
      ] = await Promise.all([
        db.sales.count(),
        db.cartItems.count(),
        db.vendors.count(),
        db.stock.count(),
        db.stockMovements.count(),
        db.sessions.count(),
        db.cache.count()
      ]);
      
      // Compter les factures en cache
      const cachedInvoices = localStorage.getItem('cachedInvoices');
      const invoicesCacheCount = cachedInvoices ? JSON.parse(cachedInvoices).length : 0;
      
      return {
        toDelete: {
          'Ventes': salesCount,
          'Items panier': cartItemsCount,
          'Sessions': sessionsCount,
          'Mouvements de stock (ventes)': movementsCount,
          'Cache système': invoicesCount,
          'Factures N8N / Chèques à venir': invoicesCacheCount
        },
        toKeep: {
          'Produits en stock': stockCount,
          'Vendeurs (structure)': vendorsCount,
          'Configuration système': 1
        }
      };
      
    } catch (error) {
      console.error('Erreur lors de la prévisualisation:', error);
      return {
        toDelete: {},
        toKeep: {}
      };
    }
  }
}

export default SessionResetService;
