import React, { useState } from 'react';
import type { StockItem } from '@/services/syncService';

interface StockOverviewProps {
  stockItems: StockItem[];
  loading: boolean;
  stats: {
    totalProducts: number;
    lowStockItems: number;
    totalAvailable: number;
    totalReserved: number;
    categoriesCount: number;
  };
}

export const StockOverview: React.FC<StockOverviewProps> = ({ stockItems, loading, stats: _stats }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'name' | 'category' | 'available' | 'reserved'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Obtenir les catégories uniques
  const categories = Array.from(new Set(stockItems.map(item => item.category))).sort();

  // Filtrer et trier les stocks
  const getFilteredStock = () => {
    let filtered = [...stockItems];

    // Filtrer par recherche
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(item => 
        item.productName.toLowerCase().includes(query) ||
        item.category.toLowerCase().includes(query)
      );
    }

    // Filtrer par catégorie
    if (categoryFilter !== 'all') {
      filtered = filtered.filter(item => item.category === categoryFilter);
    }

    // Trier
    filtered.sort((a, b) => {
      let aValue: string | number = '';
      let bValue: string | number = '';

      switch (sortBy) {
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
      }

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        const comparison = aValue.localeCompare(bValue);
        return sortOrder === 'desc' ? -comparison : comparison;
      }

      if (typeof aValue === 'number' && typeof bValue === 'number') {
        const comparison = aValue - bValue;
        return sortOrder === 'desc' ? -comparison : comparison;
      }

      return 0;
    });

    return filtered;
  };

  const getStockLevel = (item: StockItem): 'low' | 'normal' | 'high' => {
    const ratio = item.availableQuantity / Math.max(item.totalQuantity, 1);
    if (ratio < 0.2) return 'low';
    if (ratio > 0.8) return 'high';
    return 'normal';
  };

  const getStockLevelColor = (level: 'low' | 'normal' | 'high') => {
    const colors = {
      low: 'text-red-600 bg-red-100',
      normal: 'text-yellow-600 bg-yellow-100',
      high: 'text-green-600 bg-green-100'
    };
    return colors[level];
  };

  const getStockLevelIcon = (level: 'low' | 'normal' | 'high') => {
    const icons = {
      low: '🔴',
      normal: '🟡',
      high: '🟢'
    };
    return icons[level];
  };

  const filteredStock = getFilteredStock();

  if (loading && stockItems.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mb-4"></div>
        <p className="text-lg text-gray-600">Calcul des stocks...</p>
      </div>
    );
  }

  return (
    <div>
      {/* Filtres et recherche */}
      <div className="card p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="md:col-span-2">
            <input
              type="text"
              placeholder="Rechercher un produit..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>
          <div>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            >
              <option value="all">Toutes catégories</option>
              {categories.map(category => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
          </div>
          <div className="flex gap-2">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            >
              <option value="name">Nom</option>
              <option value="category">Catégorie</option>
              <option value="available">Disponible</option>
              <option value="reserved">Réservé</option>
            </select>
            <button
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              title={`Tri ${sortOrder === 'asc' ? 'croissant' : 'décroissant'}`}
            >
              {sortOrder === 'asc' ? '↑' : '↓'}
            </button>
          </div>
        </div>
      </div>

      {/* Tableau des stocks */}
      {filteredStock.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-xl text-gray-600">
            {stockItems.length === 0 ? 'Aucun stock disponible' : 'Aucun produit ne correspond aux filtres'}
          </p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Produit
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Catégorie
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Disponible
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Réservé
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    En livraison
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Statut
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredStock.map((item, index) => {
                  const stockLevel = getStockLevel(item);
                  return (
                    <tr key={`${item.category}-${item.productName}`} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="font-medium text-gray-900">{item.productName}</div>
                        <div className="text-sm text-gray-500">
                          Mis à jour: {new Date(item.lastUpdated).toLocaleDateString('fr-FR')}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                          {item.category}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <span className="text-lg font-semibold">{item.totalQuantity}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <span className="text-lg font-semibold text-green-600">{item.availableQuantity}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <span className="text-lg font-semibold text-orange-600">{item.reservedQuantity}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <span className="text-lg font-semibold text-blue-600">{item.pendingDelivery}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStockLevelColor(stockLevel)}`}>
                          {getStockLevelIcon(stockLevel)} {stockLevel}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Statistiques en bas */}
      <div className="mt-6 text-center text-sm text-gray-600">
        Affichage de {filteredStock.length} produit(s) sur {stockItems.length} total
      </div>
    </div>
  );
};
