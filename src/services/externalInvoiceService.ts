/**
 * Service de réception et gestion des factures externes
 * Gère l'intégration avec des systèmes externes (N8N, APIs, webhooks)
 * Version: 3.8.1 - MyConfort
 */

import type { InvoiceChannels, InvoiceClient, InvoiceItem, InvoicePayload, InvoicePayment, InvoiceTotals } from '../types';

// Garde-fou global pour bloquer toute donnée de démo selon flags runtime/build
function blockDemo(): boolean {
  // Flags runtime
  const w = (typeof window !== 'undefined' ? window : undefined) as unknown as {
    PRODUCTION_MODE?: boolean;
    DISABLE_ALL_DEMO_DATA?: boolean;
    FORCE_EMPTY_INVOICES?: boolean;
  } | undefined;
  if (w && (w.PRODUCTION_MODE || w.DISABLE_ALL_DEMO_DATA || w.FORCE_EMPTY_INVOICES)) return true;

  // Flags build-time (Vite define)
  // @ts-expect-error: injected at build time via Vite define
  if (typeof __PRODUCTION_MODE__ !== 'undefined' && __PRODUCTION_MODE__) return true;
  // @ts-expect-error: injected at build time via Vite define
  if (typeof __DISABLE_DEMO_DATA__ !== 'undefined' && __DISABLE_DEMO_DATA__) return true;

  // Vars d'env
  const viteEnv = (typeof import.meta !== 'undefined' ? (import.meta as unknown as { env?: Record<string, string> }).env : undefined);
  if (viteEnv?.VITE_DEMO_MODE === 'false') return true;

  return false;
}

/**
 * Fonction d'insertion idempotente locale pour éviter les doublons
 */
const upsertInvoice = (list: InvoicePayload[], incoming: InvoicePayload): InvoicePayload[] => {
  const idx = list.findIndex(i => i.idempotencyKey === incoming.idempotencyKey);
  if (idx === -1) {
    return [incoming, ...list];
  }
  const merged = { ...list[idx], ...incoming };
  const copy = [...list];
  copy[idx] = merged;
  return copy;
};

/**
 * Configuration du service de factures externes
 */
interface ExternalInvoiceConfig {
  apiEndpoint?: string;
  authToken?: string;
  autoSync?: boolean;
  syncInterval?: number; // en millisecondes
}

/**
 * Service de gestion des factures externes
 */
class ExternalInvoiceService {
  private config: ExternalInvoiceConfig;
  private invoices: InvoicePayload[] = [];
  private syncTimer?: number;
  public paused: boolean = false;

  constructor(config: ExternalInvoiceConfig = {}) {
    const env = (typeof import.meta !== 'undefined' ? (import.meta as unknown as { env?: Record<string, string> }).env : undefined) || {} as Record<string, string>;
    const externalAutoSyncEnv = String(env.VITE_EXTERNAL_AUTOSYNC || '').toLowerCase();
    const externalAutoSync = externalAutoSyncEnv === 'true';
    this.config = {
      apiEndpoint: config.apiEndpoint || '/api/invoices',
      authToken: config.authToken || 'default-secret',
      // Auto-sync activé uniquement si explicitement demandé via env ou config
      autoSync: config.autoSync ?? externalAutoSync,
      syncInterval: config.syncInterval || 30000, // 30 secondes par défaut
      ...config
    };

    // Désactiver l'autoSync si on bloque la démo (en prod/non-localhost)
    if (blockDemo()) {
      this.config.autoSync = false;
    }

    // Diagnostiquer et charger les factures depuis le localStorage au démarrage
    this.diagnoseStorage();
    this.loadFromStorage();

    // Purge et dédoublonnage immédiats pour assainir l'état local
    this.purgeInvalidAndDeduplicate();
    this.saveToStorage();

    // Démarrer la synchronisation automatique si activée
    if (this.config.autoSync && !this.paused) {
      this.startAutoSync();
    }
  }

  /**
   * Diagnostiquer l'état du localStorage
   */
  public diagnoseStorage(): void {
    console.log('🔍 DIAGNOSTIC LOCALSTORAGE FACTURES EXTERNES');
    console.log('=====================================');

    try {
      const stored = localStorage.getItem('myconfort_external_invoices');
      if (stored) {
        console.log('📦 Données brutes:', stored.slice(0, 200) + '...');

        const parsed = JSON.parse(stored);
        console.log('📦 Type de données:', typeof parsed);

        if (Array.isArray(parsed)) {
          console.log('✅ Format: ARRAY (correct)');
          console.log(`📊 Nombre de factures: ${parsed.length}`);
        } else if (parsed && typeof parsed === 'object' && parsed.data && Array.isArray(parsed.data)) {
          console.log('⚠️ Format: OBJECT.DATA (corrompu)');
          console.log(`📊 Nombre de factures dans data: ${parsed.data.length}`);
          console.log('🔧 Réparation automatique en cours...');
          this.invoices = parsed.data;
          this.saveToStorage();
        } else {
          console.log('❌ Format: INCONNU (problématique)');
        }
      } else {
        console.log('📦 Aucune donnée trouvée dans localStorage');
      }

      console.log(`📊 État actuel du service: ${this.invoices.length} factures`);
    } catch (error) {
      console.error('❌ Erreur diagnostic:', error);
    }
  }

  /**
   * Réceptionner une nouvelle facture depuis un système externe
   */
  receiveInvoice(payload: InvoicePayload): boolean {
    try {
      console.log(`📄 Réception facture externe: ${payload.invoiceNumber}`, payload);

      // Validation des données essentielles (assouplie: le nom client peut être vide)
      const hasValidDate = !Number.isNaN(Date.parse(payload.invoiceDate));
      const hasAmount = typeof payload.totals?.ttc === 'number' && payload.totals.ttc > 0;
      if (!payload.invoiceNumber || !hasValidDate || !hasAmount) {
        console.error('❌ Facture externe invalide - données manquantes');
        return false;
      }
      if (!payload.client?.name || payload.client.name === 'Client inconnu') {
        console.warn('⚠️ Facture sans nom client explicite — acceptée avec placeholder');
      }

      // Définir la clé d'idempotence si non fournie
      if (!payload.idempotencyKey) {
        payload.idempotencyKey = payload.invoiceNumber;
      }

      // Insertion idempotente (évite les doublons)
      this.invoices = upsertInvoice(this.invoices, payload);

      // Sauvegarder dans le localStorage
      this.saveToStorage();

      console.log(`✅ Facture ${payload.invoiceNumber} intégrée avec succès`);
      return true;
    } catch (error) {
      console.error('❌ Erreur lors de la réception de facture externe:', error);
      return false;
    }
  }

  /**
   * Réceptionner plusieurs factures en batch
   */
  receiveInvoiceBatch(payloads: InvoicePayload[]): { success: number; errors: number } {
    let success = 0;
    let errors = 0;

    payloads.forEach(payload => {
      if (this.receiveInvoice(payload)) {
        success++;
      } else {
        errors++;
      }
    });

    console.log(`📊 Batch traité: ${success} succès, ${errors} erreurs`);
    return { success, errors };
  }

  /**
   * Obtenir toutes les factures externes
   */
  getAllInvoices(): InvoicePayload[] {
    // En mode protégé (prod), ne retourner que ce qui est réellement stocké localement
    return [...this.invoices];
  }

  /**
   * Obtenir les factures par date
   */
  getInvoicesByDate(date: Date): InvoicePayload[] {
    const targetDate = date.toISOString().split('T')[0];
    return this.invoices.filter(invoice => 
      invoice.invoiceDate.startsWith(targetDate)
    );
  }

  /**
   * Obtenir les factures d'aujourd'hui
   */
  getTodayInvoices(): InvoicePayload[] {
    return this.getInvoicesByDate(new Date());
  }

  /**
   * Rechercher une facture par numéro
   */
  getInvoiceByNumber(invoiceNumber: string): InvoicePayload | undefined {
    return this.invoices.find(inv => inv.invoiceNumber === invoiceNumber);
  }

  /**
   * Supprimer une facture
   */
  removeInvoice(invoiceNumber: string): boolean {
    const initialLength = this.invoices.length;
    this.invoices = this.invoices.filter(inv => inv.invoiceNumber !== invoiceNumber);
    
    if (this.invoices.length < initialLength) {
      this.saveToStorage();
      console.log(`🗑️ Facture ${invoiceNumber} supprimée`);
      return true;
    }
    return false;
  }

  /**
   * Vider toutes les factures (pour la RAZ)
   */
  clearAllInvoices(): void {
    this.invoices = [];
    this.saveToStorage();
    console.log('🧹 Toutes les factures externes effacées');
  }

  /**
   * Purge les factures manifestement invalides et dédoublonne par idempotencyKey/invoiceNumber
   */
  purgeInvalidAndDeduplicate(): void {
    const isPlaceholder = (v?: string) => typeof v === 'string' && /\{\{|\$json\[/.test(v);
    const normalizeKey = (inv: InvoicePayload) => (inv.idempotencyKey || inv.invoiceNumber || '').toString().trim();

    // 1) Filtrer les invalides
    const filtered = (this.invoices || []).filter((inv) => {
      const numberOk = !!inv.invoiceNumber && !isPlaceholder(inv.invoiceNumber);
      const clientOk = !!(inv.client?.name) && !isPlaceholder(inv.client?.name || '') && inv.client.name !== 'Client inconnu';
      const itemsOk = Array.isArray(inv.items) && inv.items.length > 0;
      const totalsOk = !!inv.totals && typeof inv.totals.ttc === 'number' && inv.totals.ttc > 0;
      // Conserver si on a au moins un identifiant + un contenu exploitable
      return numberOk && (itemsOk || totalsOk);
    });

    // 2) Dédoublonner en privilégiant l'entrée avec client connu et TTC > 0
    const bestOf: Record<string, InvoicePayload> = {};
    for (const inv of filtered) {
      const key = normalizeKey(inv);
      const current = bestOf[key];
      if (!current) {
        bestOf[key] = inv;
        continue;
      }
      const isBetter = (a: InvoicePayload, b: InvoicePayload) => {
        const aScore = (a.client?.name && a.client.name !== 'Client inconnu' ? 1 : 0) + (a.totals?.ttc || 0) / 1e6 + (a.items?.length || 0) / 1000;
        const bScore = (b.client?.name && b.client.name !== 'Client inconnu' ? 1 : 0) + (b.totals?.ttc || 0) / 1e6 + (b.items?.length || 0) / 1000;
        return aScore >= bScore;
      };
      bestOf[key] = isBetter(inv, current) ? inv : current;
    }

    const deduped = Object.values(bestOf);
    const removed = (this.invoices?.length || 0) - deduped.length;
    this.invoices = deduped;
    if (removed > 0) {
      console.log(`🧽 Purge effectuée: ${removed} entrées invalides/dupliquées supprimées, ${deduped.length} conservées`);
    }
  }

  /**
   * Synchronisation avec l'API externe
   */
  async syncWithAPI(forceRun?: boolean, runPayload?: unknown[]): Promise<boolean> {
    try {
      // En mode protégé, ne pas tenter de sync (ou ignorer silencieusement)
      if (blockDemo()) {
        console.warn('🏭 Production guard actif: synchronisation API ignorée');
        return true;
      }

      if (!this.config.apiEndpoint) {
        console.warn('⚠️ Aucun endpoint configuré pour la synchronisation');
        return false;
      }

      console.log('🔄 Synchronisation avec l\'API externe...');
      const runUrl = (import.meta as any).env?.VITE_EXTERNAL_INVOICES_RUN_URL as string | undefined;
      const runSecret = (import.meta as any).env?.VITE_EXTERNAL_RUN_SECRET as string | undefined;

      const url = this.config.apiEndpoint as string;

      const response = await (async () => {
        if (forceRun && runUrl) {
          // POST sécurisé pour lancer la vraie synchro
          return fetch(runUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Trigger': 'sync',
              ...(runSecret ? { 'X-Secret': runSecret } : {}),
            },
            body: JSON.stringify(Array.isArray(runPayload) ? runPayload : []),
          });
        }
        // Ping léger par défaut
        return fetch(url, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'X-Auth-Token': this.config.authToken || '',
          },
        });
      })();

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      // Cas 1: l'API renvoie déjà un tableau d'InvoicePayload
      if (Array.isArray(data)) {
        const normalized = data.map(this.normalizeAnyToInvoicePayload);
        const result = this.receiveInvoiceBatch(normalized);
        console.log(`✅ Synchronisation terminée: ${result.success} factures`);
        return true;
      }

      // Cas 2: l'API N8N renvoie { success: true, invoices: [...] }
      if ((data as { invoices?: unknown[] }).invoices && Array.isArray((data as { invoices?: unknown[] }).invoices)) {
        const n8nInvoices = (data as { invoices: unknown[] }).invoices;
        const normalized = n8nInvoices.map(this.normalizeAnyToInvoicePayload);
        const result = this.receiveInvoiceBatch(normalized);
        console.log(`✅ Synchronisation terminée: ${result.success} factures`);
        return true;
      }

      console.log('✅ Synchronisation terminée - aucune nouvelle facture');
      return true;
    } catch (error) {
      console.error('❌ Erreur lors de la synchronisation:', error);
      return false;
    }
  }

  /**
   * Démarrer la synchronisation automatique
   */
  startAutoSync(): void {
    if (blockDemo() || this.paused) {
      // Ne rien faire en production guard
      return;
    }
    
    // DÉSACTIVER l'auto-sync en production pour éviter les boucles infinies
    console.log('🚫 Synchronisation automatique désactivée en production pour éviter les boucles infinies');
    return;
    
    // En mode développement local, désactiver la synchronisation automatique
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      console.log('🏠 Mode développement local: synchronisation automatique désactivée');
      return;
    }
    
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
    }

    this.syncTimer = window.setInterval(() => {
      if (!this.paused) this.syncWithAPI();
    }, this.config.syncInterval);

    console.log(`🔄 Synchronisation automatique démarrée (${this.config.syncInterval}ms)`);
  }

  /**
   * Arrêter la synchronisation automatique
   */
  stopAutoSync(): void {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = undefined;
      console.log('⏹️ Synchronisation automatique arrêtée');
    }
  }

  /** Mettre en pause la synchronisation automatique */
  pause(): void {
    this.paused = true;
    this.stopAutoSync();
    console.log('⏸️ Auto-sync mis en pause');
  }

  /** Reprendre la synchronisation automatique */
  resume(): void {
    this.paused = false;
    this.startAutoSync();
    console.log('▶️ Auto-sync repris');
  }

  /**
   * Sauvegarder les factures dans le localStorage
   */
  private saveToStorage(): void {
    try {
      const data = JSON.stringify(this.invoices);
      localStorage.setItem('myconfort_external_invoices', data);
      console.log(`💾 Factures sauvegardées (${this.invoices.length}) - format array simple`);
      console.log('📊 Données sauvegardées (preview):', data.slice(0, 200) + '...');
    } catch (error) {
      console.error('❌ Erreur sauvegarde localStorage:', error);
    }
  }

  /**
   * Charger les factures depuis le localStorage
   */
  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem('mycomfort_external_invoices');
      if (stored) {
        console.log('📦 Données brutes localStorage:', stored.slice(0, 200) + '...');

        const parsed = JSON.parse(stored);
        console.log('📦 Données parsées:', typeof parsed, parsed);

        // 🚨 CORRECTION : Gérer les deux formats (array et object corrompu)
        if (Array.isArray(parsed)) {
          this.invoices = parsed;
          console.log(`📦 ${this.invoices.length} factures externes chargées (format array)`);
        } else if (parsed && typeof parsed === 'object' && parsed.data && Array.isArray(parsed.data)) {
          // Format object avec data array (corrompu détecté dans diagnostic)
          this.invoices = parsed.data;
          console.log(`📦 ${this.invoices.length} factures externes chargées (format object.data)`);

          // 🚨 CORRECTION : Réparer immédiatement le format de stockage
          this.saveToStorage();
          console.log('🔧 Format de stockage réparé (converti en array simple)');
        } else {
          this.invoices = [];
          console.warn('⚠️ Format de données non reconnu, réinitialisation');
        }

        console.log(`📊 Factures chargées (preview):`, this.invoices.slice(0, 2));
      } else {
        this.invoices = [];
        console.log('📦 Aucune facture externe trouvée dans localStorage - format réinitialisé');
      }
    } catch (error) {
      console.error('❌ Erreur chargement localStorage:', error);
      this.invoices = [];
    }
  }

  /**
   * Rafraîchir l'état interne depuis le localStorage (public)
   * Utile quand une autre partie de l'app écrit directement dans le storage
   */
  refreshFromStorage(): void {
    try {
      const stored = localStorage.getItem('myconfort_external_invoices');
      if (stored) {
        this.invoices = JSON.parse(stored);
        this.purgeInvalidAndDeduplicate();
        // Ne pas réécrire si identique, mais sauvegarde pour normaliser le format
        this.saveToStorage();
        console.log(`🔁 Rafraîchi depuis localStorage: ${this.invoices.length} facture(s)`);
      }
    } catch (error) {
      console.error('❌ Erreur refreshFromStorage:', error);
    }
  }

  /**
   * Obtenir les statistiques des factures externes
   */
  getStatistics() {
    const todayInvoices = this.getInvoicesByDate(new Date());
    
    return {
      total: this.invoices.length,
      today: todayInvoices.length,
      totalAmount: this.invoices.reduce((sum, inv) => sum + (inv.totals?.ttc ?? 0), 0),
      todayAmount: todayInvoices.reduce((sum, inv) => sum + (inv.totals?.ttc ?? 0), 0),
      paidCount: this.invoices.filter(inv => inv.payment?.paid).length,
      pendingCount: this.invoices.filter(inv => !inv.payment?.paid).length
    };
  }
}

// Instance singleton du service
export const externalInvoiceService = new ExternalInvoiceService({
  // Permet de pointer vers N8N directement si fourni (ex: https://.../webhook/sync/invoices)
  apiEndpoint: (import.meta.env.VITE_EXTERNAL_INVOICES_URL as string) || '/api/invoices',
  authToken: import.meta.env.VITE_INVOICE_AUTH_TOKEN || 'myconfort-secret-2025',
  autoSync: false, // 🚫 DÉSACTIVÉ pour éviter les boucles infinies
  syncInterval: 30000 // 30 secondes
});

// Exposer le service dans la console pour les tests (mode développement ET production)
if (typeof window !== 'undefined') {
  (window as any).externalInvoiceService = externalInvoiceService;
  console.log('🔧 ExternalInvoiceService exposé dans window.externalInvoiceService pour les tests');
}

export default ExternalInvoiceService;

// ===== Helpers =====

/**
 * Normalise n'importe quelle forme d'objet (N8N ou API) vers InvoicePayload
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
ExternalInvoiceService.prototype.normalizeAnyToInvoicePayload = function (raw: any): InvoicePayload {
  const invoiceNumber: string = String(
    raw.invoiceNumber || raw.number || raw.numero_facture || raw['numero_facture'] || raw.id || ''
  ).trim() || `INV-${Date.now()}`;
  const invoiceDate: string = String(
    raw.invoiceDate || raw.date_facture || raw['date_facture'] || raw.createdAt || new Date().toISOString()
  );

  const frenchClientName =
    (typeof raw.nom_du_client === 'string' && raw.nom_du_client) ||
    (typeof raw['nom_du_client'] === 'string' && raw['nom_du_client']) ||
    (typeof raw.nom_client === 'string' && raw.nom_client) ||
    (typeof raw['nom_client'] === 'string' && raw['nom_client']) ||
    (typeof raw['Nom Client'] === 'string' && raw['Nom Client']) ||
    (typeof raw.customerName === 'string' && raw.customerName);

  const client: InvoiceClient = {
    name: raw.client?.name || raw.clientName || frenchClientName || 'Client inconnu',
    email: raw.client?.email || raw.clientEmail || raw.email_client || raw['email_client'],
    phone: raw.client?.phone || raw.clientPhone || raw.telephone_client || raw['telephone_client'],
    address: raw.client?.address || raw.adresse_client || raw['adresse_client'],
    postalCode: raw.client?.postalCode || raw.client_code_postal || raw['client_code_postal'],
    city: raw.client?.city || raw.client_ville || raw['client_ville'],
  };

  const rawItems = Array.isArray(raw.products) ? raw.products : Array.isArray(raw.items) ? raw.items : Array.isArray(raw.produits) ? raw.produits : [];
  const items: InvoiceItem[] = rawItems.map((p: any, idx: number) => {
    const qty = Number(p.quantity ?? p.qty ?? p.quantite ?? 1);
    const discountRate = Number(p.discount ?? p.remise ?? 0);

    // Nouveau format prioritaire: prix_ttc (prix TTC unitaire après remise)
    const unitPriceTTC = Number(p.prix_ttc ?? p.unitPriceTTC ?? p.priceTTC ?? 0);

    // Calcul du prix HT à partir du prix TTC et de la remise
    let unitPriceHT = 0;
    if (unitPriceTTC > 0) {
      // Si prix TTC fourni, calculer le HT avec TVA 20% par défaut
      unitPriceHT = Math.round(unitPriceTTC / 1.2 * 100) / 100;
    } else {
      // Fallback ancien format: prix_ht direct
      unitPriceHT = Number(p.unitPriceHT ?? p.prix_ht ?? p.priceHT ?? 0);
    }

    // Calcul de la TVA
    const tvaRate = unitPriceTTC > 0 && unitPriceHT > 0 ?
      Math.round(((unitPriceTTC - unitPriceHT) / unitPriceHT) * 100) / 100 : 0.2;

    return {
      sku: p.sku || p.code || `${invoiceNumber}-${idx}`,
      name: p.name || p.productName || p.nom || 'Produit',
      qty,
      unitPriceHT,
      tvaRate,
    } as InvoiceItem;
  });

  const totals: InvoiceTotals = {
    ht: Number(
      raw.totalHT ?? raw.montant_ht ?? raw['montant_ht'] ?? items.reduce((s, it) => s + it.unitPriceHT * it.qty, 0)
    ),
    tva: 0,
    // Accepter différents noms pour le total TTC (amount, total, totalTTC, montant_total)
    ttc: Number(
      raw.totalTTC ?? raw.montant_ttc ?? raw['montant_ttc'] ?? raw.montant_total ?? raw.total ?? raw.amount ?? 0
    ),
  };
  if (!totals.ttc) totals.ttc = Math.round((totals.ht * 1.2) * 100) / 100; // fallback TVA 20%
  totals.tva = Math.max(0, totals.ttc - totals.ht);

  const payment: InvoicePayment = {
    method: raw.payment?.method || raw.paymentMethod || raw.payment_method || raw.mode_paiement || undefined,
    paid: (raw.payment?.paid === true) || String(raw.status || '').toLowerCase().includes('paid') || undefined,
    paidAmount: Number(raw.payment?.paidAmount ?? raw.deposit ?? 0),
    depositRate: totals.ttc ? (Number(raw.payment?.paidAmount ?? raw.deposit ?? 0) / totals.ttc) : 0,
  };

  const channels: InvoiceChannels = {
    source: raw.source || 'Facturation',
    via: 'N8N Webhook',
  };

  const sanitize = (s?: string) => (typeof s === 'string' ? s.replace(/\{\{[^}]+\}\}/g, '').replace(/\$json\[[^\]]+\]/g, '').trim() : s);

  const payload: InvoicePayload = {
    invoiceNumber: sanitize(invoiceNumber) as string,
    invoiceDate,
    client: { ...client, name: sanitize(client.name) || 'Client inconnu' },
    items,
    totals,
    payment,
    channels,
    // Utiliser seulement le numéro de facture pour éviter les variations du nom client
    idempotencyKey: sanitize(`${invoiceNumber}`) as string,
  };
  return payload;
};
