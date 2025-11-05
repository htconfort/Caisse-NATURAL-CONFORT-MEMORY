/**
 * Hook personnalisé pour gérer les factures externes
 * Intégration avec l'application MyConfort
 * Version: 3.8.1
 */

import { useCallback, useEffect, useState } from 'react';
import { externalInvoiceService } from '../services/externalInvoiceService';
import type { InvoicePayload } from '../types';

interface ExternalInvoiceStats {
  total: number;
  today: number;
  totalAmount: number;
  todayAmount: number;
  paidCount: number;
  pendingCount: number;
}

export const useExternalInvoices = () => {
  const [invoices, setInvoices] = useState<InvoicePayload[]>([]);
  const [stats, setStats] = useState<ExternalInvoiceStats>({
    total: 0,
    today: 0,
    totalAmount: 0,
    todayAmount: 0,
    paidCount: 0,
    pendingCount: 0
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Charger les factures
  const loadInvoices = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Récupérer toutes les factures
      const allInvoices = externalInvoiceService.getAllInvoices();
      setInvoices(allInvoices);
      
      // Récupérer les statistiques
      const currentStats = externalInvoiceService.getStatistics();
      setStats(currentStats);
      
      console.log(`📊 ${allInvoices.length} factures externes chargées`);
    } catch (err) {
      console.error('❌ Erreur chargement factures externes:', err);
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Synchroniser avec l'API
  const syncWithAPI = useCallback(async (forceRun?: boolean, runPayload?: unknown[]) => {
    try {
      setIsLoading(true);
      setError(null);
      
      // 🚫 DÉSACTIVÉ pour éviter les boucles infinies
      console.log('🚫 syncWithAPI désactivé pour éviter les boucles infinies');
      setIsLoading(false);
      return;
      
      const success = await externalInvoiceService.syncWithAPI(forceRun, runPayload);
      if (success) {
        // Recharger les factures après sync
        await loadInvoices();
      } else {
        setError('Échec de la synchronisation');
      }
    } catch (err) {
      console.error('❌ Erreur synchronisation:', err);
      setError(err instanceof Error ? err.message : 'Erreur de synchronisation');
    } finally {
      setIsLoading(false);
    }
  }, [loadInvoices]);

  // Recevoir une nouvelle facture manuellement
  const receiveInvoice = useCallback(async (payload: InvoicePayload) => {
    try {
      const success = externalInvoiceService.receiveInvoice(payload);
      if (success) {
        await loadInvoices(); // Recharger après insertion
        return true;
      } else {
        setError('Échec de l\'ajout de la facture');
        return false;
      }
    } catch (err) {
      console.error('❌ Erreur ajout facture:', err);
      setError(err instanceof Error ? err.message : 'Erreur d\'ajout');
      return false;
    }
  }, [loadInvoices]);

  // Supprimer une facture
  const removeInvoice = useCallback(async (invoiceNumber: string) => {
    try {
      const success = externalInvoiceService.removeInvoice(invoiceNumber);
      if (success) {
        await loadInvoices(); // Recharger après suppression
        return true;
      } else {
        setError('Facture non trouvée');
        return false;
      }
    } catch (err) {
      console.error('❌ Erreur suppression facture:', err);
      setError(err instanceof Error ? err.message : 'Erreur de suppression');
      return false;
    }
  }, [loadInvoices]);

  // Nettoyer toutes les factures
  const clearAllInvoices = useCallback(async () => {
    try {
      externalInvoiceService.clearAllInvoices();
      await loadInvoices(); // Recharger après nettoyage
      return true;
    } catch (err) {
      console.error('❌ Erreur nettoyage factures:', err);
      setError(err instanceof Error ? err.message : 'Erreur de nettoyage');
      return false;
    }
  }, [loadInvoices]);

  // Obtenir les factures du jour
  const getTodayInvoices = useCallback(() => {
    return externalInvoiceService.getTodayInvoices();
  }, []);

  // Obtenir une facture par numéro
  const getInvoiceByNumber = useCallback((invoiceNumber: string) => {
    return externalInvoiceService.getInvoiceByNumber(invoiceNumber);
  }, []);

  // Charger les factures au montage du hook
  useEffect(() => {
    loadInvoices();
  }, [loadInvoices]);

  // Réagir immédiatement aux mises à jour externes du service
  useEffect(() => {
    const onUpdated = () => {
      // Forcer le service à se recharger depuis localStorage avant de relire
      try { externalInvoiceService.refreshFromStorage?.(); } catch {}
      loadInvoices();
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('external-invoices-updated', onUpdated as EventListener);
    }
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('external-invoices-updated', onUpdated as EventListener);
      }
    };
  }, [loadInvoices]);

  // Démarrer la synchronisation automatique
  useEffect(() => {
    externalInvoiceService.startAutoSync();
    
    // Nettoyer au démontage
    return () => {
      externalInvoiceService.stopAutoSync();
    };
  }, []);

  // 🚫 DÉSACTIVÉ : Recharger périodiquement les factures (pour éviter les boucles infinies)
  // useEffect(() => {
  //   const interval = setInterval(() => {
  //     loadInvoices();
  //   }, 60000); // Recharger toutes les minutes

  //   return () => clearInterval(interval);
  // }, [loadInvoices]);

  return {
    // État
    invoices,
    stats,
    isLoading,
    error,
    
    // Actions
    loadInvoices,
    syncWithAPI,
    receiveInvoice,
    removeInvoice,
    clearAllInvoices,
    
    // Utilitaires
    getTodayInvoices,
    getInvoiceByNumber,
    
    // État dérivé
    hasInvoices: invoices.length > 0,
    hasTodayInvoices: stats.today > 0,
    totalValue: stats.totalAmount,
    todayValue: stats.todayAmount
  };
};

export default useExternalInvoices;
