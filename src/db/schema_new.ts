// src/db/schema.ts
// Schéma IndexedDB optimisé pour MyConfort avec Dexie v4.x
import Dexie, { Table } from 'dexie';
import type {
  Sale,
  ExtendedCartItem,
  ProductCategory,
  SaleDB,
  VendorDB,
  CartItemDB,
  StockDB,
  StockMovement,
  VendorAnalytics,
  ProductAnalytics,
  SystemSettings,
  CacheEntry,
  SessionDB
} from '../types';

/**
 * Base de données MyConfort
 * - Index adaptés aux requêtes fréquentes
 * - Hooks pour cohérence
 * - Migration depuis localStorage
 */
export class MyConfortDB extends Dexie {
  // ============================================================================
  // 📊 TABLES PRINCIPALES
  // ============================================================================
  sales!: Table<SaleDB>;
  vendors!: Table<VendorDB>;
  cartItems!: Table<CartItemDB>;
  stock!: Table<StockDB>;
  stockMovements!: Table<StockMovement>;

  // ============================================================================
  // 📈 ANALYTICS
  // ============================================================================
  vendorAnalytics!: Table<VendorAnalytics>;
  productAnalytics!: Table<ProductAnalytics>;

  // ============================================================================
  // ⚙️ SYSTÈME
  // ============================================================================
  settings!: Table<SystemSettings>;
  cache!: Table<CacheEntry>;
  sessions!: Table<SessionDB>;

  constructor() {
    super('MyConfortCaisseV2');

    // ------------------------------------------------------------------------
    // v1
    // ------------------------------------------------------------------------
    this.version(1).stores({
      sales:
        '++id, saleId, vendorId, date, year, month, dayOfYear, totalAmount, paymentMethod, canceled, [vendorId+year], [vendorId+month], [year+month]',
      vendors:
        'id, name, lastSaleDate, totalSales, dailySales, lastUpdate',
      cartItems:
        '++id, itemId, saleId, category, name, addedAt, [saleId+category], [category+addedAt]',
      stock:
        'id, category, productName, generalStock, physicalStock, minStock, lastUpdate, [category+lastUpdate]',
      stockMovements:
        '++id, productId, type, vendorId, saleId, timestamp, [productId+timestamp], [type+timestamp], [vendorId+timestamp]',
      vendorAnalytics:
        '++id, [vendorId+period+date], vendorId, period, date, salesCount, totalAmount',
      productAnalytics:
        '++id, [productId+period+date], productId, category, period, date, salesCount, totalRevenue',
      settings:
        'key, lastUpdate, version',
      cache:
        'key, expiry, *tags'
    });

    // ------------------------------------------------------------------------
    // v2 : sessions
    // ------------------------------------------------------------------------
    this.version(2).stores({
      sessions: 'id, status, openedAt, closedAt, openedBy'
    });

    // ========================================================================
    // 🔄 HOOKS
    // ========================================================================

    // Vente : enrichir infos temporelles lors de la création
    this.sales.hook('creating', (_pk, obj) => {
      const when = obj?.date ? new Date(obj.date) : new Date();
      const t = when.getTime();
      obj.date = t;
      obj.dateString = when.toISOString();
      obj.year = when.getFullYear();
      obj.month = when.getMonth() + 1;
      obj.dayOfYear = Math.floor((t - new Date(when.getFullYear(), 0, 0).getTime()) / 86400000);
      // console.log(`📝 Nouvelle vente: ${obj.saleId ?? '(id auto)'}`);
    });

    // Vente : si annulation/changement → MAJ stats vendeur
    this.sales.hook('updating', (modifications, primKey, obj) => {
      const mods = modifications as Partial<SaleDB>;
      if (mods.canceled !== undefined) {
        // met à jour stats vendeur en asynchrone (laissé léger)
        setTimeout(() => {
          if (obj?.vendorId) void this.updateVendorStats(obj.vendorId);
        }, 100);
      }
    });

    // Mouvement de stock : appliquer automatiquement l'impact
    this.stockMovements.hook('creating', (_pk, obj) => {
      setTimeout(() => {
        void this.applyStockMovement(obj);
      }, 50);
    });
  }

  // ============================================================================
  // 🔄 GESTION DES SESSIONS DE CAISSE
  // ============================================================================

  async openSession(vendorName: string): Promise<SessionDB> {
    const now = Date.now();
    const existingSessions = await this.sessions.where('status').equals('open').toArray();
    
    if (existingSessions.length > 0) {
      throw new Error('Une session de caisse est déjà ouverte');
    }

    const newSession: SessionDB = {
      id: `session_${now}`,
      status: 'open',
      openedAt: now,
      openedBy: vendorName
    };

    await this.sessions.add(newSession);
    
    // Utiliser une interface plus flexible pour les settings
    await this.settings.put({ 
      key: 'current_session_id', 
      value: newSession.id, 
      lastUpdate: now, 
      version: '1.0',
      darkMode: false,
      outletName: ''
    } as SystemSettings);

    console.log(`🔓 Session ouverte: ${newSession.id} par ${vendorName}`);
    return newSession;
  }

  async getCurrentSession(): Promise<SessionDB | null> {
    try {
      const sessionSetting = await this.settings.get('current_session_id');
      if (!sessionSetting?.value) return null;
      
      const session = await this.sessions.get(sessionSetting.value);
      return session && session.status === 'open' ? session : null;
    } catch {
      return null;
    }
  }

  async reopenLastSession(): Promise<SessionDB> {
    const lastSession = await this.sessions.orderBy('openedAt').reverse().first();
    
    if (lastSession && lastSession.status === 'open') {
      return lastSession;
    }

    if (lastSession) {
      const keep = { ...lastSession, status: 'open' as const, closedAt: undefined };
      await this.sessions.put(keep);
      
      await this.settings.put({ 
        key: 'current_session_id', 
        value: keep.id, 
        lastUpdate: Date.now(), 
        version: '1.0',
        darkMode: false,
        outletName: ''
      } as SystemSettings);
      
      console.log(`🔄 Session rouverte: ${keep.id}`);
      return keep;
    }

    const now = Date.now();
    const newSession: SessionDB = {
      id: `session_${now}`,
      status: 'open',
      openedAt: now,
      openedBy: 'Système'
    };

    await this.sessions.add(newSession);
    await this.settings.put({ 
      key: 'current_session_id', 
      value: newSession.id, 
      lastUpdate: now, 
      version: '1.0',
      darkMode: false,
      outletName: ''
    } as SystemSettings);

    console.log(`🆕 Nouvelle session: ${newSession.id}`);
    return newSession;
  }

  async closeSession(): Promise<void> {
    const current = await this.getCurrentSession();
    if (!current) {
      console.warn('❌ Aucune session active à fermer');
      return;
    }

    const closedAt = Date.now();
    const closedSession = {
      ...current,
      status: 'closed' as const,
      closedAt
    };

    await this.sessions.put(closedSession);
    await this.settings.put({ 
      key: 'current_session_id', 
      value: null as unknown as string, 
      lastUpdate: closedAt, 
      version: '1.0',
      darkMode: false,
      outletName: ''
    } as SystemSettings);

    console.log(`🔒 Session fermée: ${current.id}`);
  }

  // ============================================================================
  // 📊 GESTION DES STATS VENDEURS
  // ============================================================================

  async updateVendorStats(vendorId: string): Promise<void> {
    try {
      const sales = await this.sales
        .where('vendorId').equals(vendorId)
        .and(sale => !sale.canceled)
        .toArray();

      const totalSales = sales.reduce((sum, sale) => sum + sale.totalAmount, 0);
      const today = new Date().toDateString();
      const dailySales = sales
        .filter(sale => new Date(sale.date).toDateString() === today)
        .reduce((sum, sale) => sum + sale.totalAmount, 0);

      const lastSale = sales.reduce((latest, sale) => 
        (!latest || sale.date > latest.date) ? sale : latest, null as SaleDB | null);

      await this.vendors.update(vendorId, {
        totalSales,
        dailySales,
        lastSaleDate: lastSale?.date,
        lastUpdate: Date.now()
      });
    } catch (error) {
      console.error(`❌ Erreur MAJ stats vendeur ${vendorId}:`, error);
    }
  }

  // ============================================================================
  // 📦 GESTION DU STOCK
  // ============================================================================

  async applyStockMovement(movement: StockMovement): Promise<void> {
    try {
      const currentStock = await this.stock.get(movement.productId);
      
      if (!currentStock) {
        console.warn(`⚠️ Produit ${movement.productId} inexistant en stock`);
        return;
      }

      const newPhysicalStock = Math.max(0, currentStock.physicalStock + movement.quantity);
      
      await this.stock.update(movement.productId, {
        physicalStock: newPhysicalStock,
        lastUpdate: Date.now()
      });

      console.log(`📦 Stock MAJ: ${movement.productId} → ${newPhysicalStock}`);
    } catch (error) {
      console.error(`❌ Erreur application mouvement stock:`, error);
    }
  }

  // ============================================================================
  // 🔄 MIGRATION DEPUIS LOCALSTORAGE
  // ============================================================================

  async migrateFromLocalStorage(): Promise<void> {
    try {
      const migrationCompleted = await this.settings.get('migration_completed');
      if (migrationCompleted?.value) {
        console.log('✅ Migration déjà effectuée');
        return;
      }

      console.log('🔄 Migration depuis localStorage...');

      // Migration des ventes
      const salesData = localStorage.getItem('sales');
      if (salesData) {
        const sales: Sale[] = JSON.parse(salesData);
        const salesDB: SaleDB[] = sales.map(sale => ({
          ...sale,
          saleId: sale.id,
          date: new Date(sale.date).getTime(),
          dateString: new Date(sale.date).toISOString(),
          year: new Date(sale.date).getFullYear(),
          month: new Date(sale.date).getMonth() + 1,
          dayOfYear: Math.floor((new Date(sale.date).getTime() - new Date(new Date(sale.date).getFullYear(), 0, 0).getTime()) / 86400000),
          canceled: false
        }));
        await this.sales.bulkAdd(salesDB);
        console.log(`📊 ${salesDB.length} ventes migrées`);
      }

      // Migration des vendeurs
      const vendorsData = localStorage.getItem('vendors');
      if (vendorsData) {
        const vendors: VendorDB[] = JSON.parse(vendorsData);
        await this.vendors.bulkAdd(vendors);
        console.log(`👥 ${vendors.length} vendeurs migrés`);
      }

      // Migration des items
      const itemsData = localStorage.getItem('cartItems');
      if (itemsData) {
        const items: ExtendedCartItem[] = JSON.parse(itemsData);
        const itemsDB: CartItemDB[] = items.map(item => ({
          ...item,
          itemId: item.id,
          addedAt: Date.now()
        }));
        await this.cartItems.bulkAdd(itemsDB);
        console.log(`🛍️ ${itemsDB.length} items migrés`);
      }

      // Migration du stock
      const stockData = localStorage.getItem('stock');
      if (stockData) {
        const stock: StockDB[] = JSON.parse(stockData);
        await this.stock.bulkAdd(stock);
        console.log(`📦 ${stock.length} produits stock migrés`);
      }

      // Marquer comme terminé avec la nouvelle interface
      await this.settings.put({
        key: 'migration_completed',
        value: true,
        lastUpdate: Date.now(),
        version: '1.0',
        darkMode: false,
        outletName: ''
      } as SystemSettings);

      console.log('✅ Migration terminée avec succès');
    } catch (error) {
      console.error('❌ Erreur lors de la migration:', error);
      throw error;
    }
  }

  // ============================================================================
  // 🧹 UTILITAIRES DE NETTOYAGE
  // ============================================================================

  async cleanOldData(daysToKeep: number = 90): Promise<void> {
    const cutoffDate = Date.now() - (daysToKeep * 24 * 60 * 60 * 1000);
    
    try {
      // Nettoyage analytics anciennes
      const deletedVendorAnalytics = await this.vendorAnalytics
        .where('date').below(cutoffDate).delete();
      const deletedProductAnalytics = await this.productAnalytics
        .where('date').below(cutoffDate).delete();
      
      // Nettoyage cache expiré
      const deletedCache = await this.cache
        .where('expiry').below(Date.now()).delete();
      
      console.log(`🧹 Nettoyage: ${deletedVendorAnalytics} analytics vendeurs, ${deletedProductAnalytics} analytics produits, ${deletedCache} entrées cache`);
    } catch (error) {
      console.error('❌ Erreur nettoyage:', error);
    }
  }

  // ============================================================================
  // 📈 MÉTHODES D'ANALYTICS RAPIDES
  // ============================================================================

  async getVendorDailyStats(vendorId: string, date?: Date): Promise<{sales: number, amount: number}> {
    const targetDate = date || new Date();
    const startOfDay = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate()).getTime();
    const endOfDay = startOfDay + 24 * 60 * 60 * 1000 - 1;

    const sales = await this.sales
      .where('vendorId').equals(vendorId)
      .and(sale => sale.date >= startOfDay && sale.date <= endOfDay && !sale.canceled)
      .toArray();

    return {
      sales: sales.length,
      amount: sales.reduce((sum, sale) => sum + sale.totalAmount, 0)
    };
  }

  async getTopProducts(category?: ProductCategory, limit: number = 10): Promise<Array<{productName: string, category: ProductCategory, sales: number}>> {
    let query = this.cartItems.toCollection();
    
    if (category) {
      query = this.cartItems.where('category').equals(category);
    }

    const items = await query.toArray();
    
    const productStats = items.reduce((acc, item) => {
      const key = `${item.category}:${item.name}`;
      if (!acc[key]) {
        acc[key] = { productName: item.name, category: item.category, sales: 0 };
      }
      acc[key].sales += item.quantity;
      return acc;
    }, {} as Record<string, {productName: string, category: ProductCategory, sales: number}>);

    return Object.values(productStats)
      .sort((a, b) => b.sales - a.sales)
      .slice(0, limit);
  }

  /**
   * CA mensuel avec pré-calculs optimisés
   */
  async getMonthlySales(year: number, month: number): Promise<SaleDB[]> {
    return this.sales
      .where('[year+month]').equals([year, month])
      .and(sale => !sale.canceled)
      .toArray();
  }

  /**
   * Top produits par catégorie - requête analytics optimisée
   */
  async getTopProductsByCategory(category: ProductCategory, limit: number = 10): Promise<Array<{productName: string, totalSold: number, revenue: number}>> {
    const items = await this.cartItems
      .where('category').equals(category)
      .toArray();
    
    // Groupement et calculs
    const productStats = new Map<string, {quantity: number, revenue: number}>();
    
    items.forEach(item => {
      const current = productStats.get(item.name) || {quantity: 0, revenue: 0};
      current.quantity += item.quantity;
      current.revenue += item.price * item.quantity;
      productStats.set(item.name, current);
    });
    
    // Tri par quantité vendue
    return Array.from(productStats.entries())
      .map(([name, stats]) => ({
        productName: name,
        totalSold: stats.quantity,
        revenue: stats.revenue
      }))
      .sort((a, b) => b.totalSold - a.totalSold)
      .slice(0, limit);
  }

  /**
   * Nettoyage du cache expiré
   */
  async cleanExpiredCache(): Promise<number> {
    const now = Date.now();
    const expiredItems = await this.cache.where('expiry').below(now).toArray();
    
    if (expiredItems.length > 0) {
      await this.cache.where('expiry').below(now).delete();
      console.log(`🧹 ${expiredItems.length} entrées cache supprimées`);
    }
    
    return expiredItems.length;
  }
}

// ============================================================================
// 🏗️ SINGLETON AVEC PROTECTION SSR
// ============================================================================

let dbInstance: MyConfortDB | null = null;

export const getDB = (): MyConfortDB => {
  // Protection SSR
  if (typeof window === 'undefined') {
    throw new Error('IndexedDB non disponible côté serveur');
  }

  if (!dbInstance) {
    dbInstance = new MyConfortDB();
  }
  
  return dbInstance;
};

// Export par défaut pour compatibilité
export default getDB;

// ============================================================================
// 🌍 SINGLETON PATTERN GLOBAL
// ============================================================================

declare global {
  interface Window {
    __MYCONFORT_DB__?: MyConfortDB;
  }
}

/** Instance unique de la base de données MyConfort (singleton via window) */
export const db: MyConfortDB =
  window.__MYCONFORT_DB__ ?? (window.__MYCONFORT_DB__ = new MyConfortDB());

console.debug('DB singleton loaded from:', import.meta.url);

// Nettoyage automatique du cache au démarrage (Dexie v4+)
if (!db.isOpen()) {
  db.open()
    .then(() => {
      console.log('MyConfort Database is ready');
      db.cleanExpiredCache();
    })
    .catch((error) => {
      console.error('Failed to open database:', error);
    });
} else {
  console.log('MyConfort Database is ready (already open)');
  db.cleanExpiredCache();
}

// ============================================================================
// 🛠️ UTILITAIRES DE CONVERSION - Helpers pour vos composants
// ============================================================================

/** Parse any date-like input to a valid Date without using `any` */
const toDateSafe = (input: unknown): Date => {
  if (input instanceof Date) return input;
  if (typeof input === 'string' || typeof input === 'number') {
    const d = new Date(input);
    return isNaN(d.getTime()) ? new Date(0) : d;
  }
  return new Date(0);
};

/** Convertir Sale → SaleDB */
export const saleToSaleDB = (sale: Sale): Omit<SaleDB, 'id'> => {
  const d = toDateSafe(sale.date);
  const safe = isNaN(d.getTime()) ? new Date(0) : d;
  return {
    ...sale,
    saleId: sale.id,     // Garder l'ID original comme saleId
    date: safe.getTime(),
    dateString: safe.toISOString(),
    year: safe.getFullYear(),
    month: safe.getMonth() + 1,
    dayOfYear: Math.floor((safe.getTime() - new Date(safe.getFullYear(), 0, 0).getTime()) / 86400000)
  } as Omit<SaleDB, 'id'>;
};

/** Convertir SaleDB → Sale */
export const saleDBToSale = (saleDB: SaleDB): Sale => {
  return {
    ...saleDB,
    id: saleDB.saleId,   // Restaurer l'ID original
    date: new Date(saleDB.date)
  } as unknown as Sale;
};

/** Convertir ExtendedCartItem → CartItemDB */
export const cartItemToCartItemDB = (item: ExtendedCartItem, saleId?: string): Omit<CartItemDB, 'id'> => {
  return {
    ...item,
    itemId: item.id,     // Garder l'ID original comme itemId
    addedAt: item.addedAt.getTime(),
    saleId
  };
};

/** Convertir CartItemDB → ExtendedCartItem */
export const cartItemDBToCartItem = (itemDB: CartItemDB): ExtendedCartItem => {
  return {
    ...itemDB,
    id: itemDB.itemId,   // Restaurer l'ID original
    addedAt: new Date(itemDB.addedAt)
  } as unknown as ExtendedCartItem;
};
