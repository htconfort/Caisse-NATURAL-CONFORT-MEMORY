// Service de gestion de l'historique des RAZ
import { getDB, type RAZHistoryEntry } from '@/db/index';
import type { Sale, Vendor } from '@/types';

export class RAZHistoryService {
  /**
   * Sauvegarde un RAZ dans l'historique
   */
  static async saveRAZToHistory(
    sales: Sale[],
    invoices: any[],
    vendorStats: Vendor[],
    sessionName?: string,
    sessionStart?: number,
    sessionEnd?: number,
    emailContent?: string,
    cashSheetHtml?: string // 🆕 HTML complet de la feuille de caisse
  ): Promise<void> {
    try {
      console.log('📚 Sauvegarde du RAZ dans l\'historique...');
      
      const db = await getDB();
      
      // ⚠️ IMPORTANT: Pour RAZ JOURNÉE, utiliser dailySales (CA du jour)
      // Ne PAS utiliser totalSales qui est le cumul de toute la session !
      
      // Total CA du JOUR = somme des dailySales de toutes les vendeuses (inclut Supabase du jour)
      const totalSales = vendorStats.reduce((sum, v) => sum + (v.dailySales || 0), 0);
      
      // Pour les modes de paiement, on cumule local + invoices externes
      const totalCash = sales
        .filter(s => !s.canceled && s.paymentMethod === 'cash')
        .reduce((sum, s) => sum + (s.totalAmount || 0), 0);
      
      const totalCard = sales
        .filter(s => !s.canceled && s.paymentMethod === 'card')
        .reduce((sum, s) => sum + (s.totalAmount || 0), 0);
      
      const totalChecks = sales
        .filter(s => !s.canceled && s.paymentMethod === 'check' && (!s.checkDetails || s.checkDetails.count === 0))
        .reduce((sum, s) => sum + (s.totalAmount || 0), 0);
      
      // Ajouter les montants des invoices (factures Supabase incluses dans vendorStats mais pas détaillées par mode)
      // Pour l'instant on garde les totaux par mode de paiement depuis sales locales uniquement
      // Le totalSales inclut tout (local + Supabase)
      
      const salesCount = sales.filter(s => !s.canceled).length + (invoices?.length || 0);
      
      console.log('💾 Sauvegarde historique RAZ:', {
        totalSales,
        totalCash,
        totalCard,
        totalChecks,
        salesCount,
        vendorsCount: vendorStats.length
      });
      
      // Créer l'entrée d'historique
      const entry: RAZHistoryEntry = {
        id: `raz_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        date: Date.now(),
        sessionName: sessionName || `Session du ${new Date().toLocaleDateString('fr-FR')}`,
        sessionStart,
        sessionEnd,
        
        totalSales, // CA du JOUR uniquement
        totalCash,
        totalCard,
        totalChecks,
        vendorStats: vendorStats.map(v => ({
          name: v.name,
          dailySales: v.dailySales || 0, // CA du jour de cette vendeuse
          totalSales: v.totalSales || 0  // CA total session (pour info)
        })),
        salesCount,
        
        emailContent,
        cashSheetHtml, // 🆕 HTML complet de la feuille de caisse
        
        fullData: {
          sales: sales.map(s => ({
            ...s,
            // Sérialiser les données pour éviter les problèmes de clonage
            date: s.date,
            items: s.items || []
          })),
          invoices: invoices || [],
          vendorStats: vendorStats.map(v => ({ ...v }))
        }
      };
      
      // Sauvegarder dans IndexedDB
      await db.table('razHistory').add(entry);
      
      console.log('✅ RAZ sauvegardé dans l\'historique:', entry.id);
      console.log(`📊 Stats: ${salesCount} ventes, CA total: ${totalSales.toFixed(2)}€`);
      
    } catch (error) {
      console.error('❌ Erreur sauvegarde historique RAZ:', error);
      // Ne pas bloquer le RAZ si la sauvegarde échoue
      console.warn('⚠️ RAZ effectué mais historique non sauvegardé');
    }
  }

  /**
   * Récupère tout l'historique des RAZ
   */
  static async getHistory(): Promise<RAZHistoryEntry[]> {
    try {
      const db = await getDB();
      const entries = await db.table('razHistory')
        .reverse()
        .toArray();
      return entries;
    } catch (error) {
      console.error('❌ Erreur chargement historique:', error);
      return [];
    }
  }

  /**
   * Récupère un RAZ spécifique par ID
   */
  static async getRAZById(id: string): Promise<RAZHistoryEntry | null> {
    try {
      const db = await getDB();
      const entry = await db.table('razHistory').get(id);
      return entry || null;
    } catch (error) {
      console.error('❌ Erreur récupération RAZ:', error);
      return null;
    }
  }

  /**
   * Supprime un RAZ de l'historique
   */
  static async deleteRAZ(id: string): Promise<void> {
    try {
      const db = await getDB();
      await db.table('razHistory').delete(id);
      console.log('🗑️ RAZ supprimé de l\'historique:', id);
    } catch (error) {
      console.error('❌ Erreur suppression RAZ:', error);
      throw error;
    }
  }

  /**
   * Nettoie l'historique (garde les N derniers)
   */
  static async cleanOldHistory(keepLast: number = 50): Promise<number> {
    try {
      const db = await getDB();
      const all = await db.table('razHistory')
        .reverse()
        .toArray();
      
      if (all.length <= keepLast) {
        return 0;
      }
      
      const toDelete = all.slice(keepLast);
      for (const entry of toDelete) {
        await db.table('razHistory').delete(entry.id);
      }
      
      console.log(`🧹 ${toDelete.length} anciens RAZ supprimés`);
      return toDelete.length;
    } catch (error) {
      console.error('❌ Erreur nettoyage historique:', error);
      return 0;
    }
  }

  /**
   * Exporte l'historique complet en JSON
   */
  static async exportHistoryAsJSON(): Promise<string> {
    try {
      const history = await this.getHistory();
      return JSON.stringify(history, null, 2);
    } catch (error) {
      console.error('❌ Erreur export historique:', error);
      return '[]';
    }
  }
}

