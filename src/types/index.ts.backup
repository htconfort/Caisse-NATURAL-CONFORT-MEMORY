// Types pour l'application Caisse MyConfort

export type ProductCategory = 'Matelas' | 'Sur-matelas' | 'Couettes' | 'Oreillers' | 'Plateau' | 'Accessoires';

export interface CatalogProduct {
  name: string;
  category: ProductCategory;
  priceTTC: number; // 0 = non vendu seul
  autoCalculateHT?: boolean;
  price?: number;
  description?: string;
}

export interface ExtendedCartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  category: string;
  addedAt: Date;
}

export interface Vendor {
  id: string;
  name: string;
  dailySales: number;
  totalSales: number;
  color: string;
}

export interface Sale {
  id: string;
  vendorId: string;
  vendorName: string;
  items: ExtendedCartItem[];
  totalAmount: number;
  paymentMethod: PaymentMethod;
  date: Date;
  canceled: boolean;
}

export type PaymentMethod = 'cash' | 'card' | 'check' | 'multi';
export type TabType = 'vendeuse' | 'produits' | 'stock' | 'ventes' | 'diverses' | 'annulation' | 'ca' | 'raz' | 'factures';

// Réexports pour les fonctionnalités de factures
export * from '../services/syncService';
export * from '../hooks/useSyncInvoices';
export * from '../hooks/useStockManagement';
export * from '../hooks/useNotifications';
