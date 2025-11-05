/**
 * Service de gestion des ventes
 * Permet la création de ventes avec timestamps personnalisés pour le rattrapage
 */
import { db } from '@/db/schema';
import type { ExtendedCartItem, Sale, SaleDB } from '@/types';
import { ensureSession } from './sessionService';

export interface CreateSalePayload {
  vendorId?: string;
  vendorName: string;
  totalAmount: number;
  paymentMethod: 'card' | 'cash' | 'check' | 'multi';
  canceled?: boolean;
  timestamp: number; // Date de la vente (ms epoch) - IMPORTANT pour le rattrapage
  items?: ExtendedCartItem[]; // Items optionnels
  note?: string; // Note optionnelle
}

/**
 * Créer une vente avec timestamp personnalisé
 */
export async function createSale(payload: CreateSalePayload): Promise<Sale> {
  console.log('🔄 createSale appelé pour:', payload.vendorName, payload.totalAmount + '€');

  // Garantir une session active
  await ensureSession('createSale');

  const saleId = crypto.randomUUID();
  const date = new Date(payload.timestamp);

  // Objet Sale standard
  const sale: Sale = {
    id: saleId,
    vendorId: payload.vendorId || '',
    vendorName: payload.vendorName,
    totalAmount: payload.totalAmount,
    paymentMethod: payload.paymentMethod,
    date: date, // Format Date pour compatibilité
    canceled: payload.canceled ?? false,
    items: payload.items || []
  };

  // Objet SaleDB pour IndexedDB
  const saleDB: Omit<SaleDB, 'id'> = {
    saleId,
    vendorId: payload.vendorId || '',
    vendorName: payload.vendorName,
    totalAmount: payload.totalAmount,
    paymentMethod: payload.paymentMethod,
    date: payload.timestamp, // Timestamp pour index optimisé
    dateString: date.toISOString(),
    year: date.getFullYear(),
    month: date.getMonth() + 1,
    dayOfYear: Math.floor((payload.timestamp - new Date(date.getFullYear(), 0, 0).getTime()) / (1000 * 60 * 60 * 24)),
    canceled: payload.canceled ?? false,
    items: payload.items || []
  };

  // Persister dans IndexedDB
  await db.sales.add(saleDB);
  console.log('✅ Vente persistée:', saleId);

  // Mettre à jour les stats vendeuse immédiatement (et créer la vendeuse si absente)
  try {
    const vid = payload.vendorId || '';
    if (vid) {
      console.log('🔄 MAJ stats vendeuse:', vid);
      const existing = await db.vendors.get(vid);
      if (!existing) {
        console.log('🔄 Création vendeuse:', vid);
        await db.vendors.add({
          id: vid,
          name: payload.vendorName,
          lastSaleDate: undefined as unknown as number,
          totalSales: 0,
          dailySales: 0,
          lastUpdate: Date.now()
        });
      }
      await db.updateVendorStats(vid);
      console.log('✅ Stats vendeuse mises à jour:', vid);
      // notifier l'UI potentielle
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('vendor-stats-updated', { detail: { vendorId: vid } }));
        console.log('🔄 Dispatch vendor-stats-updated:', vid);
      }
    }
  } catch (e) {
    console.error('❌ MAJ stats vendeuse échouée:', e);
  }

  console.log(`✅ Vente créée: ${payload.vendorName} - ${payload.totalAmount}€ le ${date.toLocaleDateString('fr-FR')}`);

  return sale;
}

/**
 * Récupérer les ventes d'une date spécifique
 */
export async function getSalesForDate(dateMs: number): Promise<SaleDB[]> {
  const startOfDay = new Date(dateMs);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(dateMs);
  endOfDay.setHours(23, 59, 59, 999);

  return await db.sales
    .where('date')
    .between(startOfDay.getTime(), endOfDay.getTime())
    .toArray();
}

/**
 * Supprimer une vente
 */
export async function deleteSale(saleId: string): Promise<void> {
  await db.sales.where('saleId').equals(saleId).delete();
  console.log(`🗑️ Vente supprimée: ${saleId}`);
}
