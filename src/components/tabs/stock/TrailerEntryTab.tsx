import React, { useState, useMemo } from 'react';
import { Truck, Search, ArrowUp, ArrowDown, RotateCcw } from 'lucide-react';
import type { CatalogProduct, ProductCategory } from '../../../types';
import { productCatalog } from '../../../data';

interface TrailerItem extends CatalogProduct {
  currentStock: number;
  incomingQuantity: number;
  expectedDate: string;
}

export const TrailerEntryTab: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<ProductCategory | 'Tous'>('Tous');
  const [trailerQuantities, setTrailerQuantities] = useState<Record<string, number>>({});

  // Simulation des données de remorque entrée (sans matelas)
  const trailerData: TrailerItem[] = useMemo(() => {
    return productCatalog
      .filter(product => product.category !== 'Matelas') // Exclure les matelas
      .slice(0, 15)
      .map((product: CatalogProduct, index) => {
        const productKey = `trailer-${product.name}-${index}`;
        const incomingQuantity = trailerQuantities[productKey] ?? Math.floor(Math.random() * 20);
      
      return {
        ...product,
        currentStock: Math.floor(Math.random() * 30),
        incomingQuantity,
        expectedDate: new Date(Date.now() + Math.random() * 7 * 24 * 60 * 60 * 1000).toLocaleDateString('fr-FR')
      };
    });
  }, [trailerQuantities]);

  // Fonction pour mettre à jour les quantités en remorque
  const updateTrailerQuantity = (productKey: string, newQuantity: number) => {
    setTrailerQuantities(prev => ({
      ...prev,
      [productKey]: Math.max(0, newQuantity)
    }));
  };

  // Filtrage des produits
  const filteredTrailer = useMemo(() => {
    return trailerData.filter(item => {
      const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = selectedCategory === 'Tous' || item.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [trailerData, searchTerm, selectedCategory]);

  // Statistiques de la remorque
  const trailerStats = useMemo(() => {
    const totalItems = trailerData.length;
    const totalIncoming = trailerData.reduce((sum, item) => sum + item.incomingQuantity, 0);
    const totalValue = trailerData.reduce((sum, item) => sum + (item.incomingQuantity * item.priceTTC), 0);
    const itemsWithStock = trailerData.filter(item => item.incomingQuantity > 0).length;

    return { totalItems, totalIncoming, totalValue, itemsWithStock };
  }, [trailerData]);

  const categories: (ProductCategory | 'Tous')[] = ['Tous', 'Sur-matelas', 'Couettes', 'Oreillers', 'Plateau', 'Accessoires'];

  return (
    <div>
      {/* En-tête avec information */}
      <div className="card mb-6" style={{ backgroundColor: '#EFF6FF', borderLeft: '4px solid #3B82F6' }}>
        <div className="flex items-center gap-3">
          <Truck size={24} style={{ color: '#3B82F6' }} />
          <div>
            <h3 className="text-lg font-bold" style={{ color: '#000000' }}>
              Gestion Remorque d'Entrée
            </h3>
            <p className="text-sm" style={{ color: '#6B7280' }}>
              Suivi des marchandises en cours de livraison et réception
            </p>
          </div>
        </div>
      </div>

      {/* Statistiques de la remorque */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="card text-center" style={{ borderLeft: '4px solid #3B82F6' }}>
          <div className="text-2xl font-bold" style={{ color: '#3B82F6' }}>{trailerStats.totalItems}</div>
          <div className="text-sm font-semibold" style={{ color: '#000000' }}>Références en remorque</div>
        </div>
        <div className="card text-center" style={{ borderLeft: '4px solid #16A34A' }}>
          <div className="text-2xl font-bold" style={{ color: '#16A34A' }}>{trailerStats.itemsWithStock}</div>
          <div className="text-sm font-semibold" style={{ color: '#000000' }}>Produits en stock</div>
        </div>
        <div className="card text-center" style={{ borderLeft: '4px solid #14281D' }}>
          <div className="text-2xl font-bold" style={{ color: '#000000' }}>{trailerStats.totalIncoming}</div>
          <div className="text-sm font-semibold" style={{ color: '#000000' }}>Unités totales</div>
        </div>
        <div className="card text-center" style={{ borderLeft: '4px solid #7C3AED' }}>
          <div className="text-2xl font-bold" style={{ color: '#7C3AED' }}>{trailerStats.totalValue.toFixed(0)}€</div>
          <div className="text-sm font-semibold" style={{ color: '#000000' }}>Valeur totale</div>
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
                placeholder="Rechercher un produit en remorque..."
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
              // Action pour transférer tout vers le stock général
              console.log('Transfert vers stock général');
            }}
          >
            <ArrowUp size={18} />
            Transférer vers Stock
          </button>
          <button 
            className="flex items-center gap-2 px-4 py-2 rounded-lg font-semibold transition-colors"
            style={{ backgroundColor: '#14281D', color: '#FFFFFF' }}
            onClick={() => {
              // Action pour retour fournisseur
              console.log('Retour fournisseur');
            }}
          >
            <ArrowDown size={18} />
            Retour Fournisseur
          </button>
          <button 
            className="flex items-center gap-2 px-4 py-2 rounded-lg font-semibold transition-colors"
            style={{ backgroundColor: '#6B7280', color: 'white' }}
            onClick={() => {
              setTrailerQuantities({});
            }}
          >
            <RotateCcw size={18} />
            Réinitialiser
          </button>
        </div>
      </div>

      {/* Liste des produits en remorque */}
      <div className="card">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold" style={{ color: '#000000' }}>
            Inventaire Remorque ({filteredTrailer.length} produits)
          </h3>
          <div className="flex items-center gap-2 text-sm" style={{ color: '#6B7280' }}>
            <Truck size={16} />
            <span>🚛 Produits en attente de réception et traitement</span>
          </div>
        </div>

        {filteredTrailer.length === 0 ? (
          <div className="text-center py-8">
            <Truck size={48} style={{ color: '#D1D5DB', margin: '0 auto 16px' }} />
            <p className="text-lg" style={{ color: '#000000' }}>
              Aucun produit trouvé en remorque
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b-2" style={{ borderColor: '#E5E7EB' }}>
                  <th className="text-left py-3 px-4 font-bold" style={{ color: '#000000' }}>Produit</th>
                  <th className="text-left py-3 px-4 font-bold" style={{ color: '#000000' }}>Catégorie</th>
                  <th className="text-center py-3 px-4 font-bold" style={{ color: '#000000' }}>Stock actuel</th>
                  <th className="text-center py-3 px-4 font-bold" style={{ color: '#000000' }}>Quantité remorque</th>
                  <th className="text-center py-3 px-4 font-bold" style={{ color: '#000000' }}>Date prévue</th>
                  <th className="text-right py-3 px-4 font-bold" style={{ color: '#000000' }}>Prix TTC</th>
                  <th className="text-right py-3 px-4 font-bold" style={{ color: '#000000' }}>Valeur</th>
                  <th className="text-center py-3 px-4 font-bold" style={{ color: '#000000' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredTrailer.map((item, index) => {
                  const productKey = `trailer-${item.name}-${index}`;
                  const hasStock = item.incomingQuantity > 0;
                  
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
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-sm" style={{ color: '#6B7280' }}>
                          {item.category}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="text-sm font-semibold" style={{ color: '#6B7280' }}>
                          {item.currentStock}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <input
                          type="number"
                          min="0"
                          value={item.incomingQuantity}
                          onChange={(e) => updateTrailerQuantity(productKey, parseInt(e.target.value) || 0)}
                          onKeyDown={(e) => {
                            if (e.key === 'ArrowUp') {
                              e.preventDefault();
                              updateTrailerQuantity(productKey, item.incomingQuantity + 1);
                            } else if (e.key === 'ArrowDown') {
                              e.preventDefault();
                              updateTrailerQuantity(productKey, Math.max(0, item.incomingQuantity - 1));
                            }
                          }}
                          className="w-20 px-2 py-1 text-center font-bold text-lg border rounded transition-all hover:shadow-md focus:shadow-lg focus:outline-none focus:ring-2"
                          style={{ 
                            color: hasStock ? '#3B82F6' : '#6B7280',
                            borderColor: hasStock ? '#3B82F6' : '#D1D5DB',
                            backgroundColor: hasStock ? '#EFF6FF' : '#F9FAFB'
                          }}
                          title="Utilisez ↑/↓ pour modifier rapidement"
                        />
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="text-sm" style={{ color: '#6B7280' }}>
                          {item.expectedDate}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span className="font-semibold" style={{ color: '#000000' }}>
                          {item.priceTTC > 0 ? `${item.priceTTC.toFixed(2)}€` : 'N/A'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span className="font-bold" style={{ color: hasStock ? '#3B82F6' : '#6B7280' }}>
                          {item.priceTTC > 0 ? `${(item.incomingQuantity * item.priceTTC).toFixed(2)}€` : 'N/A'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        {hasStock && (
                          <div className="flex gap-1 justify-center">
                            <button
                              onClick={() => console.log(`Recevoir ${item.name}`)}
                              className="px-2 py-1 text-xs rounded font-semibold"
                              style={{ backgroundColor: '#16A34A', color: 'white' }}
                              title="Recevoir en stock"
                            >
                              ✓
                            </button>
                            <button
                              onClick={() => console.log(`Retourner ${item.name}`)}
                              className="px-2 py-1 text-xs rounded font-semibold"
                              style={{ backgroundColor: '#DC2626', color: 'white' }}
                              title="Retour fournisseur"
                            >
                              ✗
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Résumé de la valeur totale */}
        {filteredTrailer.length > 0 && (
          <div className="mt-6 pt-4 border-t" style={{ borderColor: '#E5E7EB' }}>
            <div className="flex justify-between items-center">
              <span className="text-lg font-semibold" style={{ color: '#000000' }}>
                Valeur totale en remorque :
              </span>
              <span className="text-2xl font-bold" style={{ color: '#3B82F6' }}>
                {filteredTrailer
                  .reduce((sum, item) => sum + (item.incomingQuantity * item.priceTTC), 0)
                  .toFixed(2)}€
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
