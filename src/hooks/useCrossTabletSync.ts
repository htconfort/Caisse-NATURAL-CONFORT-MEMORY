/**
 * Hook pour synchroniser les ventes entre toutes les tablettes
 * Chaque iPad peut voir les ventes des autres iPads en temps réel
 */

import { useEffect, useCallback } from 'react';
import { useRealtimeSync } from './useRealtimeSync';
import { getDB } from '../db/index';
import type { RealtimeSale } from '../types/realtime';
import type { Sale } from '../types';

export function useCrossTabletSync() {
  const { 
    subscribeToSales, 
    loadRecentSales, 
    syncStatus,
    storeId 
  } = useRealtimeSync();

  /**
   * Charger toutes les ventes de toutes les tablettes au démarrage
   */
  const loadAllTabletsSales = useCallback(async () => {
    try {
      console.log('🔄 Chargement des ventes de toutes les tablettes...');
      
      // Charger les 200 dernières ventes de toutes les tablettes
      const allSales = await loadRecentSales(200);
      
      if (!allSales || allSales.length === 0) {
        console.log('ℹ️ Aucune vente à synchroniser');
        return;
      }

      const db = await getDB();
      let newSalesCount = 0;
      let updatedSalesCount = 0;

      // Filtrer et sauvegarder les ventes des AUTRES tablettes
      for (const sale of allSales) {
        // Skip notre propre tablette
        if (sale.store_location === storeId) {
          continue;
        }

        // Vérifier si la vente existe déjà
        const existingSale = await db.sales.get(sale.id);

        // Transformer RealtimeSale en Sale
        const localSale: Sale = {
          id: sale.id,
          vendorId: sale.vendor_id,
          vendorName: sale.vendor_name,
          items: sale.items.map(item => ({
            ...item,
            totalPrice: item.price * item.quantity,
            addedAt: sale.created_at
          })),
          totalAmount: sale.total_amount,
          paymentMethod: sale.payment_method,
          date: sale.created_at,
          canceled: sale.canceled,
          // Marqueurs pour identifier les ventes externes
          isFromOtherTablet: true,
          originalStoreId: sale.store_location,
          syncedFromSupabase: true
        };

        if (!existingSale) {
          // Nouvelle vente à ajouter
          await db.sales.add(localSale);
          newSalesCount++;
        } else if (existingSale.canceled !== sale.canceled) {
          // Mise à jour du statut
          await db.sales.update(sale.id, { canceled: sale.canceled });
          updatedSalesCount++;
        }
      }

      if (newSalesCount > 0 || updatedSalesCount > 0) {
        console.log(`✅ Synchronisation terminée: ${newSalesCount} nouvelles ventes, ${updatedSalesCount} mises à jour`);
        
        // Déclencher un événement pour que l'UI se mette à jour
        window.dispatchEvent(new CustomEvent('cross-tablet-sync-complete', {
          detail: { newSalesCount, updatedSalesCount }
        }));
      } else {
        console.log('✅ Toutes les ventes sont déjà à jour');
      }

    } catch (error) {
      console.error('❌ Erreur lors du chargement des ventes cross-tablet:', error);
    }
  }, [loadRecentSales, storeId]);

  /**
   * S'abonner aux nouvelles ventes des autres tablettes en temps réel
   */
  useEffect(() => {
    if (!syncStatus.isOnline) {
      console.log('⏸️ Cross-tablet sync pausé (hors ligne)');
      return;
    }

    console.log('🔔 Activation de la synchronisation cross-tablet en temps réel');

    // S'abonner aux nouvelles ventes
    const unsubscribe = subscribeToSales(async (sale: RealtimeSale) => {
      // Ignorer nos propres ventes (déjà gérées par useSaleSync)
      if (sale.store_location === storeId) {
        console.log('↩️ Vente de notre tablette, ignorée:', sale.id);
        return;
      }

      console.log('📥 Nouvelle vente reçue d\'une autre tablette:', {
        id: sale.id,
        store: sale.store_location,
        vendor: sale.vendor_name,
        amount: sale.total_amount
      });

      try {
        const db = await getDB();

        // Vérifier si la vente existe déjà
        const existingSale = await db.sales.get(sale.id);
        if (existingSale) {
          console.log('ℹ️ Vente déjà présente, ignorée');
          return;
        }

        // Transformer et sauvegarder
        const localSale: Sale = {
          id: sale.id,
          vendorId: sale.vendor_id,
          vendorName: sale.vendor_name,
          items: sale.items.map(item => ({
            ...item,
            totalPrice: item.price * item.quantity,
            addedAt: sale.created_at
          })),
          totalAmount: sale.total_amount,
          paymentMethod: sale.payment_method,
          date: sale.created_at,
          canceled: sale.canceled,
          isFromOtherTablet: true,
          originalStoreId: sale.store_location,
          syncedFromSupabase: true
        };

        await db.sales.add(localSale);
        console.log('✅ Vente ajoutée depuis autre tablette:', sale.id);

        // Notifier l'UI
        window.dispatchEvent(new CustomEvent('new-cross-tablet-sale', {
          detail: { sale: localSale }
        }));

      } catch (error) {
        console.error('❌ Erreur sauvegarde vente cross-tablet:', error);
      }
    });

    return () => {
      console.log('🔇 Désabonnement cross-tablet sync');
      unsubscribe();
    };
  }, [subscribeToSales, syncStatus.isOnline, storeId]);

  /**
   * Charger les ventes au montage du hook
   */
  useEffect(() => {
    // Attendre 2 secondes après le montage pour laisser l'app se charger
    const timer = setTimeout(() => {
      if (syncStatus.isOnline) {
        loadAllTabletsSales();
      }
    }, 2000);

    return () => clearTimeout(timer);
  }, [loadAllTabletsSales, syncStatus.isOnline]);

  /**
   * Recharger périodiquement (toutes les 5 minutes) pour garantir la cohérence
   */
  useEffect(() => {
    if (!syncStatus.isOnline) return;

    const interval = setInterval(() => {
      console.log('🔄 Rechargement périodique des ventes cross-tablet...');
      loadAllTabletsSales();
    }, 5 * 60 * 1000); // 5 minutes

    return () => clearInterval(interval);
  }, [loadAllTabletsSales, syncStatus.isOnline]);

  return {
    loadAllTabletsSales,
    syncStatus,
    storeId
  };
}

