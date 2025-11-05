/**
 * Types pour la synchronisation temps réel
 */

export interface RealtimeSale {
  id: string;
  vendor_id: string;
  vendor_name: string;
  items: RealtimeSaleItem[];
  total_amount: number;
  payment_method: 'cash' | 'card' | 'check' | 'multi';
  created_at: string;
  updated_at: string;
  canceled: boolean;
  store_location?: string; // Identifiant du magasin/iPad
  session_id?: string; // ID de session
}

export interface RealtimeSaleItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  category: string;
}

export interface RealtimeVendorStats {
  vendor_id: string;
  vendor_name: string;
  daily_sales: number;
  total_sales: number;
  last_updated: string;
  store_location?: string;
}

export interface RealtimeSessionInfo {
  session_id: string;
  store_location: string;
  vendor_id: string | null;
  vendor_name: string | null;
  started_at: string;
  last_activity: string;
  is_active: boolean;
  current_ca: number;
}

export interface SyncStatus {
  isOnline: boolean;
  lastSync: Date | null;
  pendingSyncs: number;
  error: string | null;
}

