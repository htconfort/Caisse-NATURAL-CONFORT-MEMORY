import { Edit3, Minus, Package, Plus, Save, X } from 'lucide-react';
import React, { useMemo, useState } from 'react';
import { productCatalog } from '../../data';
import { categories } from '../../data/constants';
import type { CatalogProduct, ProductCategory } from '../../types';

interface ProductFormData {
  name: string;
  category: ProductCategory;
  priceTTC: number;
  description?: string;
}

export const ProductsManagement: React.FC = () => {
  const [products, setProducts] = useState<CatalogProduct[]>(productCatalog);
  const [selectedCategory, setSelectedCategory] = useState<ProductCategory | 'all'>('all');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<CatalogProduct | null>(null);
  const [formData, setFormData] = useState<ProductFormData>({
    name: '',
    category: 'Matelas',
    priceTTC: 0,
    description: ''
  });

  // Grouper les produits par catégorie
  const productsByCategory = useMemo(() => {
    const grouped: Record<ProductCategory, CatalogProduct[]> = {
      'Matelas': [],
      'Sur-matelas': [],
      'Couettes': [],
      'Oreillers': [],
      'Plateau': [],
      'Accessoires': [],
      'Divers': []
    };

    products.forEach(product => {
      if (grouped[product.category]) {
        grouped[product.category].push(product);
      }
    });

    return grouped;
  }, [products]);

  // Filtrer les catégories à afficher
  const categoriesToShow = selectedCategory === 'all' ? categories : [selectedCategory];

  const handleAddProduct = () => {
    if (!formData.name.trim() || formData.priceTTC <= 0) return;

    const newProduct: CatalogProduct = {
      id: `product-${Date.now()}`,
      name: formData.name.trim(),
      category: formData.category,
      priceTTC: formData.priceTTC,
      autoCalculateHT: true,
      description: formData.description?.trim() || undefined
    };

    setProducts([...products, newProduct]);
    setFormData({ name: '', category: 'Matelas', priceTTC: 0, description: '' });
    setShowAddForm(false);
  };

  const handleEditProduct = (product: CatalogProduct) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      category: product.category,
      priceTTC: product.priceTTC,
      description: product.description || ''
    });
    setShowAddForm(true);
  };

  const handleUpdateProduct = () => {
    if (!editingProduct || !formData.name.trim() || formData.priceTTC <= 0) return;

    const updatedProducts = products.map(p => 
      p === editingProduct 
        ? { ...p, name: formData.name.trim(), priceTTC: formData.priceTTC, description: formData.description?.trim() || undefined }
        : p
    );

    setProducts(updatedProducts);
    setEditingProduct(null);
    setFormData({ name: '', category: 'Matelas', priceTTC: 0, description: '' });
    setShowAddForm(false);
  };

  const handleDeleteProduct = (product: CatalogProduct) => {
    if (confirm(`Êtes-vous sûr de vouloir supprimer le produit "${product.name}" ?`)) {
      setProducts(products.filter(p => p !== product));
    }
  };

  const cancelForm = () => {
    setShowAddForm(false);
    setEditingProduct(null);
    setFormData({ name: '', category: 'Matelas', priceTTC: 0, description: '' });
  };

  return (
    <div>
      {/* En-tête gestion produits */}
      <div style={{
        background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
        color: 'white',
        padding: '20px',
        borderRadius: '8px',
        marginBottom: '20px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '20px' }}>
            <Package size={24} style={{ marginRight: '10px', verticalAlign: 'middle' }} />
            Gestion des Produits
          </h2>
          <p style={{ margin: '8px 0 0 0', opacity: 0.9 }}>
            {products.length} produits dans {categories.length} catégories
          </p>
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          style={{
            background: 'rgba(255,255,255,0.2)',
            color: 'white',
            border: '2px solid rgba(255,255,255,0.3)',
            borderRadius: '8px',
            padding: '12px 20px',
            cursor: 'pointer',
            fontSize: '16px',
            fontWeight: 'bold',
            transition: 'all 0.3s ease',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <Plus size={20} />
          Ajouter un produit
        </button>
      </div>

      {/* Filtres par catégorie */}
      <div style={{ 
        display: 'flex', 
        gap: '10px', 
        marginBottom: '20px', 
        flexWrap: 'wrap',
        alignItems: 'center'
      }}>
        <span style={{ fontWeight: 'bold', color: '#495057' }}>Filtrer par catégorie :</span>
        <button
          onClick={() => setSelectedCategory('all')}
          style={{
            padding: '8px 16px',
            border: '2px solid #f59e0b',
            borderRadius: '20px',
            background: selectedCategory === 'all' ? '#f59e0b' : 'white',
            color: selectedCategory === 'all' ? 'white' : '#f59e0b',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: 'bold',
            transition: 'all 0.2s ease'
          }}
        >
          Toutes ({products.length})
        </button>
        {categories.map(category => (
          <button
            key={category}
            onClick={() => setSelectedCategory(category)}
            style={{
              padding: '8px 16px',
              border: '2px solid #f59e0b',
              borderRadius: '20px',
              background: selectedCategory === category ? '#f59e0b' : 'white',
              color: selectedCategory === category ? 'white' : '#f59e0b',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 'bold',
              transition: 'all 0.2s ease'
            }}
          >
            {category} ({productsByCategory[category].length})
          </button>
        ))}
      </div>

      {/* Formulaire d'ajout/modification */}
      {showAddForm && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'white',
            padding: '30px',
            borderRadius: '12px',
            maxWidth: '500px',
            width: '90%',
            maxHeight: '90vh',
            overflowY: 'auto'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ margin: 0, fontSize: '20px', color: '#343a40' }}>
                {editingProduct ? 'Modifier le produit' : 'Ajouter un nouveau produit'}
              </h3>
              <button
                onClick={cancelForm}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '24px',
                  cursor: 'pointer',
                  color: '#6c757d'
                }}
              >
                <X size={24} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <div>
                <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px', color: '#495057' }}>
                  Nom du produit *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ex: MATELAS BAMBOU 140 x 190"
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '2px solid #dee2e6',
                    borderRadius: '8px',
                    fontSize: '16px'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px', color: '#495057' }}>
                  Catégorie *
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value as ProductCategory })}
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '2px solid #dee2e6',
                    borderRadius: '8px',
                    fontSize: '16px'
                  }}
                >
                  {categories.map(category => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px', color: '#495057' }}>
                  Prix TTC (€) *
                </label>
                <input
                  type="number"
                  value={formData.priceTTC}
                  onChange={(e) => setFormData({ ...formData, priceTTC: Number(e.target.value) })}
                  placeholder="0"
                  min="0"
                  step="0.01"
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '2px solid #dee2e6',
                    borderRadius: '8px',
                    fontSize: '16px'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px', color: '#495057' }}>
                  Description (optionnelle)
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Description du produit..."
                  rows={3}
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '2px solid #dee2e6',
                    borderRadius: '8px',
                    fontSize: '16px',
                    resize: 'vertical'
                  }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px', marginTop: '25px', justifyContent: 'flex-end' }}>
              <button
                onClick={cancelForm}
                style={{
                  padding: '12px 20px',
                  border: '2px solid #6c757d',
                  borderRadius: '8px',
                  background: 'white',
                  color: '#6c757d',
                  cursor: 'pointer',
                  fontSize: '16px',
                  fontWeight: 'bold'
                }}
              >
                Annuler
              </button>
              <button
                onClick={editingProduct ? handleUpdateProduct : handleAddProduct}
                disabled={!formData.name.trim() || formData.priceTTC <= 0}
                style={{
                  padding: '12px 20px',
                  border: 'none',
                  borderRadius: '8px',
                  background: (!formData.name.trim() || formData.priceTTC <= 0) ? '#6c757d' : '#f59e0b',
                  color: 'white',
                  cursor: (!formData.name.trim() || formData.priceTTC <= 0) ? 'not-allowed' : 'pointer',
                  fontSize: '16px',
                  fontWeight: 'bold',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <Save size={16} />
                {editingProduct ? 'Modifier' : 'Ajouter'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Liste des produits par catégorie */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {categoriesToShow.map(category => {
          const categoryProducts = productsByCategory[category];
          
          return (
            <div key={category} style={{
              backgroundColor: 'white',
              border: '2px solid #e9ecef',
              borderRadius: '12px',
              overflow: 'hidden'
            }}>
              {/* En-tête de catégorie */}
              <div style={{
                background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                color: 'white',
                padding: '15px 20px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Package size={20} />
                  <h3 style={{ margin: 0, fontSize: '18px' }}>{category}</h3>
                  <span style={{
                    backgroundColor: 'rgba(255,255,255,0.2)',
                    borderRadius: '12px',
                    padding: '2px 8px',
                    fontSize: '12px',
                    fontWeight: 'bold'
                  }}>
                    {categoryProducts.length}
                  </span>
                </div>
                <button
                  onClick={() => {
                    setFormData({ ...formData, category });
                    setShowAddForm(true);
                  }}
                  style={{
                    background: 'rgba(255,255,255,0.2)',
                    color: 'white',
                    border: '1px solid rgba(255,255,255,0.3)',
                    borderRadius: '6px',
                    padding: '8px 12px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: 'bold',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <Plus size={16} />
                  Ajouter
                </button>
              </div>

              {/* Liste des produits */}
              <div style={{ padding: '20px' }}>
                {categoryProducts.length === 0 ? (
                  <p style={{ 
                    textAlign: 'center', 
                    color: '#6c757d', 
                    fontStyle: 'italic',
                    margin: 0 
                  }}>
                    Aucun produit dans cette catégorie
                  </p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {categoryProducts.map((product, index) => (
                      <div key={index} style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '15px',
                        backgroundColor: '#f8f9fa',
                        borderRadius: '8px',
                        border: '1px solid #dee2e6'
                      }}>
                        <div style={{ flex: 1 }}>
                          <h4 style={{ margin: 0, fontSize: '16px', fontWeight: 'bold', color: '#343a40' }}>
                            {product.name}
                          </h4>
                          <p style={{ margin: '5px 0 0 0', color: '#6c757d', fontSize: '14px' }}>
                            {product.priceTTC.toFixed(2)}€ TTC
                            {product.description && ` • ${product.description}`}
                          </p>
                        </div>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button
                            onClick={() => handleEditProduct(product)}
                            style={{
                              background: '#17a2b8',
                              color: 'white',
                              border: 'none',
                              borderRadius: '6px',
                              padding: '8px',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center'
                            }}
                            title="Modifier"
                          >
                            <Edit3 size={16} />
                          </button>
                          <button
                            onClick={() => handleDeleteProduct(product)}
                            style={{
                              background: '#dc3545',
                              color: 'white',
                              border: 'none',
                              borderRadius: '6px',
                              padding: '8px',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center'
                            }}
                            title="Supprimer"
                          >
                            <Minus size={16} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
