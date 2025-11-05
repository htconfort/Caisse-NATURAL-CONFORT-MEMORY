import type { Sale, Vendor } from '../types';

export interface VendorSalesData {
  name: string;
  rules: {
    rate: number;
    threshold: number;
    fixedIfUnder: number;
    transport: number;
    housing: number;
  };
  lines: {
    date: string;
    cheque: number;
    card: number;
    cash: number;
    total: number;
    salary: number;
  }[];
  sales: {
    date: string;
    firstName: string;
    lastName: string;
    address: string;
    zip: string;
    product: string;
    amount: number;
    payment: string;
    postDatedCheck: string;
    checksCount: number;
    checkAmount: number;
  }[];
}

export interface DailySyncPayload {
  sessionId: string;
  date: string;
  idempotencyKey: string;
  vendors: VendorSalesData[];
}

const isBrowser = typeof window !== 'undefined' && typeof navigator !== 'undefined';

class GoogleDriveSyncService {
  private baseUrl: string;
  private isOnline: boolean;
  private retryQueue: DailySyncPayload[] = [];

  constructor() {
    this.baseUrl = import.meta.env.VITE_N8N_SYNC_WEBHOOK || '';
    this.isOnline = isBrowser ? navigator.onLine : true; // par défaut true côté serveur
    
    if (isBrowser) {
      // Écouter les changements de connexion uniquement côté client
      window.addEventListener('online', () => {
        this.isOnline = true;
        this.processRetryQueue();
      });
      
      window.addEventListener('offline', () => {
        this.isOnline = false;
      });

      // Charger la queue depuis le localStorage au démarrage
      this.loadRetryQueue();
    }
  }

  /**
   * Synchronise les données de vente vers Google Drive via n8n
   */
  async syncDailySales(
    sales: Sale[], 
    vendorStats: Vendor[], 
    sessionInfo: { eventName?: string; eventStart?: number; eventEnd?: number }
  ): Promise<boolean> {
    try {
      const payload = this.buildSyncPayload(sales, vendorStats, sessionInfo);
      
      if (!this.isOnline) {
        console.log('📱 Mode hors-ligne: ajout à la queue de synchronisation');
        this.addToRetryQueue(payload);
        return false;
      }

      const success = await this.sendToN8N(payload);
      
      if (!success) {
        console.log('⚠️ Échec envoi: ajout à la queue pour retry');
        this.addToRetryQueue(payload);
      }
      
      return success;
    } catch (error) {
      console.error('❌ Erreur sync Google Drive:', error);
      return false;
    }
  }

  /**
   * Construit le payload de synchronisation
   */
  private buildSyncPayload(
    sales: Sale[], 
    vendorStats: Vendor[], 
    sessionInfo: { eventName?: string; eventStart?: number; eventEnd?: number }
  ): DailySyncPayload {
    const today = new Date().toISOString().split('T')[0];
    const sessionId = sessionInfo.eventName || 'session-default';
    const idempotencyKey = `${sessionId}_${today}`;

    // Grouper les ventes par vendeuse
    const vendorSales = new Map<string, Sale[]>();
    sales.forEach(sale => {
      const vendorName = sale.vendorName || 'Non assignée';
      if (!vendorSales.has(vendorName)) {
        vendorSales.set(vendorName, []);
      }
      vendorSales.get(vendorName)!.push(sale);
    });

    // Construire les données par vendeuse
    const vendors: VendorSalesData[] = vendorStats.map(vendor => {
      const vendorSalesList = vendorSales.get(vendor.name) || [];
      
      // Calculer les totaux par mode de paiement
      const totals = vendorSalesList.reduce((acc, sale) => {
        const amount = sale.totalAmount || 0;
        switch (sale.paymentMethod?.toLowerCase()) {
          case 'check':
            acc.cheque += amount;
            break;
          case 'card':
            acc.card += amount;
            break;
          case 'cash':
            acc.cash += amount;
            break;
          default:
            // Mode multi ou autre
            acc.card += amount; // Par défaut en carte
        }
        return acc;
      }, { cheque: 0, card: 0, cash: 0 });

      const totalAmount = totals.cheque + totals.card + totals.cash;
      
      // Calcul du salaire selon les règles
      const salary = this.calculateSalary(totalAmount, {
        rate: 0.20, // 20% par défaut
        threshold: 1500,
        fixedIfUnder: 140,
        transport: 150,
        housing: 300
      });

      return {
        name: vendor.name,
        rules: {
          rate: 0.20,
          threshold: 1500,
          fixedIfUnder: 140,
          transport: 150,
          housing: 300
        },
        lines: [{
          date: today,
          cheque: totals.cheque,
          card: totals.card,
          cash: totals.cash,
          total: totalAmount,
          salary: salary
        }],
        sales: vendorSalesList.map(sale => {
          // Extraire nom/prénom depuis les items ou utiliser vendorName
          const firstItem = sale.items?.[0];
          const productName = firstItem?.name || 'Produit non spécifié';
          
          return {
            date: today,
            firstName: '', // À compléter selon votre logique métier
            lastName: sale.vendorName || '',
            address: '', // À compléter selon votre logique métier
            zip: '', // À compléter selon votre logique métier
            product: productName,
            amount: sale.totalAmount || 0,
            payment: this.translatePaymentMethod(sale.paymentMethod),
            postDatedCheck: 'Non', // À ajuster selon votre logique
            checksCount: sale.paymentMethod === 'check' ? 1 : 0,
            checkAmount: sale.paymentMethod === 'check' ? (sale.totalAmount || 0) : 0
          };
        })
      };
    });

    return {
      sessionId,
      date: today,
      idempotencyKey,
      vendors
    };
  }

  /**
   * Traduit les modes de paiement vers le format attendu
   */
  private translatePaymentMethod(method: string): string {
    switch (method?.toLowerCase()) {
      case 'check': return 'Chèque';
      case 'card': return 'CB';
      case 'cash': return 'Espèces';
      case 'multi': return 'Mixte';
      default: return 'CB';
    }
  }

  /**
   * Calcule le salaire selon les règles de commission
   */
  private calculateSalary(
    totalAmount: number, 
    rules: { rate: number; threshold: number; fixedIfUnder: number; transport: number; housing: number }
  ): number {
    if (totalAmount < rules.threshold) {
      return rules.fixedIfUnder;
    }
    
    const commission = totalAmount * rules.rate;
    return Math.round(commission);
  }

  /**
   * Envoie les données à n8n
   */
  private async sendToN8N(payload: DailySyncPayload): Promise<boolean> {
    try {
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
          // ❌ ne pas mettre 'Access-Control-Allow-Origin' côté requête
        },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        console.log('✅ Synchronisation Google Drive réussie:', payload.idempotencyKey);
        return true;
      } else {
        console.error('❌ Erreur HTTP sync:', response.status, response.statusText);
        return false;
      }
    } catch (error) {
      console.error('❌ Erreur réseau sync:', error);
      return false;
    }
  }

  /**
   * Ajoute un payload à la queue de retry
   */
  private addToRetryQueue(payload: DailySyncPayload): void {
    // Éviter les doublons basés sur idempotencyKey
    const exists = this.retryQueue.some(item => item.idempotencyKey === payload.idempotencyKey);
    if (!exists) {
      this.retryQueue.push(payload);
      if (isBrowser) this.saveRetryQueue();
      console.log('📦 Ajouté à la queue de retry:', payload.idempotencyKey);
    }
  }

  /**
   * Traite la queue de retry
   */
  private async processRetryQueue(): Promise<void> {
    if (!this.isOnline || this.retryQueue.length === 0) return;

    console.log('🔄 Traitement queue de retry:', this.retryQueue.length, 'éléments');
    
    const successfulItems: string[] = [];
    
    for (const payload of this.retryQueue) {
      const success = await this.sendToN8N(payload);
      if (success) {
        successfulItems.push(payload.idempotencyKey);
      }
      
      // Pause entre les requêtes pour éviter de surcharger n8n
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // Retirer les éléments traités avec succès
    this.retryQueue = this.retryQueue.filter(
      item => !successfulItems.includes(item.idempotencyKey)
    );
    
    if (isBrowser) this.saveRetryQueue();
    
    if (successfulItems.length > 0) {
      console.log('✅ Queue retry traitée:', successfulItems.length, 'éléments synchronisés');
    }
  }

  /**
   * Sauvegarde la queue dans localStorage
   */
  private saveRetryQueue(): void {
    try {
      if (!isBrowser) return;
      localStorage.setItem('googleDriveSyncQueue', JSON.stringify(this.retryQueue));
    } catch (error) {
      console.error('❌ Erreur sauvegarde queue:', error);
    }
  }

  /**
   * Charge la queue depuis localStorage
   */
  private loadRetryQueue(): void {
    try {
      if (!isBrowser) return;
      const saved = localStorage.getItem('googleDriveSyncQueue');
      if (saved) {
        this.retryQueue = JSON.parse(saved);
        console.log('📦 Queue retry chargée:', this.retryQueue.length, 'éléments');
      }
    } catch (error) {
      console.error('❌ Erreur chargement queue:', error);
      this.retryQueue = [];
    }
  }

  /**
   * Obtient le statut de la synchronisation
   */
  getStatus(): { isOnline: boolean; queueSize: number } {
    return {
      isOnline: this.isOnline,
      queueSize: this.retryQueue.length
    };
  }

  /**
   * Force le traitement de la queue (pour debug/admin)
   */
  async forceRetryQueue(): Promise<void> {
    await this.processRetryQueue();
  }
}

// --- Singleton robuste (HMR-safe) + exports compatibles ---
declare global {
  interface Window { __gdsInstance?: GoogleDriveSyncService }
}

function createService(): GoogleDriveSyncService {
  return new GoogleDriveSyncService();
}

const instance: GoogleDriveSyncService = isBrowser
  ? (window.__gdsInstance ??= createService())
  : createService();

// Named export (utilisé par: import { googleDriveSyncService } from '…')
export const googleDriveSyncService = instance;

// Default export (utilisé par: import googleDriveSyncService from '…')
export default instance;
