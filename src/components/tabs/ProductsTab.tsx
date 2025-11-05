import { useState, useMemo } from 'react';
import type { 
  TabType, 
  Vendor, 
  CatalogProduct, 
  ProductCategory,
  CartType 
} from '../../types';
import { productCatalog } from '../../data';
import { categories } from '../../data/constants';
import { 
  extractDimensions,
  getProductNameWithoutDimensions,
  isMatressProduct,
  getCategoryBackgroundColor
} from '../../utils';
import { useDebounce } from '../../hooks/useDebounce';
import { SearchBar } from '../ui/SearchBar';
import { PriceInputModal } from '../ui/PriceInputModal';

interface ProductsTabProps {
  selectedVendor: Vendor | null;
  setActiveTab: (tab: TabType) => void;
  addToCart: (product: CatalogProduct) => void;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  cartType?: CartType;
  triggerExpandCart?: () => void;
}

export function ProductsTab({
  selectedVendor,
  setActiveTab,
  addToCart,
  searchTerm,
  setSearchTerm,
  cartType = 'classique',
  triggerExpandCart
}: ProductsTabProps) {
  // --- état catégorie + modal prix libre pour produits du catalogue
  const [selectedCategory, setSelectedCategory] = useState<ProductCategory | 'Tous'>('Matelas');
  const [showPriceModal, setShowPriceModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<CatalogProduct | null>(null);
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  // --- état pour "Divers"
  const [diversName, setDiversName] = useState('');
  const [diversPrice, setDiversPrice] = useState<string>('');

  // Ajoute "Divers" à la liste des catégories UI sans dépendre du fichier constants
  const uiCategories: (ProductCategory | 'Tous')[] = useMemo(() => {
    // évite doublon si déjà présent dans constants
    const base = categories.includes('Divers' as ProductCategory)
      ? categories
      : [...categories, 'Divers' as ProductCategory];
    return base as (ProductCategory | 'Tous')[];
  }, []);

  // Gestion du prix libre (modal) pour les produits catalogue à 0€
  const handlePriceConfirm = (product: CatalogProduct, price: number) => {
    const productWithPrice = { ...product, priceTTC: price };
    addToCart(productWithPrice);
    setShowPriceModal(false);
    setSelectedProduct(null);
  };

  // Filtrage des produits (hors "Divers" qui n'affiche pas de produits catalogue)
  const filteredProducts = useMemo(() => {
    if (selectedCategory === 'Divers') {
      return [] as CatalogProduct[];
    }

    const products = productCatalog.filter(product => {
      const matchesCategory = product.category === selectedCategory;
      const matchesSearch = debouncedSearchTerm === '' || 
        product.name.toLowerCase().includes(debouncedSearchTerm.toLowerCase());
      
      // Bloquer Matelas et Sur-matelas UNIQUEMENT si panier facturier
      const isAllowedInCartType = cartType === 'classique' || 
        !['Matelas', 'Sur-matelas'].includes(product.category);
      
      return matchesCategory && matchesSearch && isAllowedInCartType;
    });
    
    // 🔧 TRIER: Packs en premier (isPack: true), puis produits normaux
    return products.sort((a, b) => {
      if (a.isPack && !b.isPack) return -1; // a (pack) avant b
      if (!a.isPack && b.isPack) return 1;  // b (pack) avant a
      return 0; // Garder ordre original
    });
  }, [selectedCategory, debouncedSearchTerm, cartType]);

  // Validation formulaire "Divers"
  const canAddDivers = useMemo(() => {
    const amount = Number((diversPrice || '').toString().replace(',', '.'));
    return !!selectedVendor && diversName.trim().length > 0 && !Number.isNaN(amount) && amount > 0;
  }, [selectedVendor, diversName, diversPrice]);

  const handleAddDivers = () => {
    if (!selectedVendor) {
      alert('Veuillez d\'abord sélectionner une vendeuse.');
      setActiveTab('vendeuse');
      return;
    }
    const amount = Number((diversPrice || '').toString().replace(',', '.'));
    if (!diversName.trim() || Number.isNaN(amount) || amount <= 0) {
      alert('Renseignez un libellé et un prix TTC valide.');
      return;
    }

    const customProduct: CatalogProduct = {
      id: `divers-${Date.now()}`,
      name: diversName.trim(),
      category: 'Divers',
      priceTTC: amount
    };
    addToCart(customProduct);

    // reset
    setDiversName('');
    setDiversPrice('');
  };

  return (
    <div className="animate-fadeIn">
      {/* --- Catégories --- */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {uiCategories.map(category => {
          const isBlocked = cartType === 'facturier' && ['Matelas', 'Sur-matelas'].includes(category as string);
          return (
            <button
              key={category}
              onClick={() => {
                if (isBlocked) {
                  alert('⚠️ Cette catégorie est désactivée en mode "Panier facturier" pour éviter les doublons avec N8N.');
                  return;
                }
                setSelectedCategory(category as ProductCategory);
                // Déclencher l'expansion du panier à chaque sélection de catégorie
                triggerExpandCart?.();
              }}
              className={`px-6 py-3 rounded-lg font-semibold whitespace-nowrap transition-all touch-feedback ${
                selectedCategory === category
                  ? 'btn-primary text-black shadow-md'
                  : isBlocked
                    ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    : 'bg-white hover:shadow-md'
              }`}
              style={{
                color: isBlocked ? '#9CA3AF' : '#000000',
                opacity: isBlocked ? 0.6 : 1
              }}
              disabled={isBlocked}
            >
              {category}
              {isBlocked && ' 🚫'}
            </button>
          );
        })}
      </div>

      {/* --- Recherche --- */}
      <SearchBar searchTerm={searchTerm} setSearchTerm={setSearchTerm} />

      {/* --- Compteur de produits (côté catalogue) --- */}
      <div className="mb-4 p-3 bg-blue-100 rounded-lg">
        <div className="flex justify-between items-center text-sm">
          <span><strong>Total catalogue:</strong> {productCatalog.length} produits</span>
          <span>
            <strong>Affichés ({selectedCategory}):</strong>{' '}
            {selectedCategory === 'Divers' ? 0 : filteredProducts.length} produits
          </span>
        </div>
        <div className="mt-2 text-xs text-gray-600">
          Matelas: {productCatalog.filter(p => p.category === 'Matelas').length} | 
          Sur-matelas: {productCatalog.filter(p => p.category === 'Sur-matelas').length} | 
          Couettes: {productCatalog.filter(p => p.category === 'Couettes').length} | 
          Oreillers: {productCatalog.filter(p => p.category === 'Oreillers').length} | 
          Plateaux: {productCatalog.filter(p => p.category === 'Plateau').length} | 
          Accessoires: {productCatalog.filter(p => p.category === 'Accessoires').length}
        </div>
      </div>

      {/* --- Formulaire "Divers" --- */}
      {selectedCategory === 'Divers' && (
        <div
          style={{
            padding: 16,
            margin: '0 12px 16px',
            border: '2px dashed #94a3b8',
            borderRadius: 12,
            background: '#f8fafc'
          }}
        >
          <h3 style={{ marginTop: 0, marginBottom: 12, fontWeight: 700 }}>Créer un produit "Divers"</h3>
          <div style={{ display: 'grid', gap: 12, gridTemplateColumns: '2fr 1fr auto' }}>
            <input
              type="text"
              value={diversName}
              onChange={(e) => setDiversName(e.target.value)}
              placeholder="Description (ex: Pose, Livraison, Article exceptionnel…)"
              style={{ padding: 10, borderRadius: 8, border: '1px solid #cbd5e1' }}
            />
            <input
              type="number"
              inputMode="decimal"
              value={diversPrice}
              onChange={(e) => setDiversPrice(e.target.value)}
              placeholder="Prix TTC (€)"
              min="0"
              step="0.01"
              style={{ padding: 10, borderRadius: 8, border: '1px solid #cbd5e1' }}
            />
            <button
              onClick={handleAddDivers}
              disabled={!canAddDivers}
              style={{
                padding: '10px 16px',
                borderRadius: 8,
                border: 'none',
                fontWeight: 700,
                background: canAddDivers ? '#477A0C' : '#94a3b8',
                color: 'white',
                cursor: canAddDivers ? 'pointer' : 'not-allowed'
              }}
            >
              + Ajouter
            </button>
          </div>
          {!selectedVendor && (
            <div style={{ marginTop: 8, color: '#ef4444', fontSize: 13 }}>
              Sélectionnez d'abord une vendeuse pour ajouter un article "Divers".
            </div>
          )}
        </div>
      )}

      {/* --- Grille produits (catalogue) — cachée pour "Divers" --- */}
      {selectedCategory !== 'Divers' && (
        <div 
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '15px',
            width: '100%',
            maxWidth: 'calc(100% - 370px)', // Espace pour le panier optimisé
            padding: '0 12px',
            marginRight: '10px',
            height: 'calc(100vh - 300px)',
            overflowY: 'auto'
          }}
        >
          {filteredProducts.map((product, index) => {
            const isMatress = isMatressProduct(product.category);
            const dimensions = extractDimensions(product.name);
            const productNameOnly = dimensions ? getProductNameWithoutDimensions(product.name) : product.name;
            const backgroundColor = getCategoryBackgroundColor(product.category);
            const isSpecialCategory = backgroundColor !== 'white';

            const getGradientBackground = (category: string, productName?: string, product?: CatalogProduct) => {
              // Couleurs spécifiques pour les packs d'oreillers (utiliser packColor si défini)
              if (product?.packColor) {
                return product.packColor;
              }
              
              if (category === 'Oreillers' && productName) {
                const name = productName.toLowerCase();
                if (name.includes('pack oreiller 2 thalasso')) {
                  return '#dc2626'; // Rouge
                }
                if (name.includes('pack oreiller 2 dual')) {
                  return '#ea580c'; // Orange
                }
                if (name.includes('pack oreillers 150 euros, douceur et papillon')) {
                  return '#16a34a'; // Vert
                }
                if (name.includes('pack oreiller dual plus douceur')) {
                  return '#059669'; // Vert sapin
                }
                if (name.includes('pack')) {
                  return '#DC2626'; // Rouge par défaut pour les autres packs
                }
              }

              switch (category) {
                case 'Matelas':
                  return 'linear-gradient(135deg, #3B82F6 0%, #1E3A8A 100%)';
                case 'Sur-matelas':
                  return 'linear-gradient(135deg, #10B981 0%, #065F46 100%)';
                case 'Couettes':
                  return 'linear-gradient(135deg, #8B5CF6 0%, #5B21B6 100%)';
                case 'Oreillers':
                  return '#F2EFE2';
                case 'Plateau':
                  return '#000000'; // Plateaux Prestige - noir
                case 'Plateau Fraîche':
                  return 'linear-gradient(135deg, #3B82F6 0%, #1E40AF 100%)'; // Plateaux Fraîche - bleu
                case 'Accessoires':
                  return 'linear-gradient(135deg, #EAB308 0%, #854D0E 100%)';
                default:
                  return 'linear-gradient(135deg, #6B7280 0%, #374151 100%)';
              }
            };

            const discountedPrice = isMatress ? Math.round(product.priceTTC * 0.8) : product.priceTTC;

            return (
              <div
                key={`${product.name}-${index}`}
                onClick={() => {
                  if (!selectedVendor) {
                    setActiveTab('vendeuse'); // Rediriger vers l'onglet vendeuse
                  } else if (product.priceTTC === 0) {
                    // Produit à prix libre - ouvrir le modal de saisie
                    setSelectedProduct(product);
                    setShowPriceModal(true);
                  } else if (product.priceTTC > 0) {
                    // Produit avec prix fixe - ajouter directement
                    addToCart({ ...product, priceTTC: discountedPrice });
                  }
                }}
                className={`touch-feedback relative overflow-hidden transition-all hover:shadow-lg ${
                  selectedVendor ? 'cursor-pointer' : 'cursor-not-allowed'
                }`}
                style={{
                  background: getGradientBackground(product.category, product.name, product),
                  color: (product.category === 'Oreillers') ? (product.isPack ? '#FFFFFF' : '#000000') : 'white',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  alignItems: 'center',
                  textAlign: 'center',
                  padding: '12px',
                  minHeight: '160px',
                  maxHeight: '180px',
                  border: (product.category === 'Oreillers' || product.category === 'Sur-matelas' || product.category === 'Couettes' || product.category === 'Plateau' || product.category === 'Plateau Fraîche' || product.category === 'Accessoires') ? '3px solid #000000' : '1px solid rgba(0,0,0,0.1)',
                  borderRadius: '8px',
                  opacity: product.priceTTC === 0 ? 0.5 : (!selectedVendor ? 0.7 : 1),
                  transform: 'scale(1)',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                }}
              >
                {/* Badge -20% pour matelas */}
                {isMatress && (
                  <div style={{
                    position: 'absolute',
                    bottom: '4px',
                    right: '4px',
                    backgroundColor: '#FF0000',
                    color: 'white',
                    padding: '3px 6px',
                    borderRadius: '4px',
                    fontSize: '14px',
                    fontWeight: 'bold',
                    zIndex: 10,
                    lineHeight: '1'
                  }}>
                    -20%
                  </div>
                )}

                {/* Affichages spécialisés */}
                {product.category === 'Oreillers' || (product.category === 'Accessoires' && product.name.toLowerCase().includes('pack') && product.name.toLowerCase().includes('taies')) ? (
                  <>
                    {product.category === 'Accessoires' && product.name.toLowerCase().includes('taies') ? (
                      <>
                        <p style={{ color: '#FFFFFF', fontSize: '16px', fontWeight: 'normal', marginBottom: '8px', lineHeight: '1.1' }}>
                          2 taies d'oreiller
                        </p>
                        <h3 style={{ color: '#FF0000', fontSize: '28px', fontWeight: 'bold', marginBottom: '8px', lineHeight: '1.2', overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                          Fraîcheur Actif Cool
                        </h3>
                        <p style={{ color: '#FFFFFF', fontSize: '20px', fontWeight: 'bold', lineHeight: '1', margin: 0 }}>
                          {product.priceTTC > 0 ? `${discountedPrice}€` : 'Non vendu seul'}
                        </p>
                      </>
                    ) : (
                      <>
                        <p style={{ 
                          color: product.name.toLowerCase().includes('pack') ? '#FFFFFF' : '#000000',
                          fontSize: '14px',
                          fontWeight: 600,
                          marginBottom: '8px',
                          lineHeight: '1.1'
                        }}>
                          {product.name.toLowerCase().includes('pack') ? 'Pack oreillers' : 'Oreillers'}
                        </p>
                        <h3 style={{ 
                          color: product.name.toLowerCase().includes('pack') ? '#FFFFFF' : '#FF0000',
                          fontSize: '28px',
                          fontWeight: 'bold',
                          marginBottom: '8px',
                          lineHeight: '1.2',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical'
                        }}>
                          {product.name.toLowerCase().includes('pack') 
                            ? product.name.replace(/Pack\s+(de\s+)?(deux\s+)?oreillers?\s*/i, '').replace(/^oreiller\s+/i, '')
                            : productNameOnly.replace(/^Oreiller\s+/i, '')
                          }
                        </h3>
                        <p style={{ 
                          color: product.name.toLowerCase().includes('pack') ? '#FFFFFF' : '#000000',
                          fontSize: '20px',
                          fontWeight: 'bold',
                          lineHeight: '1',
                          margin: 0
                        }}>
                          {product.priceTTC > 0 ? `${discountedPrice}€` : 'Non vendu seul'}
                        </p>
                      </>
                    )}
                  </>
                ) : (product.category === 'Sur-matelas' || product.category === 'Couettes' || product.category === 'Plateau' || product.category === 'Plateau Fraîche' || product.category === 'Accessoires') ? (
                  <>
                    <h3 style={{
                      color: product.category === 'Plateau Fraîche' ? '#FFFFFF' : '#FFFFFF',
                      fontSize: '16px',
                      fontWeight: 'bold',
                      marginBottom: '4px',
                      lineHeight: '1.2',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical'
                    }}>
                      {productNameOnly}
                    </h3>
                    {dimensions && (
                      <div style={{ marginBottom: '6px' }}>
                        <p style={{
                          color: product.category === 'Plateau Fraîche' ? '#FF0000' : '#FF0000',
                          fontSize: '28px',
                          fontWeight: 'bold',
                          lineHeight: '1.1'
                        }}>
                          {dimensions}
                        </p>
                      </div>
                    )}
                    <p style={{
                      color: product.category === 'Plateau Fraîche' ? '#FFFFFF' : (product.category === 'Plateau' ? '#FFFFFF' : '#000000'),
                      fontSize: '20px',
                      fontWeight: 'bold',
                      lineHeight: '1',
                      margin: 0
                    }}>
                      {product.priceTTC > 0 ? `${discountedPrice}€` : 'Non vendu seul'}
                    </p>
                  </>
                ) : (
                  <>
                    <h3 style={{ 
                      color: '#FFFFFF',
                      fontSize: isSpecialCategory ? '16px' : '15px',
                      fontWeight: 'bold',
                      marginBottom: '4px',
                      lineHeight: '1.2',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      maxHeight: '38px'
                    }}>
                      {productNameOnly}
                    </h3>
                    {dimensions && (
                      <div style={{ marginBottom: '6px' }}>
                        <p style={{ 
                          color: (['Sur-matelas', 'Couettes'].includes(product.category)) ? '#FF0000' : '#FFFFFF',
                          fontSize: (['Sur-matelas', 'Couettes'].includes(product.category)) ? '28px' : '18px',
                          fontWeight: 'bold',
                          lineHeight: '1.1'
                        }}>
                          {dimensions}
                        </p>
                      </div>
                    )}
                    <p style={{ color: '#FFFFFF', fontSize: '20px', fontWeight: 'bold', lineHeight: '1', margin: 0 }}>
                      {product.priceTTC > 0 ? `${discountedPrice}€` : 'Non vendu seul'}
                    </p>
                  </>
                )}

                {/* Prix barré pour matelas */}
                {isMatress && product.priceTTC > 0 && (
                  <p style={{ color: isSpecialCategory ? 'white' : '#666666', textDecoration: 'line-through', fontSize: '14px', marginTop: '2px', lineHeight: '1', margin: 0 }}>
                    {product.priceTTC}€
                  </p>
                )}

                {product.priceTTC === 0 && (
                  <p style={{ color: isSpecialCategory ? '#666666' : 'var(--warning-red)', fontSize: '14px', marginTop: '2px', lineHeight: '1', margin: 0 }}>
                    ⚠️ Complémentaire
                  </p>
                )}

                {/* Indicateur vendeuse non sélectionnée */}
                {!selectedVendor && product.priceTTC > 0 && (
                  <div style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    color: 'white',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    fontSize: '12px',
                    fontWeight: 'bold',
                    textAlign: 'center',
                    zIndex: 10,
                    border: '2px solid #F59E0B',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.3)'
                  }}>
                    👤 Sélectionner<br/>une vendeuse
                  </div>
                )}
              </div>
            );
          })}
          {filteredProducts.length === 0 && (
            <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: 40, color: '#6B7280' }}>
              <p>Aucun produit trouvé</p>
            </div>
          )}
        </div>
      )}

      {/* Modal de prix libre pour un produit catalogue à 0€ */}
      {showPriceModal && selectedProduct && (
        <PriceInputModal
          isOpen={showPriceModal}
          onClose={() => { setShowPriceModal(false); setSelectedProduct(null); }}
          onConfirm={(price) => handlePriceConfirm(selectedProduct, price)}
          title={`Prix TTC pour "${selectedProduct.name}"`}
        />
      )}
    </div>
  );
}
