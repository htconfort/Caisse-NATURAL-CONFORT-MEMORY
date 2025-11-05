import { useState, useEffect, useCallback } from 'react';
import { RealtimeSyncService } from '../services/syncService';
import type { RealtimeSale, RealtimeVendorStats, RealtimeSessionInfo, SyncStatus } from '../types/realtime';

/**
 * Hook pour la synchronisation temps réel
 */
export function useRealtimeSync() {
  const [syncService] = useState(() => RealtimeSyncService.getInstance());
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(syncService.getSyncStatus());
  const [recentSales, setRecentSales] = useState<RealtimeSale[]>([]);
  const [vendorStats, setVendorStats] = useState<RealtimeVendorStats[]>([]);
  const [activeSessions, setActiveSessions] = useState<RealtimeSessionInfo[]>([]);

  // Mettre à jour le statut de sync périodiquement
  useEffect(() => {
    const interval = setInterval(() => {
      setSyncStatus(syncService.getSyncStatus());
    }, 1000);

    return () => clearInterval(interval);
  }, [syncService]);

  // Traiter la queue offline au montage
  useEffect(() => {
    syncService.processOfflineQueue();
  }, [syncService]);

  /**
   * Synchroniser une vente
   */
  const syncSale = useCallback(async (sale: RealtimeSale) => {
    await syncService.syncSale(sale);
    setSyncStatus(syncService.getSyncStatus());
  }, [syncService]);

  /**
   * Synchroniser les stats d'un vendeur
   */
  const syncVendorStats = useCallback(async (stats: RealtimeVendorStats) => {
    await syncService.syncVendorStats(stats);
    setSyncStatus(syncService.getSyncStatus());
  }, [syncService]);

  /**
   * Mettre à jour la session
   */
  const updateSession = useCallback(async (sessionInfo: RealtimeSessionInfo) => {
    await syncService.updateSession(sessionInfo);
  }, [syncService]);

  /**
   * Charger les ventes récentes
   */
  const loadRecentSales = useCallback(async (limit = 100) => {
    const sales = await syncService.getRecentSales(limit);
    setRecentSales(sales);
    return sales;
  }, [syncService]);

  /**
   * Charger les stats vendeurs
   */
  const loadVendorStats = useCallback(async () => {
    const stats = await syncService.getAllVendorStats();
    setVendorStats(stats);
    return stats;
  }, [syncService]);

  /**
   * Charger les sessions actives
   */
  const loadActiveSessions = useCallback(async () => {
    const sessions = await syncService.getActiveSessions();
    setActiveSessions(sessions);
    return sessions;
  }, [syncService]);

  /**
   * S'abonner aux ventes en temps réel
   */
  const subscribeToSales = useCallback((callback: (sale: RealtimeSale) => void) => {
    return syncService.subscribeToSales((sale) => {
      setRecentSales(prev => [sale, ...prev].slice(0, 100));
      callback(sale);
    });
  }, [syncService]);

  /**
   * S'abonner aux stats vendeurs
   */
  const subscribeToVendorStats = useCallback((callback: (stats: RealtimeVendorStats) => void) => {
    return syncService.subscribeToVendorStats((stats) => {
      setVendorStats(prev => {
        const existing = prev.findIndex(s => s.vendor_id === stats.vendor_id && s.store_location === stats.store_location);
        if (existing >= 0) {
          const updated = [...prev];
          updated[existing] = stats;
          return updated;
        }
        return [stats, ...prev];
      });
      callback(stats);
    });
  }, [syncService]);

  /**
   * S'abonner aux sessions actives
   */
  const subscribeToActiveSessions = useCallback((callback: (session: RealtimeSessionInfo) => void) => {
    return syncService.subscribeToActiveSessions((session) => {
      setActiveSessions(prev => {
        const existing = prev.findIndex(s => s.session_id === session.session_id);
        if (existing >= 0) {
          const updated = [...prev];
          updated[existing] = session;
          return updated;
        }
        return [session, ...prev];
      });
      callback(session);
    });
  }, [syncService]);

  /**
   * Obtenir l'ID du magasin
   */
  const getStoreId = useCallback(() => {
    return syncService.getStoreId();
  }, [syncService]);

  // Exposer storeId directement pour faciliter l'utilisation
  const storeId = syncService.getStoreId();

  return {
    // État
    syncStatus,
    recentSales,
    vendorStats,
    activeSessions,
    storeId,  // 🆕 ID de la tablette
    
    // Actions
    syncSale,
    syncVendorStats,
    updateSession,
    
    // Chargement
    loadRecentSales,
    loadVendorStats,
    loadActiveSessions,
    
    // Subscriptions
    subscribeToSales,
    subscribeToVendorStats,
    subscribeToActiveSessions,
    
    // Utils
    getStoreId
  };
}

