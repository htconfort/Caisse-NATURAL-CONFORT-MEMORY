// src/services/n8nSyncService.ts
/**
 * Service de synchronisation N8N pour le mode facturier
 * Gère l'envoi des données vers le webhook N8N
 */

import type { Sale } from '@/types';

interface N8NSyncConfig {
  webhookUrl?: string;
  enabled: boolean;
  timeout: number;
}

class N8NSyncService {
  private config: N8NSyncConfig = {
    webhookUrl: undefined, // À configurer avec l'URL réelle du webhook N8N
    enabled: false, // Désactivé par défaut jusqu'à configuration
    timeout: 30000 // 30 secondes timeout
  };

  /**
   * Configure le service de synchronisation N8N
   */
  configure(config: Partial<N8NSyncConfig>) {
    this.config = { ...this.config, ...config };
    console.log('🔧 N8N Sync Service configuré:', this.config);
  }

  /**
   * Synchronise une vente avec N8N (mode facturier uniquement)
   */
  async syncSale(sale: Sale): Promise<void> {
    // Vérifier que c'est bien une vente en mode facturier
    if (sale.cartMode !== 'facturier') {
      console.log('🚫 N8N Sync ignoré - vente en mode classique:', sale.id);
      return;
    }

    if (!this.config.enabled || !this.config.webhookUrl) {
      console.log('🔄 N8N Sync désactivé ou non configuré pour la vente:', sale.id);
      return;
    }

    try {
      console.log('🚀 Début synchronisation N8N pour vente:', sale.id);
      
      // Préparer les données pour N8N
      const syncData = this.prepareSaleData(sale);
      
      // Effectuer l'appel webhook
      const response = await fetch(this.config.webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(syncData),
        signal: AbortSignal.timeout(this.config.timeout)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      console.log('✅ N8N Sync réussi:', { saleId: sale.id, result });

    } catch (error) {
      console.error('❌ Erreur N8N Sync:', { saleId: sale.id, error });
      
      // En cas d'erreur, on peut notifier l'utilisateur ou stocker pour retry plus tard
      this.handleSyncError(sale, error);
    }
  }

  /**
   * Prépare les données de vente pour N8N
   */
  private prepareSaleData(sale: Sale) {
    return {
      // Métadonnées de vente
      saleId: sale.id,
      timestamp: new Date().toISOString(),
      vendorId: sale.vendorId,
      vendorName: sale.vendorName,
      
      // Données financières
      totalAmount: sale.totalAmount,
      paymentMethod: sale.paymentMethod,
      
      // Items de la vente
      items: sale.items.map(item => ({
        id: item.id,
        name: item.name,
        category: item.category,
        price: item.price,
        quantity: item.quantity,
        offert: item.offert || false
      })),
      
      // Détails de paiement si applicable
      ...(sale.checkDetails && {
        checkDetails: sale.checkDetails
      }),
      
      // Mode panier pour validation côté N8N
      cartMode: sale.cartMode,
      
      // Source de l'envoi
      source: 'caisse-myconfort',
      version: '1.0'
    };
  }

  /**
   * Gère les erreurs de synchronisation
   */
  private handleSyncError(sale: Sale, error: unknown) {
    // Pour l'instant, juste logger l'erreur
    // Plus tard, on pourrait implémenter un système de retry ou de notification
    console.error('💥 Échec synchronisation N8N:', {
      saleId: sale.id,
      vendorName: sale.vendorName,
      amount: sale.totalAmount,
      error: error instanceof Error ? error.message : String(error)
    });
    
    // TODO: Implémenter un système de retry ou de notification utilisateur
    // - Stocker en local pour retry plus tard
    // - Afficher une notification à l'utilisateur
    // - Envoyer par email en fallback
  }

  /**
   * Test de connectivité avec N8N
   */
  async testConnection(): Promise<boolean> {
    if (!this.config.webhookUrl) {
      console.log('❌ N8N Test - Aucune URL webhook configurée');
      return false;
    }

    try {
      const testData = {
        test: true,
        timestamp: new Date().toISOString(),
        source: 'caisse-myconfort-test'
      };

      const response = await fetch(this.config.webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(testData),
        signal: AbortSignal.timeout(5000) // 5 secondes pour le test
      });

      const success = response.ok;
      console.log(success ? '✅ N8N Test réussi' : '❌ N8N Test échoué:', response.status);
      return success;

    } catch (error) {
      console.error('❌ N8N Test échoué:', error);
      return false;
    }
  }

  /**
   * Obtient le statut actuel du service
   */
  getStatus() {
    return {
      enabled: this.config.enabled,
      configured: Boolean(this.config.webhookUrl),
      webhookUrl: this.config.webhookUrl ? '***configured***' : 'not configured'
    };
  }
}

// Instance singleton
export const n8nSyncService = new N8NSyncService();

// Fonction utilitaire pour déclencher la synchronisation
export async function triggerN8NSync(sale: Sale): Promise<void> {
  return n8nSyncService.syncSale(sale);
}

export default n8nSyncService;
