import { useState, useEffect, useCallback } from 'react';
// import { syncService, type StockItem } from '@/services/syncService'; // Temporairement désactivé

// Stub temporaire pour StockItem
export interface StockItem {
  productName: string;
  category: string;
  available: number;
  reserved: number;
  delivered: number;
}

// Stub temporaire pour syncService
const syncService = {
  getStockItems: () => [] as StockItem[],
  addListener: () => () => {},
  updateItemStatus: () => Promise.resolve(true)
};

export interface StockFilter {
  category?: string;
  status?: 'low' | 'normal' | 'high';
  sortBy?: 'name' | 'category' | 'available' | 'reserved';
  sortOrder?: 'asc' | 'desc';
}

/**
 * Hook pour gérer les stocks basés sur les factures
 */
export const useStockManagement = () => {
  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Récupération des données de stock
  const fetchStockData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const stockData = await syncService.getStockOverview();
      setStockItems(stockData);
      setLastUpdated(new Date());
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur lors du chargement des stocks';
      setError(errorMessage);
      console.error('Erreur stock:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Filtrage et tri des stocks
  const filterAndSortStock = useCallback((filters: StockFilter) => {
    let filtered = [...stockItems];

    // Filtrer par catégorie
    if (filters.category) {
      filtered = filtered.filter((item: StockItem) => item.category === filters.category);
    }

    // Filtrer par statut de stock
    if (filters.status) {
      filtered = filtered.filter((item: StockItem) => {
        const stockLevel = getStockLevel(item);
        return stockLevel === filters.status;
      });
    }

    // Trier
    if (filters.sortBy) {
      filtered.sort((a: StockItem, b: StockItem) => {
        let aValue: string | number = '';
        let bValue: string | number = '';

        switch (filters.sortBy) {
          case 'name':
            aValue = a.productName;
            bValue = b.productName;
            break;
          case 'category':
            aValue = a.category;
            bValue = b.category;
            break;
          case 'available':
            aValue = a.availableQuantity;
            bValue = b.availableQuantity;
            break;
          case 'reserved':
            aValue = a.reservedQuantity;
            bValue = b.reservedQuantity;
            break;
          default:
            return 0;
        }

        if (typeof aValue === 'string' && typeof bValue === 'string') {
          const comparison = aValue.localeCompare(bValue);
          return filters.sortOrder === 'desc' ? -comparison : comparison;
        }

        if (typeof aValue === 'number' && typeof bValue === 'number') {
          const comparison = aValue - bValue;
          return filters.sortOrder === 'desc' ? -comparison : comparison;
        }

        return 0;
      });
    }

    return filtered;
  }, [stockItems]);

  // Obtenir le niveau de stock (low/normal/high)
  const getStockLevel = useCallback((item: StockItem): 'low' | 'normal' | 'high' => {
    const ratio = item.availableQuantity / Math.max(item.totalQuantity, 1);
    
    if (ratio < 0.2) return 'low';
    if (ratio > 0.8) return 'high';
    return 'normal';
  }, []);

  // Obtenir les statistiques globales
  const getStockStats = useCallback(() => {
    const stats = {
      totalProducts: stockItems.length,
      lowStockItems: 0,
      totalAvailable: 0,
      totalReserved: 0,
      categoriesCount: new Set<string>()
    };

    stockItems.forEach((item: StockItem) => {
      if (getStockLevel(item) === 'low') {
        stats.lowStockItems++;
      }
      stats.totalAvailable += item.availableQuantity;
      stats.totalReserved += item.reservedQuantity;
      stats.categoriesCount.add(item.category);
    });

    return {
      ...stats,
      categoriesCount: stats.categoriesCount.size
    };
  }, [stockItems, getStockLevel]);

  // Rechercher dans les stocks
  const searchStock = useCallback((query: string) => {
    if (!query.trim()) return stockItems;
    
    const lowercaseQuery = query.toLowerCase();
    return stockItems.filter((item: StockItem) => 
      item.productName.toLowerCase().includes(lowercaseQuery) ||
      item.category.toLowerCase().includes(lowercaseQuery)
    );
  }, [stockItems]);

  // Obtenir les catégories uniques
  const getCategories = useCallback(() => {
    const categories = new Set<string>();
    stockItems.forEach((item: StockItem) => categories.add(item.category));
    return Array.from(categories).sort();
  }, [stockItems]);

  // Effet pour le chargement initial
  useEffect(() => {
    fetchStockData();
    
    // Écouter les événements de mise à jour
    const unsubscribe = syncService.addListener((data: any) => {
      if (data.type === 'item_status_updated') {
        // Actualiser les stocks après une mise à jour
        setTimeout(fetchStockData, 1000); // Délai pour laisser le temps à la sync
      }
    });
    
    return unsubscribe;
  }, [fetchStockData]);

  // Rafraîchissement automatique toutes les 5 minutes
  useEffect(() => {
    const interval = setInterval(() => {
      fetchStockData();
    }, 5 * 60 * 1000); // 5 minutes

    return () => clearInterval(interval);
  }, [fetchStockData]);

  return {
    stockItems,
    loading,
    error,
    lastUpdated,
    fetchStockData,
    filterAndSortStock,
    getStockLevel,
    getStockStats,
    searchStock,
    getCategories
  };
};
