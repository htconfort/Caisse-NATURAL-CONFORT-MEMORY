import { createClient, RealtimeChannel, SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_CONFIG } from '../config/supabase';
import type { RealtimeSale, RealtimeVendorStats, RealtimeSessionInfo, SyncStatus } from '../types/realtime';

/**
 * Service de synchronisation temps réel avec Supabase
 * Permet la synchronisation entre iPads distants et monitoring central
 */
export class RealtimeSyncService {
  private static instance: RealtimeSyncService;
  private supabase: SupabaseClient;
  private channels: Map<string, RealtimeChannel> = new Map();
  private storeId: string;
  private syncStatus: SyncStatus = {
    isOnline: false,
    lastSync: null,
    pendingSyncs: 0,
    error: null
  };

  private constructor() {
    this.supabase = createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey, {
      realtime: {
        params: {
          eventsPerSecond: 10
        }
      }
    });
    
    // Générer un ID unique pour ce magasin/iPad
    this.storeId = this.getOrCreateStoreId();
    
    // Initialiser la vérification de connectivité
    this.initConnectivityCheck();
  }

  public static getInstance(): RealtimeSyncService {
    if (!RealtimeSyncService.instance) {
      RealtimeSyncService.instance = new RealtimeSyncService();
    }
    return RealtimeSyncService.instance;
  }

  /**
   * Obtenir ou créer un ID unique pour ce magasin/iPad
   */
  private getOrCreateStoreId(): string {
    const STORE_ID_KEY = 'myconfort-store-id';
    let storeId = localStorage.getItem(STORE_ID_KEY);
    
    if (!storeId) {
      storeId = `store-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem(STORE_ID_KEY, storeId);
    }
    
    return storeId;
  }

  /**
   * Vérifier la connectivité réseau
   */
  private initConnectivityCheck(): void {
    // Vérification initiale
    this.updateOnlineStatus();

    // Écouter les changements de connectivité
    window.addEventListener('online', () => this.updateOnlineStatus());
    window.addEventListener('offline', () => this.updateOnlineStatus());

    // Ping périodique toutes les 30 secondes
    setInterval(() => this.pingSupabase(), 30000);
  }

  private updateOnlineStatus(): void {
    this.syncStatus.isOnline = navigator.onLine;
    if (!navigator.onLine) {
      this.syncStatus.error = 'Pas de connexion Internet';
    } else {
      this.syncStatus.error = null;
    }
  }

  private async pingSupabase(): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('realtime_sessions')
        .select('session_id')
        .limit(1);
      
      if (error) throw error;
      
      this.syncStatus.isOnline = true;
      this.syncStatus.error = null;
    } catch (error) {
      this.syncStatus.isOnline = false;
      this.syncStatus.error = 'Impossible de joindre Supabase';
      console.error('Supabase ping error:', error);
    }
  }

  /**
   * Synchroniser une vente vers Supabase
   */
  async syncSale(sale: RealtimeSale): Promise<void> {
    try {
      console.log('🔄 Début synchronisation vente:', sale.id);
      console.log('📊 Données vente:', sale);
      console.log('🏪 Store ID:', this.storeId);
      console.log('🔗 Supabase URL:', SUPABASE_CONFIG.url);
      console.log('🔑 API Key (premiers chars):', SUPABASE_CONFIG.anonKey.substring(0, 20) + '...');
      
      const saleData = {
        ...sale,
        store_location: this.storeId,
        synced_at: new Date().toISOString()
      };

      console.log('📤 Envoi vers Supabase:', saleData);

      const { data, error } = await this.supabase
        .from('realtime_sales')
        .upsert(saleData, { onConflict: 'id' });

      if (error) {
        console.error('❌ Erreur Supabase détaillée:', error);
        console.error('❌ Code erreur:', error.code);
        console.error('❌ Message:', error.message);
        console.error('❌ Details:', error.details);
        throw error;
      }

      console.log('✅ Réponse Supabase:', data);
      this.syncStatus.lastSync = new Date();
      console.log('✅ Vente synchronisée avec succès:', sale.id);
    } catch (error) {
      this.syncStatus.pendingSyncs++;
      this.syncStatus.error = 'Erreur de synchronisation';
      console.error('❌❌❌ ERREUR CRITIQUE sync vente:', error);
      console.error('❌ Type erreur:', typeof error);
      console.error('❌ Erreur stringifiée:', JSON.stringify(error, null, 2));
      
      // Stocker en local pour retry
      this.queueOfflineSync('sale', sale);
    }
  }

  /**
   * Synchroniser les statistiques d'un vendeur
   */
  async syncVendorStats(stats: RealtimeVendorStats): Promise<void> {
    try {
      const statsData = {
        ...stats,
        store_location: this.storeId,
        synced_at: new Date().toISOString()
      };

      const { error } = await this.supabase
        .from('realtime_vendor_stats')
        .upsert(statsData, { onConflict: 'vendor_id,store_location' });

      if (error) throw error;

      this.syncStatus.lastSync = new Date();
      console.log('✅ Stats vendeur synchronisées:', stats.vendor_id);
    } catch (error) {
      console.error('Erreur sync stats vendeur:', error);
      this.queueOfflineSync('vendor_stats', stats);
    }
  }

  /**
   * Mettre à jour la session en cours
   */
  async updateSession(sessionInfo: RealtimeSessionInfo): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('realtime_sessions')
        .upsert(sessionInfo, { onConflict: 'session_id' });

      if (error) throw error;

      console.log('✅ Session mise à jour:', sessionInfo.session_id);
    } catch (error) {
      console.error('Erreur mise à jour session:', error);
    }
  }

  /**
   * S'abonner aux ventes en temps réel (pour monitoring)
   */
  subscribeToSales(callback: (sale: RealtimeSale) => void): () => void {
    const channelName = 'realtime-sales';
    
    const channel = this.supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'realtime_sales'
        },
        (payload) => {
          console.log('🔔 Nouvelle vente reçue:', payload);
          callback(payload.new as RealtimeSale);
        }
      )
      .subscribe((status) => {
        console.log('📡 Abonnement ventes:', status);
      });

    this.channels.set(channelName, channel);

    // Retourner fonction de désabonnement
    return () => {
      channel.unsubscribe();
      this.channels.delete(channelName);
    };
  }

  /**
   * S'abonner aux stats vendeurs en temps réel
   */
  subscribeToVendorStats(callback: (stats: RealtimeVendorStats) => void): () => void {
    const channelName = 'realtime-vendor-stats';
    
    const channel = this.supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*', // INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'realtime_vendor_stats'
        },
        (payload) => {
          console.log('🔔 Stats vendeur mises à jour:', payload);
          callback(payload.new as RealtimeVendorStats);
        }
      )
      .subscribe((status) => {
        console.log('📡 Abonnement stats vendeurs:', status);
      });

    this.channels.set(channelName, channel);

    return () => {
      channel.unsubscribe();
      this.channels.delete(channelName);
    };
  }

  /**
   * S'abonner aux sessions actives
   */
  subscribeToActiveSessions(callback: (session: RealtimeSessionInfo) => void): () => void {
    const channelName = 'realtime-sessions';
    
    const channel = this.supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'realtime_sessions'
        },
        (payload) => {
          console.log('🔔 Session mise à jour:', payload);
          callback(payload.new as RealtimeSessionInfo);
        }
      )
      .subscribe((status) => {
        console.log('📡 Abonnement sessions:', status);
      });

    this.channels.set(channelName, channel);

    return () => {
      channel.unsubscribe();
      this.channels.delete(channelName);
    };
  }

  /**
   * Récupérer toutes les ventes récentes
   */
  async getRecentSales(limit = 100): Promise<RealtimeSale[]> {
    try {
      const { data, error } = await this.supabase
        .from('realtime_sales')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Erreur récupération ventes:', error);
      return [];
    }
  }

  /**
   * Récupérer les stats de tous les vendeurs
   */
  async getAllVendorStats(): Promise<RealtimeVendorStats[]> {
    try {
      const { data, error } = await this.supabase
        .from('realtime_vendor_stats')
        .select('*')
        .order('last_updated', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Erreur récupération stats vendeurs:', error);
      return [];
    }
  }

  /**
   * Récupérer les sessions actives
   */
  async getActiveSessions(): Promise<RealtimeSessionInfo[]> {
    try {
      const { data, error } = await this.supabase
        .from('realtime_sessions')
        .select('*')
        .eq('is_active', true)
        .order('last_activity', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Erreur récupération sessions:', error);
      return [];
    }
  }

  /**
   * Mettre en file d'attente pour sync offline
   */
  private queueOfflineSync(type: string, data: any): void {
    const QUEUE_KEY = 'myconfort-offline-sync-queue';
    const queue = JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]');
    
    queue.push({
      type,
      data,
      timestamp: new Date().toISOString()
    });
    
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  }

  /**
   * Traiter la file d'attente offline
   */
  async processOfflineQueue(): Promise<void> {
    const QUEUE_KEY = 'myconfort-offline-sync-queue';
    const queue = JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]');
    
    if (queue.length === 0) return;

    console.log(`📤 Traitement de ${queue.length} sync(s) en attente...`);

    for (const item of queue) {
      try {
        if (item.type === 'sale') {
          await this.syncSale(item.data);
        } else if (item.type === 'vendor_stats') {
          await this.syncVendorStats(item.data);
        }
      } catch (error) {
        console.error('Erreur traitement queue:', error);
        break; // Arrêter si erreur (probablement toujours offline)
      }
    }

    // Vider la queue
    localStorage.setItem(QUEUE_KEY, '[]');
    this.syncStatus.pendingSyncs = 0;
  }

  /**
   * Obtenir le statut de synchronisation
   */
  getSyncStatus(): SyncStatus {
    return { ...this.syncStatus };
  }

  /**
   * Obtenir l'ID du magasin
   */
  getStoreId(): string {
    return this.storeId;
  }

  /**
   * Nettoyer toutes les souscriptions
   */
  cleanup(): void {
    this.channels.forEach(channel => channel.unsubscribe());
    this.channels.clear();
  }
}





