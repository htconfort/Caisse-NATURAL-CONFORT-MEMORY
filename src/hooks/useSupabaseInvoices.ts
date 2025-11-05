/**
 * Hook React pour gérer les factures Supabase
 * Intégration temps réel avec l'App Facturation
 * Version: 1.0.0 - 2025-01-24
 */

import { useState, useEffect, useCallback } from 'react';
import { supabaseInvoicesService, type SupabaseInvoice } from '../services/supabaseInvoicesService';

interface SupabaseInvoiceStats {
  total: number;
  today: number;
  totalAmount: number;
  todayAmount: number;
  completedCount: number;
  pendingCount: number;
}

export const useSupabaseInvoices = () => {
  const [invoices, setInvoices] = useState<SupabaseInvoice[]>([]);
  const [stats, setStats] = useState<SupabaseInvoiceStats>({
    total: 0,
    today: 0,
    totalAmount: 0,
    todayAmount: 0,
    completedCount: 0,
    pendingCount: 0
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  // Charger les factures
  const loadInvoices = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const data = await supabaseInvoicesService.loadAllInvoices(100);
      setInvoices(data);
      
      const currentStats = await supabaseInvoicesService.getStatistics();
      setStats(currentStats);
      
      console.log(`📊 ${data.length} factures Supabase chargées`);
    } catch (err) {
      console.error('❌ Erreur chargement factures Supabase:', err);
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Tester la connexion Supabase
  const testConnection = useCallback(async () => {
    const connected = await supabaseInvoicesService.pingSupabase();
    setIsConnected(connected);
    return connected;
  }, []);

  // Charger les factures d'aujourd'hui
  const loadTodayInvoices = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await supabaseInvoicesService.loadTodayInvoices();
      setInvoices(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Charger les factures par vendeur
  const loadInvoicesByVendor = useCallback(async (vendorId: string) => {
    try {
      setIsLoading(true);
      const data = await supabaseInvoicesService.loadInvoicesByVendor(vendorId);
      setInvoices(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Rechercher une facture par numéro
  const searchInvoice = useCallback(async (invoiceNumber: string) => {
    try {
      const invoice = await supabaseInvoicesService.getInvoiceByNumber(invoiceNumber);
      return invoice;
    } catch (err) {
      console.error('❌ Erreur recherche facture:', err);
      return null;
    }
  }, []);

  // Charger au montage
  useEffect(() => {
    testConnection();
    loadInvoices();
  }, [testConnection, loadInvoices]);

  // S'abonner aux nouvelles factures en temps réel
  useEffect(() => {
    const unsubscribeNew = supabaseInvoicesService.subscribeToNewInvoices((newInvoice) => {
      console.log('🆕 Nouvelle facture détectée:', newInvoice);
      
      // Ajouter la nouvelle facture en haut de la liste
      setInvoices(prev => [newInvoice, ...prev]);
      
      // Mettre à jour les stats
      setStats(prev => ({
        ...prev,
        total: prev.total + 1,
        today: isToday(newInvoice.created_at) ? prev.today + 1 : prev.today,
        totalAmount: prev.totalAmount + newInvoice.montant_ttc,
        todayAmount: isToday(newInvoice.created_at) 
          ? prev.todayAmount + newInvoice.montant_ttc 
          : prev.todayAmount,
        completedCount: newInvoice.status === 'completed' 
          ? prev.completedCount + 1 
          : prev.completedCount
      }));

      // Notification visuelle/sonore optionnelle
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('Nouvelle facture !', {
          body: `${newInvoice.nom_client} - ${newInvoice.montant_ttc.toFixed(2)}€`,
          icon: '/favicon.ico'
        });
      }
    });

    const unsubscribeUpdate = supabaseInvoicesService.subscribeToInvoiceUpdates((updatedInvoice) => {
      console.log('📝 Facture mise à jour:', updatedInvoice);
      
      // Mettre à jour la facture dans la liste
      setInvoices(prev => 
        prev.map(inv => inv.id === updatedInvoice.id ? updatedInvoice : inv)
      );
    });

    return () => {
      unsubscribeNew();
      unsubscribeUpdate();
    };
  }, []);

  // Actualisation automatique toutes les 20 secondes (aligné avec monitoring)
  useEffect(() => {
    const interval = setInterval(() => {
      console.log('🔄 Actualisation automatique des factures Supabase...');
      loadInvoices();
    }, 20000); // 20 secondes (au lieu de 30s pour synchronisation avec monitoring)

    return () => clearInterval(interval);
  }, [loadInvoices]);

  return {
    // État
    invoices,
    stats,
    isLoading,
    error,
    isConnected,
    
    // Actions
    loadInvoices,
    loadTodayInvoices,
    loadInvoicesByVendor,
    searchInvoice,
    testConnection,
    
    // État dérivé
    hasInvoices: invoices.length > 0,
    hasTodayInvoices: stats.today > 0,
    totalValue: stats.totalAmount,
    todayValue: stats.todayAmount
  };
};

// Helper: Vérifier si une date est aujourd'hui
function isToday(dateString: string): boolean {
  const date = new Date(dateString);
  const today = new Date();
  return date.toDateString() === today.toDateString();
}

export default useSupabaseInvoices;

