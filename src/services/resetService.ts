// src/services/resetService.ts
// Service de réinitialisation complète de l'application MyConfort

import { db } from '@/db/schema';
import { vendors, STORAGE_KEYS } from '@/data';

interface ResetOptions {
  /** Supprimer toutes les ventes */
  clearSales?: boolean;
  /** Supprimer les données de stock physique */
  clearStock?: boolean;
  /** Supprimer les factures N8N et chèques à venir */
  clearInvoices?: boolean;
  /** Supprimer les sessions de caisse */
  clearSessions?: boolean;
  /** Supprimer les analytics */
  clearAnalytics?: boolean;
  /** Supprimer le cache */
  clearCache?: boolean;
  /** Réinitialiser les stats des vendeurs */
  resetVendorStats?: boolean;
  /** Supprimer localStorage */
  clearLocalStorage?: boolean;
  /** Supprimer IndexedDB */
  clearIndexedDB?: boolean;
  /** Créer une sauvegarde avant reset */
  createBackup?: boolean;
}

interface ResetResult {
  success: boolean;
  message: string;
  details: string[];
  backupPath?: string;
  errors?: string[];
}

/**
 * Service de réinitialisation complète de MyConfort
 * Permet de remettre à zéro l'application et supprimer l'historique des chèques
 */
export class ResetService {
  
  /**
   * Réinitialisation complète (remise à zéro totale)
   */
  static async fullReset(): Promise<ResetResult> {
    return this.reset({
      clearSales: true,
      clearStock: true,
      clearInvoices: true,
      clearSessions: true,
      clearAnalytics: true,
      clearCache: true,
      resetVendorStats: true,
      clearLocalStorage: true,
      clearIndexedDB: false, // Garde la structure DB
      createBackup: true
    });
  }

  /**
   * Suppression spécifique des chèques à venir
   */
  static async clearPendingChecks(): Promise<ResetResult> {
    return this.reset({
      clearInvoices: true,
      createBackup: true
    });
  }

  /**
   * Réinitialisation des ventes uniquement (garde stock et config)
   */
  static async resetSalesOnly(): Promise<ResetResult> {
    return this.reset({
      clearSales: true,
      clearSessions: true,
      resetVendorStats: true,
      createBackup: true
    });
  }

  /**
   * Méthode principale de réinitialisation
   */
  static async reset(options: ResetOptions = {}): Promise<ResetResult> {
    const details: string[] = [];
    const errors: string[] = [];
    let backupPath: string | undefined;

    try {
      console.log('🔄 Début de la réinitialisation MyConfort...', options);

      // 1. Créer une sauvegarde si demandé
      if (options.createBackup) {
        try {
          backupPath = await this.createBackup();
          details.push(`✅ Sauvegarde créée: ${backupPath}`);
        } catch (error) {
          errors.push(`❌ Erreur sauvegarde: ${error}`);
        }
      }

      // 2. Fermer la session active
      try {
        await db.closeSession();
        details.push('✅ Session fermée');
      } catch {
        // Session peut ne pas être ouverte, ce n'est pas grave
        details.push('ℹ️ Aucune session active à fermer');
      }

      // 3. Supprimer les ventes
      if (options.clearSales) {
        try {
          await db.sales.clear();
          await db.cartItems.clear();
          if (typeof localStorage !== 'undefined') {
            localStorage.removeItem(STORAGE_KEYS.SALES);
            localStorage.removeItem(STORAGE_KEYS.CART);
          }
          details.push('✅ Ventes supprimées');
        } catch (error) {
          errors.push(`❌ Erreur suppression ventes: ${error}`);
        }
      }

      // 4. Supprimer les factures et chèques à venir
      if (options.clearInvoices) {
        try {
          // Supprimer les factures N8N dans localStorage
          if (typeof localStorage !== 'undefined') {
            localStorage.removeItem('myconfort_external_invoices');
            localStorage.removeItem('n8n-webhook-url');
            localStorage.removeItem('invoice-sync-config');
            localStorage.removeItem('invoice-stats');
          }
          details.push('✅ Factures et chèques à venir supprimés');
        } catch (error) {
          errors.push(`❌ Erreur suppression factures: ${error}`);
        }
      }

      // 5. Supprimer le stock physique
      if (options.clearStock) {
        try {
          await db.stock.clear();
          await db.stockMovements.clear();
          if (typeof localStorage !== 'undefined') {
            localStorage.removeItem('physical-stock-quantities');
            localStorage.removeItem('stock-config');
          }
          details.push('✅ Stock physique supprimé');
        } catch (error) {
          errors.push(`❌ Erreur suppression stock: ${error}`);
        }
      }

      // 6. Supprimer les sessions
      if (options.clearSessions) {
        try {
          await db.sessions.clear();
          details.push('✅ Sessions supprimées');
        } catch (error) {
          errors.push(`❌ Erreur suppression sessions: ${error}`);
        }
      }

      // 7. Supprimer les analytics
      if (options.clearAnalytics) {
        try {
          await db.vendorAnalytics.clear();
          await db.productAnalytics.clear();
          details.push('✅ Analytics supprimées');
        } catch (error) {
          errors.push(`❌ Erreur suppression analytics: ${error}`);
        }
      }

      // 8. Supprimer le cache
      if (options.clearCache) {
        try {
          await db.cache.clear();
          details.push('✅ Cache supprimé');
        } catch (error) {
          errors.push(`❌ Erreur suppression cache: ${error}`);
        }
      }

      // 9. Réinitialiser les stats des vendeurs
      if (options.resetVendorStats) {
        try {
          await db.vendors.clear();
          await db.vendors.bulkAdd(vendors.map(v => ({
            ...v,
            totalSales: 0,
            dailySales: 0,
            salesCount: 0,
            averageTicket: 0,
            lastSaleDate: undefined,
            lastUpdate: Date.now()
          })));
          
          if (typeof localStorage !== 'undefined') {
            localStorage.setItem(STORAGE_KEYS.VENDORS_STATS, JSON.stringify({
              version: '1.0',
              timestamp: Date.now(),
              data: vendors
            }));
            localStorage.removeItem(STORAGE_KEYS.VENDOR);
          }
          details.push('✅ Stats vendeurs réinitialisées');
        } catch (error) {
          errors.push(`❌ Erreur reset vendeurs: ${error}`);
        }
      }

      // 10. Supprimer localStorage (optionnel)
      if (options.clearLocalStorage && typeof localStorage !== 'undefined') {
        try {
          // Lister les clés MyConfort
          const keysToRemove = Object.keys(localStorage).filter(key => 
            key.startsWith('myconfort-') || 
            key.startsWith('myconfort_') ||
            key.includes('MyConfort') ||
            key === 'physical-stock-quantities' ||
            key === 'event-history'
          );
          
          keysToRemove.forEach(key => localStorage.removeItem(key));
          details.push(`✅ LocalStorage nettoyé (${keysToRemove.length} clés)`);
        } catch (error) {
          errors.push(`❌ Erreur nettoyage localStorage: ${error}`);
        }
      }

      // 11. Supprimer IndexedDB (optionnel, dangereux)
      if (options.clearIndexedDB) {
        try {
          await db.delete();
          details.push('✅ IndexedDB supprimée');
        } catch (error) {
          errors.push(`❌ Erreur suppression IndexedDB: ${error}`);
        }
      }

      const success = errors.length === 0;
      const message = success 
        ? '🎉 Réinitialisation terminée avec succès'
        : '⚠️ Réinitialisation terminée avec des erreurs';

      console.log(message, { details, errors });

      return {
        success,
        message,
        details,
        backupPath,
        errors: errors.length > 0 ? errors : undefined
      };

    } catch (error) {
      const errorMessage = `❌ Erreur fatale lors de la réinitialisation: ${error}`;
      console.error(errorMessage);
      
      return {
        success: false,
        message: errorMessage,
        details,
        errors: [...errors, errorMessage]
      };
    }
  }

  /**
   * Créer une sauvegarde avant réinitialisation
   */
  private static async createBackup(): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupKey = `myconfort-backup-${timestamp}`;
    
    const backup = {
      timestamp: Date.now(),
      version: '1.0',
      data: {
        sales: await db.sales.toArray(),
        vendors: await db.vendors.toArray(),
        cartItems: await db.cartItems.toArray(),
        stock: await db.stock.toArray(),
        stockMovements: await db.stockMovements.toArray(),
        sessions: await db.sessions.toArray(),
        vendorAnalytics: await db.vendorAnalytics.toArray(),
        productAnalytics: await db.productAnalytics.toArray(),
        settings: await db.settings.toArray(),
        localStorage: typeof localStorage !== 'undefined' 
          ? Object.fromEntries(
              Object.keys(localStorage)
                .filter(key => key.startsWith('myconfort-') || key.startsWith('myconfort_'))
                .map(key => [key, localStorage.getItem(key)])
            )
          : {}
      }
    };

    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(backupKey, JSON.stringify(backup));
    }

    console.log(`💾 Sauvegarde créée: ${backupKey}`);
    return backupKey;
  }

  /**
   * Restaurer depuis une sauvegarde
   */
  static async restoreFromBackup(backupKey: string): Promise<ResetResult> {
    try {
      if (typeof localStorage === 'undefined') {
        throw new Error('localStorage non disponible');
      }

      const backupData = localStorage.getItem(backupKey);
      if (!backupData) {
        throw new Error('Sauvegarde non trouvée');
      }

      const backup = JSON.parse(backupData);
      const { data } = backup;

      // Restaurer IndexedDB
      await db.sales.clear();
      await db.vendors.clear();
      await db.cartItems.clear();
      await db.stock.clear();
      await db.stockMovements.clear();
      await db.sessions.clear();
      await db.vendorAnalytics.clear();
      await db.productAnalytics.clear();
      await db.settings.clear();

      if (data.sales?.length) await db.sales.bulkAdd(data.sales);
      if (data.vendors?.length) await db.vendors.bulkAdd(data.vendors);
      if (data.cartItems?.length) await db.cartItems.bulkAdd(data.cartItems);
      if (data.stock?.length) await db.stock.bulkAdd(data.stock);
      if (data.stockMovements?.length) await db.stockMovements.bulkAdd(data.stockMovements);
      if (data.sessions?.length) await db.sessions.bulkAdd(data.sessions);
      if (data.vendorAnalytics?.length) await db.vendorAnalytics.bulkAdd(data.vendorAnalytics);
      if (data.productAnalytics?.length) await db.productAnalytics.bulkAdd(data.productAnalytics);
      if (data.settings?.length) await db.settings.bulkAdd(data.settings);

      // Restaurer localStorage
      if (data.localStorage) {
        Object.entries(data.localStorage).forEach(([key, value]) => {
          if (value) localStorage.setItem(key, value as string);
        });
      }

      return {
        success: true,
        message: '🎉 Restauration terminée avec succès',
        details: [`✅ Données restaurées depuis ${backupKey}`]
      };

    } catch (error) {
      return {
        success: false,
        message: `❌ Erreur lors de la restauration: ${error}`,
        details: [],
        errors: [String(error)]
      };
    }
  }

  /**
   * Lister les sauvegardes disponibles
   */
  static getAvailableBackups(): Array<{key: string, timestamp: number, date: string}> {
    if (typeof localStorage === 'undefined') return [];

    return Object.keys(localStorage)
      .filter(key => key.startsWith('myconfort-backup-'))
      .map(key => {
        try {
          const backup = JSON.parse(localStorage.getItem(key) || '{}');
          return {
            key,
            timestamp: backup.timestamp || 0,
            date: new Date(backup.timestamp || 0).toLocaleString('fr-FR')
          };
        } catch {
          return null;
        }
      })
      .filter(Boolean)
      .sort((a, b) => (b?.timestamp || 0) - (a?.timestamp || 0)) as Array<{key: string, timestamp: number, date: string}>;
  }

  /**
   * Supprimer une sauvegarde
   */
  static deleteBackup(backupKey: string): boolean {
    if (typeof localStorage === 'undefined') return false;
    
    try {
      localStorage.removeItem(backupKey);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Obtenir les statistiques actuelles avant reset
   */
  static async getCurrentStats(): Promise<{
    sales: number;
    vendors: number;
    cartItems: number;
    stock: number;
    sessions: number;
    invoices: number;
    localStorageKeys: number;
  }> {
    const stats = {
      sales: await db.sales.count(),
      vendors: await db.vendors.count(),
      cartItems: await db.cartItems.count(),
      stock: await db.stock.count(),
      sessions: await db.sessions.count(),
      invoices: 0,
      localStorageKeys: 0
    };

    if (typeof localStorage !== 'undefined') {
      // Compter les factures
      const invoicesData = localStorage.getItem('myconfort_external_invoices');
      if (invoicesData) {
        try {
          const invoices = JSON.parse(invoicesData);
          stats.invoices = Array.isArray(invoices) ? invoices.length : 0;
        } catch {
          // Ignore les erreurs de parsing
        }
      }

      // Compter les clés localStorage MyConfort
      stats.localStorageKeys = Object.keys(localStorage)
        .filter(key => 
          key.startsWith('myconfort-') || 
          key.startsWith('myconfort_') ||
          key.includes('MyConfort')
        ).length;
    }

    return stats;
  }
}

export default ResetService;
