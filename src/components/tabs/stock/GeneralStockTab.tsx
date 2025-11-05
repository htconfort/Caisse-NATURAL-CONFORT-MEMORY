import { AlertTriangle, CheckCircle, Lock, Package, Search } from 'lucide-react';
import React, { useEffect, useMemo, useState } from 'react';
import { productCatalog } from '../../../data';
import '../../../styles/general-stock-compact.css';
import type { CatalogProduct, ProductCategory } from '../../../types';
import { PinModal } from '../../ui/PinModal';

interface GeneralStockItem {
  productName: string;
  category: ProductCategory;
  priceTTC: number;
  currentStock: number;
  reservedStock: number;
  availableStock: number;
  minStockAlert: number;
  lastUpdated: Date;
  status: 'ok' | 'low' | 'out';
  minStock: number;
}

export const GeneralStockTab: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<ProductCategory | 'Tous'>('Tous');
  const [stockData, setStockData] = useState<GeneralStockItem[]>([]);
  const [isEditUnlocked, setIsEditUnlocked] = useState(false);
  const [showPinModal, setShowPinModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [stockQuantities, setStockQuantities] = useState<Record<string, number>>({
    'Protège-matelas 180 x 200': 129,
    'Protège-matelas 90 x 200': 66
  });

  // Générer les données de stock à partir du catalogue de produits
  const generateStockFromCatalog = (): GeneralStockItem[] => {
    return productCatalog.map((product: CatalogProduct) => {
      const productKey = product.name;
      // Utiliser la quantité personnalisée ou une valeur par défaut simulée
      const currentStock = stockQuantities[productKey] ?? Math.floor(Math.random() * 50) + 5;
      const reservedStock = Math.floor(Math.random() * 5);
      const availableStock = Math.max(0, currentStock - reservedStock);
      const minStockAlert = 5;
      
      let status: 'ok' | 'low' | 'out' = 'ok';
      if (currentStock === 0) status = 'out';
      else if (currentStock <= minStockAlert) status = 'low';

      return {
        productName: product.name,
        category: product.category,
        priceTTC: product.priceTTC,
        currentStock,
        reservedStock,
        availableStock,
        minStockAlert,
        lastUpdated: new Date(),
        status,
        minStock: minStockAlert
      };
    });
  };

  // Charger le stock général depuis le catalogue de produits
  const loadGeneralStock = () => {
    try {
      setLoading(true);
      const processedStock = generateStockFromCatalog();
      setStockData(processedStock);
      console.log(`📦 Stock général chargé: ${processedStock.length} produits depuis le catalogue`);
    } catch (error) {
      console.error('Erreur lors du chargement du stock général:', error);
    } finally {
      setLoading(false);
    }
  };

  // Charger les données au montage du composant et quand les quantités changent
  useEffect(() => {
    loadGeneralStock();
  }, [stockQuantities]); // eslint-disable-line react-hooks/exhaustive-deps

  // Fonction pour mettre à jour le stock général
  const updateGeneralStock = (productName: string, _category: string, newQuantity: number) => {
    setStockQuantities(prev => ({
      ...prev,
      [productName]: newQuantity
    }));
    
    // Mettre à jour immédiatement l'état local
    setStockData(prevData => 
      prevData.map(item => 
        item.productName === productName 
          ? {
              ...item,
              currentStock: newQuantity,
              availableStock: Math.max(0, newQuantity - item.reservedStock),
              status: newQuantity === 0 ? 'out' : newQuantity <= item.minStockAlert ? 'low' : 'ok',
              lastUpdated: new Date()
            }
          : item
      )
    );
    
    console.log(`📦 Stock général mis à jour: ${productName} = ${newQuantity}`);
  };

  // Filtrage des produits
  const filteredStock = useMemo(() => {
    return stockData.filter(item => {
      const matchesSearch = item.productName.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = selectedCategory === 'Tous' || item.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [stockData, searchTerm, selectedCategory]);

  // Statistiques de stock
  const stockStats = useMemo(() => {
    const totalItems = stockData.length;
    const outOfStock = stockData.filter(item => item.status === 'out').length;
    const lowStock = stockData.filter(item => item.status === 'low').length;
    const okStock = stockData.filter(item => item.status === 'ok').length;

    return { totalItems, outOfStock, lowStock, okStock };
  }, [stockData]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'out': return '#DC2626';
      case 'low': return '#F59E0B';
      case 'ok': return '#16A34A';
      default: return '#6B7280';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'out': return AlertTriangle;
      case 'low': return AlertTriangle;
      case 'ok': return CheckCircle;
      default: return Package;
    }
  };

  const categories: (ProductCategory | 'Tous')[] = ['Tous', 'Matelas', 'Sur-matelas', 'Couettes', 'Oreillers', 'Plateau', 'Accessoires'];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex items-center gap-3">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
          <span className="text-lg text-gray-600">Chargement du stock général...</span>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Header principal avec titre élégant et bouton d'édition */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2" style={{ 
            fontFamily: 'system-ui, -apple-system, sans-serif',
            letterSpacing: '-0.025em'
          }}>
            Stock général
          </h1>
          <div className="flex items-center gap-3">
            <p className="text-lg text-gray-600 font-medium">
              Catalogue complet de tous les produits disponibles ({productCatalog.length} produits)
            </p>
            <div className="flex items-center gap-2 px-3 py-1 bg-green-100 rounded-full">
              <Package size={14} className="text-green-600" />
              <span className="text-sm font-medium text-green-600">Catalogue</span>
            </div>
          </div>
        </div>
        
        {/* Bouton d'action */}
        <div className="flex items-center gap-3">
          {/* Bouton de verrouillage/déverrouillage de l'édition */}
          {isEditUnlocked ? (
            <button
              onClick={() => setIsEditUnlocked(false)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border-2 transition-all hover:shadow-lg"
              style={{
                borderColor: '#DC2626',
                backgroundColor: '#FEF2F2',
                color: '#DC2626'
              }}
            >
              <Lock size={16} />
              <span className="font-semibold">Verrouiller l'édition</span>
            </button>
          ) : (
            <button
              onClick={() => setShowPinModal(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border-2 transition-all hover:shadow-lg"
              style={{
                borderColor: '#16A34A',
                backgroundColor: '#F0FDF4',
                color: '#16A34A'
              }}
            >
              <Lock size={16} />
              <span className="font-semibold">Déverrouiller l'édition</span>
            </button>
          )}
        </div>
      </div>

      {/* Ligne compacte : Statistiques + Recherche + Filtres */}
      <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm mb-6">
        <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center">
          
          {/* Statistiques compactes sur la gauche - Police doublée et très contrastée */}
          <div className="flex items-center gap-6 flex-wrap">
            {/* Références totales - Marron */}
            <div className="stat-item-compact flex items-center gap-3">
              <div className="p-2 rounded-lg" style={{ backgroundColor: '#FDF6E3' }}>
                <span className="text-2xl">📦</span>
              </div>
              <div>
                <div className="text-2xl font-black" style={{ color: '#654321', textShadow: '0 1px 2px rgba(0,0,0,0.3)' }}>{stockStats.totalItems}</div>
                <div className="text-sm font-bold" style={{ color: '#654321' }}>Références</div>
              </div>
            </div>

            {/* Stock OK - Vert */}
            <div className="stat-item-compact flex items-center gap-3">
              <div className="p-2 rounded-lg" style={{ backgroundColor: '#F0FDF4' }}>
                <span className="text-2xl">✅</span>
              </div>
              <div>
                <div className="text-2xl font-black" style={{ color: '#15803D', textShadow: '0 1px 2px rgba(0,0,0,0.3)' }}>{stockStats.okStock}</div>
                <div className="text-sm font-bold" style={{ color: '#15803D' }}>Stock OK</div>
              </div>
            </div>

            {/* Stock faible - Orange */}
            <div className="stat-item-compact flex items-center gap-3">
              <div className="p-2 rounded-lg" style={{ backgroundColor: '#FFFBEB' }}>
                <span className="text-2xl">⚠️</span>
              </div>
              <div>
                <div className="text-2xl font-black" style={{ color: '#EA580C', textShadow: '0 1px 2px rgba(0,0,0,0.3)' }}>{stockStats.lowStock}</div>
                <div className="text-sm font-bold" style={{ color: '#EA580C' }}>Stock faible</div>
              </div>
            </div>

            {/* Rupture - Rouge */}
            <div className="stat-item-compact flex items-center gap-3">
              <div className="p-2 rounded-lg" style={{ backgroundColor: '#FEF2F2' }}>
                <span className="text-2xl">🚨</span>
              </div>
              <div>
                <div className="text-2xl font-black" style={{ color: '#B91C1C', textShadow: '0 1px 2px rgba(0,0,0,0.3)' }}>{stockStats.outOfStock}</div>
                <div className="text-sm font-bold" style={{ color: '#B91C1C' }}>Rupture</div>
              </div>
            </div>
          </div>

          {/* Séparateur vertical */}
          <div className="hidden lg:block w-px h-12 bg-gray-200"></div>

          {/* Recherche et filtres compacts sur la droite */}
          <div className="flex flex-1 gap-3 min-w-0">
            {/* Recherche */}
            <div className="flex-1 min-w-0">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2" size={16} style={{ color: '#6B7280' }} />
                <input
                  type="text"
                  placeholder="Rechercher un produit..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm"
                  style={{ borderColor: '#D1D5DB' }}
                />
              </div>
            </div>

            {/* Filtre par catégorie */}
            <div className="w-40">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value as ProductCategory | 'Tous')}
                className="w-full px-3 py-2 border rounded-lg text-sm"
                style={{ borderColor: '#D1D5DB' }}
              >
                {categories.map(category => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </div>

            {/* Bouton de rechargement */}
            <button
              onClick={loadGeneralStock}
              className="flex items-center gap-2 px-3 py-2 border rounded-lg text-sm hover:bg-gray-50 transition-colors"
              style={{ borderColor: '#D1D5DB' }}
              title="Recharger le stock général"
            >
              <Package size={16} className="text-gray-600" />
              <span className="hidden sm:inline">Actualiser</span>
            </button>
          </div>
        </div>
      </div>

      {/* Liste des produits */}
      <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold" style={{ color: '#000000' }}>
            Catalogue général ({filteredStock.length} produits)
          </h3>
          <div className="flex items-center gap-2 text-sm" style={{ color: '#6B7280' }}>
            <Package size={16} />
            <span>💡 Tous les produits du catalogue avec gestion de stock</span>
          </div>
        </div>

        {filteredStock.length === 0 ? (
          <div className="text-center py-8">
            <Package size={48} style={{ color: '#D1D5DB', margin: '0 auto 16px' }} />
            <p className="text-lg" style={{ color: '#000000' }}>
              Aucun produit trouvé
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b-2" style={{ borderColor: '#E5E7EB' }}>
                  <th className="cell font-bold" style={{ color: '#000000' }}>Statut</th>
                  <th className="cell font-bold" style={{ color: '#000000' }}>Produit</th>
                  <th className="cell font-bold" style={{ color: '#000000' }}>Catégorie</th>
                  <th className="cell cell--amount font-bold" style={{ color: '#000000' }}>Stock actuel</th>
                  <th className="cell cell--amount font-bold" style={{ color: '#000000' }}>Stock min</th>
                  <th className="cell cell--amount font-bold" style={{ color: '#000000' }}>Dernière MAJ</th>
                </tr>
              </thead>
              <tbody>
                {filteredStock.map((item, index) => {
                  const StatusIcon = getStatusIcon(item.status);
                  const statusColor = getStatusColor(item.status);
                  
                  return (
                    <tr 
                      key={item.productName + '|' + item.lastUpdated.getTime() + '|' + index}
                      className="row-elegant"
                      style={{ borderColor: '#F3F4F6' }}
                    >
                      <td className="cell">
                        <div className="flex items-center gap-2">
                          <StatusIcon size={20} style={{ color: statusColor }} />
                          <span className={`pill ${item.status === 'ok' ? 'pill--success' : item.status === 'low' ? 'pill--info' : 'pill--danger'}`}>
                            {item.status === 'ok' ? 'OK' : item.status === 'low' ? 'Faible' : 'Rupture'}
                          </span>
                        </div>
                      </td>
                      <td className="cell">
                        <div className="cell-title" style={{ color: '#000000' }}>
                          {item.productName}
                        </div>
                      </td>
                      <td className="cell">
                        <span className="pill pill--neutral">
                          {item.category}
                        </span>
                      </td>
                      <td className="cell cell--amount">
                        {isEditUnlocked ? (
                          <input
                            type="number"
                            min="0"
                            value={item.currentStock}
                            onChange={(e) => updateGeneralStock(item.productName, item.category, parseInt(e.target.value) || 0)}
                            onKeyDown={(e) => {
                              if (e.key === 'ArrowUp') {
                                e.preventDefault();
                                updateGeneralStock(item.productName, item.category, item.currentStock + 1);
                              } else if (e.key === 'ArrowDown') {
                                e.preventDefault();
                                updateGeneralStock(item.productName, item.category, Math.max(0, item.currentStock - 1));
                              }
                            }}
                            className="w-20 px-2 py-1 text-center font-bold text-lg border rounded transition-all hover:shadow-md focus:shadow-lg focus:outline-none focus:ring-2"
                            style={{ 
                              color: statusColor,
                              borderColor: statusColor,
                              backgroundColor: item.status === 'out' ? '#FEF2F2' : 
                                             item.status === 'low' ? '#FFFBEB' : '#F0FDF4'
                            }}
                            title="Utilisez ↑/↓ pour modifier rapidement"
                          />
                        ) : (
                          <div
                            className="w-20 mx-auto px-2 py-1 text-center font-bold text-lg border rounded bg-gray-100"
                            style={{ 
                              borderColor: '#D1D5DB',
                              backgroundColor: '#F9FAFB',
                              color: statusColor,
                              opacity: 0.7
                            }}
                            title="Déverrouillez l'édition pour modifier"
                          >
                            {item.currentStock}
                          </div>
                        )}
                      </td>
                      <td className="cell cell--amount">
                        <span className="pill pill--brand">
                          {item.minStock}
                        </span>
                      </td>
                      <td className="cell cell--amount">
                        <span className="cell-sub">
                          {new Date().toLocaleString('fr-FR')}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Info sur l'inventaire */}
        <div className="mt-6 pt-4 border-t" style={{ borderColor: '#E5E7EB' }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm" style={{ color: '#6B7280' }}>
              <Package size={16} className="text-green-500" />
              <span>
                Stock général - Catalogue complet de {productCatalog.length} produits avec gestion des quantités
              </span>
            </div>
            <div className="text-xs" style={{ color: '#6B7280' }}>
              Dernière actualisation : {new Date().toLocaleTimeString('fr-FR')}
            </div>
          </div>
        </div>
      </div>

      {/* Modal PIN pour déverrouiller l'édition */}
      <PinModal
        isOpen={showPinModal}
        onClose={() => setShowPinModal(false)}
        onSuccess={() => setIsEditUnlocked(true)}
        title="Déverrouiller l'édition du stock général"
      />
    </>
  );
};
