import React, { useState, useMemo, useEffect } from 'react';
import { Store, Search, Users, TrendingUp, Calendar } from 'lucide-react';
import type { CatalogProduct, ProductCategory } from '../../../types';
import { productCatalog } from '../../../data';

interface StandItem extends CatalogProduct {
  standStock: number;
  soldToday: number;
  reservations: number;
  lastSaleTime: string;
}

export const StandEntryTab: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<ProductCategory | 'Tous'>('Tous');
  const [standQuantities, setStandQuantities] = useState<Record<string, number>>({});
  const [isInitialized, setIsInitialized] = useState(false);

  // Produits filtrés (sans matelas ni packs d'oreillers)
  const filteredProducts = useMemo(() => {
    return productCatalog
      .filter(product => 
        product.category !== 'Matelas' && // Exclure les matelas
        !product.name.toLowerCase().includes('pack') // Exclure les packs d'oreillers
      )
      .slice(0, 20);
  }, []);

  // Initialisation des quantités une seule fois
  useEffect(() => {
    if (!isInitialized && filteredProducts.length > 0) {
      const initialQuantities: Record<string, number> = {};
      
      filteredProducts.forEach((product, index) => {
        const productKey = `stand-${product.name}-${index}`;
        // Générer une quantité stable basée sur l'index et le nom du produit
        const seed = product.name.length + index;
        initialQuantities[productKey] = Math.floor((seed * 7) % 15) + 1;
      });
      
      setStandQuantities(initialQuantities);
      setIsInitialized(true);
    }
  }, [filteredProducts, isInitialized]);

  // Simulation des données du stand d'entrée
  const standData: StandItem[] = useMemo(() => {
    if (!isInitialized) return [];
    
    return filteredProducts.map((product: CatalogProduct, index) => {
      const productKey = `stand-${product.name}-${index}`;
      const standStock = standQuantities[productKey] ?? 0;
      
      // Générer des données stables basées sur l'index
      const seed = product.name.length + index;
      
      return {
        ...product,
        standStock,
        soldToday: Math.floor((seed * 3) % 5),
        reservations: Math.floor((seed * 2) % 3),
        lastSaleTime: (seed % 2) === 0 ? 
          new Date(Date.now() - (seed * 60 * 60 * 1000) % (24 * 60 * 60 * 1000)).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) :
          'Aucune vente'
      };
    });
  }, [filteredProducts, standQuantities, isInitialized]);

  // Fonction pour mettre à jour les quantités du stand
  const updateStandQuantity = (productKey: string, newQuantity: number) => {
    setStandQuantities(prev => ({
      ...prev,
      [productKey]: Math.max(0, newQuantity)
    }));
  };

  // Filtrage des produits
  const filteredStand = useMemo(() => {
    return standData.filter(item => {
      const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = selectedCategory === 'Tous' || item.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [standData, searchTerm, selectedCategory]);

  // Statistiques du stand
  const standStats = useMemo(() => {
    const totalItems = standData.length;
    const totalStandStock = standData.reduce((sum, item) => sum + item.standStock, 0);
    const totalSoldToday = standData.reduce((sum, item) => sum + item.soldToday, 0);
    const totalReservations = standData.reduce((sum, item) => sum + item.reservations, 0);

    return { totalItems, totalStandStock, totalSoldToday, totalReservations };
  }, [standData]);

  const categories: (ProductCategory | 'Tous')[] = ['Tous', 'Sur-matelas', 'Couettes', 'Oreillers', 'Plateau', 'Accessoires'];

  return (
    <div>
      {/* En-tête avec information */}
      <div className="card mb-6" style={{ backgroundColor: '#F0FDF4', borderLeft: '4px solid #16A34A' }}>
        <div className="flex items-center gap-3">
          <Store size={24} style={{ color: '#16A34A' }} />
          <div>
            <h3 className="text-lg font-bold" style={{ color: '#000000' }}>
              Gestion Stand d'Entrée
            </h3>
            <p className="text-sm" style={{ color: '#6B7280' }}>
              Produits exposés en vitrine et espace d'accueil client
            </p>
          </div>
        </div>
      </div>

      {/* Statistiques du stand */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
        <div className="card text-center" style={{ borderLeft: '4px solid #16A34A' }}>
          <div className="text-2xl font-bold" style={{ color: '#16A34A' }}>{standStats.totalItems}</div>
          <div className="text-sm font-semibold" style={{ color: '#000000' }}>Produits exposés</div>
        </div>
        <div className="card text-center" style={{ borderLeft: '4px solid #3B82F6' }}>
          <div className="text-2xl font-bold" style={{ color: '#3B82F6' }}>{standStats.totalStandStock}</div>
          <div className="text-sm font-semibold" style={{ color: '#000000' }}>Stock vitrine</div>
        </div>
        <div className="card text-center" style={{ borderLeft: '4px solid #14281D' }}>
          <div className="text-2xl font-bold" style={{ color: '#000000' }}>{standStats.totalSoldToday}</div>
          <div className="text-sm font-semibold" style={{ color: '#000000' }}>Vendus aujourd'hui</div>
        </div>
        <div className="card text-center" style={{ borderLeft: '4px solid #7C3AED' }}>
          <div className="text-2xl font-bold" style={{ color: '#7C3AED' }}>{standStats.totalReservations}</div>
          <div className="text-sm font-semibold" style={{ color: '#000000' }}>Réservations</div>
        </div>
      </div>

      {/* Filtres */}
      <div className="card mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Recherche */}
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2" size={20} style={{ color: '#6B7280' }} />
              <input
                type="text"
                placeholder="Rechercher un produit en vitrine..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border rounded-lg text-lg"
                style={{ borderColor: '#D1D5DB' }}
              />
            </div>
          </div>

          {/* Filtre par catégorie */}
          <div className="md:w-64">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value as ProductCategory | 'Tous')}
              className="w-full px-4 py-3 border rounded-lg text-lg"
              style={{ borderColor: '#D1D5DB' }}
            >
              {categories.map(category => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Actions rapides */}
      <div className="card mb-6">
        <div className="flex flex-wrap gap-3">
          <button 
            className="flex items-center gap-2 px-4 py-2 rounded-lg font-semibold transition-colors"
            style={{ backgroundColor: '#16A34A', color: 'white' }}
            onClick={() => {
              console.log('Réapprovisionner depuis le stock');
            }}
          >
            <TrendingUp size={18} />
            Réapprovisionner
          </button>
          <button 
            className="flex items-center gap-2 px-4 py-2 rounded-lg font-semibold transition-colors"
            style={{ backgroundColor: '#3B82F6', color: 'white' }}
            onClick={() => {
              console.log('Voir les réservations');
            }}
          >
            <Users size={18} />
            Réservations
          </button>
          <button 
            className="flex items-center gap-2 px-4 py-2 rounded-lg font-semibold transition-colors"
            style={{ backgroundColor: '#14281D', color: '#FFFFFF' }}
            onClick={() => {
              console.log('Rapport de vente');
            }}
          >
            <Calendar size={18} />
            Rapport du jour
          </button>
        </div>
      </div>

      {/* Liste des produits du stand */}
      <div className="card">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold" style={{ color: '#000000' }}>
            Inventaire Stand ({filteredStand.length} produits)
          </h3>
          <div className="flex items-center gap-2 text-sm" style={{ color: '#6B7280' }}>
            <Store size={16} />
            <span>🏪 Produits en exposition et vente directe</span>
          </div>
        </div>

        {filteredStand.length === 0 ? (
          <div className="text-center py-8">
            <Store size={48} style={{ color: '#D1D5DB', margin: '0 auto 16px' }} />
            <p className="text-lg" style={{ color: '#000000' }}>
              Aucun produit trouvé au stand
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b-2" style={{ borderColor: '#E5E7EB' }}>
                  <th className="text-left py-3 px-4 font-bold" style={{ color: '#000000' }}>Produit</th>
                  <th className="text-left py-3 px-4 font-bold" style={{ color: '#000000' }}>Catégorie</th>
                  <th className="text-center py-3 px-4 font-bold" style={{ color: '#000000' }}>Stock vitrine</th>
                  <th className="text-center py-3 px-4 font-bold" style={{ color: '#000000' }}>Vendus</th>
                  <th className="text-center py-3 px-4 font-bold" style={{ color: '#000000' }}>Réservés</th>
                  <th className="text-center py-3 px-4 font-bold" style={{ color: '#000000' }}>Dernière vente</th>
                </tr>
              </thead>
              <tbody>
                {filteredStand.map((item, index) => {
                  const productKey = `stand-${item.name}-${index}`;
                  const currentStock = standQuantities[productKey] ?? 0;
                  const lowStock = currentStock <= 2 && currentStock > 0;
                  const outOfStock = currentStock === 0;
                  
                  return (
                    <tr 
                      key={productKey}
                      className="border-b hover:bg-gray-50 transition-colors"
                      style={{ borderColor: '#F3F4F6' }}
                    >
                      <td className="py-3 px-4">
                        <div className="font-semibold" style={{ color: '#000000' }}>
                          {item.name}
                        </div>
                        {item.soldToday > 0 && (
                          <div className="text-xs" style={{ color: '#16A34A' }}>
                            🔥 Produit populaire
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-sm" style={{ color: '#6B7280' }}>
                          {item.category}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <input
                          type="number"
                          min="0"
                          value={standQuantities[productKey] ?? 0}
                          onChange={(e) => updateStandQuantity(productKey, parseInt(e.target.value) || 0)}
                          onKeyDown={(e) => {
                            if (e.key === 'ArrowUp') {
                              e.preventDefault();
                              updateStandQuantity(productKey, (standQuantities[productKey] ?? 0) + 1);
                            } else if (e.key === 'ArrowDown') {
                              e.preventDefault();
                              updateStandQuantity(productKey, Math.max(0, (standQuantities[productKey] ?? 0) - 1));
                            }
                          }}
                          className="w-20 px-2 py-1 text-center font-bold text-lg border rounded transition-all hover:shadow-md focus:shadow-lg focus:outline-none focus:ring-2"
                          style={{ 
                            color: outOfStock ? '#DC2626' : lowStock ? '#000000' : '#16A34A',
                            borderColor: outOfStock ? '#DC2626' : lowStock ? '#14281D' : '#16A34A',
                            backgroundColor: outOfStock ? '#FEF2F2' : lowStock ? '#FFFBEB' : '#F0FDF4'
                          }}
                          title="Utilisez ↑/↓ pour modifier rapidement"
                        />
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span 
                          className="text-lg font-bold"
                          style={{ color: item.soldToday > 0 ? '#16A34A' : '#6B7280' }}
                        >
                          {item.soldToday}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span 
                          className="text-lg font-bold"
                          style={{ color: item.reservations > 0 ? '#7C3AED' : '#6B7280' }}
                        >
                          {item.reservations}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span 
                          className="text-sm"
                          style={{ color: item.lastSaleTime !== 'Aucune vente' ? '#16A34A' : '#6B7280' }}
                        >
                          {item.lastSaleTime}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
