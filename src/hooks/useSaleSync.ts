import { useEffect, useCallback } from 'react';
import { useRealtimeSync } from './useRealtimeSync';
import type { RealtimeSale, RealtimeSaleItem } from '../types/realtime';

interface Sale {
  id: string;
  vendorId: string;
  vendorName: string;
  items: Array<{
    id: string;
    name: string;
    price: number;
    quantity: number;
    category: string;
  }>;
  totalAmount: number;
  paymentMethod: 'cash' | 'card' | 'check' | 'multi';
  date: Date;
  canceled: boolean;
}

interface Vendor {
  id: string;
  name: string;
  dailySales: number;
  totalSales: number;
}

/**
 * Hook pour synchroniser automatiquement les ventes et stats vendeurs
 * Utilise dans App.tsx pour synchroniser chaque vente
 */
export function useSaleSync() {
  const { syncSale, syncVendorStats, updateSession, getStoreId, syncStatus } = useRealtimeSync();

  /**
   * Synchroniser une vente vers Supabase
   */
  const syncSaleToSupabase = useCallback(async (sale: Sale) => {
    try {
      console.log('🚀 [useSaleSync] Début synchronisation vente:', sale.id);
      console.log('🚀 [useSaleSync] Vente complète:', sale);
      
      const realtimeSale: RealtimeSale = {
        id: sale.id,
        vendor_id: sale.vendorId,
        vendor_name: sale.vendorName,
        items: sale.items.map(item => ({
          id: item.id,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
          category: item.category
        })) as RealtimeSaleItem[],
        total_amount: sale.totalAmount,
        payment_method: sale.paymentMethod,
        created_at: sale.date.toISOString(),
        updated_at: new Date().toISOString(),
        canceled: sale.canceled,
        store_location: getStoreId()
      };

      console.log('🚀 [useSaleSync] Vente transformée pour Supabase:', realtimeSale);
      
      await syncSale(realtimeSale);
      console.log('✅ [useSaleSync] Vente synchronisée vers Supabase:', sale.id);
    } catch (error) {
      console.error('❌ [useSaleSync] Erreur sync vente:', error);
      console.error('❌ [useSaleSync] Stack:', error instanceof Error ? error.stack : 'N/A');
    }
  }, [syncSale, getStoreId]);

  /**
   * Synchroniser les stats d'un vendeur
   */
  const syncVendorToSupabase = useCallback(async (vendor: Vendor) => {
    try {
      await syncVendorStats({
        vendor_id: vendor.id,
        vendor_name: vendor.name,
        daily_sales: vendor.dailySales,
        total_sales: vendor.totalSales,
        last_updated: new Date().toISOString(),
        store_location: getStoreId()
      });
      console.log('✅ Stats vendeur synchronisées:', vendor.name);
    } catch (error) {
      console.error('❌ Erreur sync vendeur:', error);
    }
  }, [syncVendorStats, getStoreId]);

  /**
   * Mettre à jour la session active (vendeur connecté + CA)
   */
  const updateActiveSession = useCallback(async (
    vendorId: string | null,
    vendorName: string | null,
    currentCA: number
  ) => {
    try {
      await updateSession({
        session_id: getStoreId(),
        store_location: getStoreId(),
        vendor_id: vendorId,
        vendor_name: vendorName,
        started_at: new Date().toISOString(),
        last_activity: new Date().toISOString(),
        is_active: true,
        current_ca: currentCA
      });
    } catch (error) {
      console.error('❌ Erreur mise à jour session:', error);
    }
  }, [updateSession, getStoreId]);

  return {
    syncSaleToSupabase,
    syncVendorToSupabase,
    updateActiveSession,
    syncStatus,
    storeId: getStoreId()
  };
}

