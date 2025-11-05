import { CreditCard, Edit3, Minus, Plus, ShoppingCart, Trash2, X } from 'lucide-react';
import type { CSSProperties } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { ExtendedCartItemWithNegotiation, PriceOverrideMeta } from '../../types';
import type {
    CartType,
    PaymentDetails,
    PaymentMethod,
    TabType,
    Vendor
} from '../../types/index';
import { isMatressProduct } from '../../utils';
import { calculateFinalPrice, formatPriceDisplay } from '../../utils/CartUtils';
import { ManualInvoiceModal } from './ManualInvoiceModal';
import SimplePriceEditor from './SimplePriceEditor';

// Interface pour les données de paiement étendues
interface PaymentData {
  method:
    | ''
    | 'Carte Bleue'
    | 'Espèces'
    | 'Virement'
    | 'Chèque'
    | 'Chèque au comptant'
    | 'Chèques (3 fois)'
    | 'Chèque à venir'
    | 'Acompte'
    | 'Alma 2x'
    | 'Alma 3x'
    | 'Alma 4x'
    | 'Chèque unique'
    | 'Chèques multiples'
    | 'Paiement mixte'
    | 'Acompte + Solde';
  depositAmount?: number;
  almaInstallments?: number;
  chequesCount?: number;
  chequeAmount?: number;
  notes?: string;
}

interface FloatingCartProps {
  activeTab: TabType;
  cart: ExtendedCartItemWithNegotiation[];  // ✅ Support prix négociés
  cartItemsCount: number;
  cartTotal: number;
  selectedVendor: Vendor | null;
  clearCart: () => void;
  completeSale: (paymentMethod?: PaymentMethod, checkDetails?: { count: number; amount: number; totalAmount: number; notes?: string }, manualInvoiceData?: { clientName: string; invoiceNumber: string }, paymentDetails?: PaymentDetails) => void;
  updateQuantity?: (itemId: string, newQuantity: number) => void;
  toggleOffert?: (itemId: string) => void;
  cartType?: CartType;
  onCartTypeChange?: (type: CartType) => void;
  // ▼ NOUVEAU: Callback pour sauvegarder les prix négociés
  onPriceOverride?: (itemId: string, override: PriceOverrideMeta) => void;
  // ▼ NOUVEAU: Fonction pour forcer l'expansion du panier
  forceExpand?: boolean;
}

export function FloatingCart({
  activeTab,
  cart,
  cartItemsCount,
  cartTotal,
  selectedVendor,
  clearCart,
  completeSale,
  updateQuantity,
  toggleOffert,
  cartType = 'classique',
  onPriceOverride,
  forceExpand
}: FloatingCartProps) {
  const [isCartMinimized, setIsCartMinimized] = useState(false);
  const [showPaymentPage, setShowPaymentPage] = useState(false);
  const [showManualInvoiceModal, setShowManualInvoiceModal] = useState(false);
  const [pendingPaymentData, setPendingPaymentData] = useState<{
    method?: PaymentMethod;
    checkDetails?: { count: number; amount: number; totalAmount: number; notes?: string };
  } | null>(null);
  
  // ▼ NOUVEAU: États pour l'édition des prix
  const [showPriceEditor, setShowPriceEditor] = useState(false);
  const [editingItem, setEditingItem] = useState<ExtendedCartItemWithNegotiation | null>(null);

  // ▼ NOUVEAU: Effet pour forcer l'expansion du panier depuis l'extérieur
  useEffect(() => {
    if (forceExpand) {
      setIsCartMinimized(false);
    }
  }, [forceExpand]);

  // 🚨 DEBUG CART DISPLAY
  console.log('🛒 FloatingCart Debug:', {
    activeTab,
    cartLength: cart.length,
    cartItemsCount,
    cartTotal,
    cart: cart.map(item => ({ id: item.id, name: item.name, quantity: item.quantity, price: item.price })),
    isCartMinimized
  });

  // ▼ NOUVEAU: Fonctions gestion prix négociés
  const handleEditPrice = (item: ExtendedCartItemWithNegotiation) => {
    setEditingItem(item);
    setShowPriceEditor(true);
  };

  const handleSavePriceOverride = (itemId: string, override: PriceOverrideMeta) => {
    if (onPriceOverride) {
      onPriceOverride(itemId, override);
    }
    setShowPriceEditor(false);
    setEditingItem(null);
  };

  const handleClosePriceEditor = () => {
    setShowPriceEditor(false);
    setEditingItem(null);
  };

  // ▼ NOUVEAU: Calcul total avec négociations
  const cartTotals = useMemo(() => {
    let negotiatedTotal = 0;
    let originalTotal = 0;
    let negotiationSavings = 0;
    let negotiatedItemsCount = 0;

    cart.forEach(item => {
      const finalPrice = calculateFinalPrice(item);
      const originalPrice = item.originalPrice || item.price;
      const lineTotal = item.offert ? 0 : finalPrice * item.quantity;
      const originalLineTotal = item.offert ? 0 : originalPrice * item.quantity;

      negotiatedTotal += lineTotal;
      originalTotal += originalLineTotal;

      if (item.priceOverride?.enabled) {
        negotiatedItemsCount++;
        negotiationSavings += (originalPrice - finalPrice) * item.quantity;
      }
    });

    return {
      negotiatedTotal,
      originalTotal,
      negotiationSavings,
      negotiatedItemsCount,
      totalWithNegotiations: negotiatedTotal // Le vrai total à afficher
    };
  }, [cart]);

  // Calcul des économies
  const totalSavings = useMemo(() => {
    return cart.reduce((total, item) => {
      if (isMatressProduct(item.category)) {
        const originalPrice = Math.round(item.price / 0.8);
        const savings = (originalPrice - item.price) * item.quantity;
        return total + savings;
      }
      return total;
    }, 0);
  }, [cart]);

  // Détection de produits matelas/sur-matelas dans le panier
  const hasMatressProducts = useMemo(() => {
    return cart.some(item => isMatressProduct(item.category));
  }, [cart]);

  // Paiement mixte (2 parts)
  const [showMixedModal, setShowMixedModal] = useState(false);
  const [mixedPart1, setMixedPart1] = useState<{ method: 'Carte Bleue' | 'Espèces' | 'Virement' | 'Chèque'; amount: number }>({ method: 'Carte Bleue', amount: 0 });
  const [mixedPart2, setMixedPart2] = useState<{ method: 'Carte Bleue' | 'Espèces' | 'Virement' | 'Chèque'; amount: number }>({ method: 'Espèces', amount: 0 });
  const [mixedPaymentsState, setMixedPaymentsState] = useState<PaymentDetails['mixedPayments']>([]);

  const uiToPaymentMethod = (label: string): PaymentMethod => {
    if (label === 'Carte Bleue') return 'card';
    if (label === 'Espèces') return 'cash';
    if (label === 'Virement') return 'transfer';
    if (label === 'Chèque' || label.includes('Chèque')) return 'check';
    return 'mixed';
  };

  const handleCompleteSale = (
    paymentMethod?: PaymentMethod, 
    checkDetails?: { count: number; amount: number; totalAmount: number; notes?: string },
    paymentDetails?: PaymentDetails
  ) => {
    // Fermer la page de paiement d'abord
    setShowPaymentPage(false);
    
    // Si panier classique + matelas/sur-matelas = forcer saisie client
    if (cartType === 'classique' && hasMatressProducts) {
      setPendingPaymentData({ method: paymentMethod, checkDetails });
      setShowManualInvoiceModal(true);
      return;
    }

    // Sinon, vente normale
    completeSale(paymentMethod, checkDetails, undefined, paymentDetails);
  };

  // Fonction appelée après saisie des infos client/facture
  const handleManualInvoiceComplete = (manualInvoiceData: { clientName: string; invoiceNumber: string }) => {
    setShowManualInvoiceModal(false);
    
    if (pendingPaymentData) {
      completeSale(
        pendingPaymentData.method, 
        pendingPaymentData.checkDetails, 
        manualInvoiceData
      );
      setPendingPaymentData(null);
    }
  };

  // Ne pas afficher sur certains onglets (garder visible sur vendeuse, produits, annulation)
  if (!['vendeuse', 'produits', 'annulation', 'stock'].includes(activeTab)) {
    console.log('🚫 Cart hidden - wrong tab:', activeTab);
    return null;
  }

  console.log('✅ Cart should display - tab:', activeTab);

  // 🆕 Styles du conteneur principal - panier agrandi jusqu'en bas
  const cartPanelStyles: CSSProperties = {
    position: 'absolute',
    right: '10px',
    top: '40px', // ✅ REHAUSSÉ: de 80px à 40px (3cm plus haut)
    bottom: '10px', // Toujours jusqu'en bas, plus de place pour le ruban
    width: '370px', // ✅ ÉLARGI: de 350px à 370px (2cm plus large pour affichage prix)
    backgroundColor: 'white',
    borderRadius: '16px',
    boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
    border: '2px solid #477A0C',
    zIndex: 2000,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden'
  };

  // Mode minimisé - en haut à droite dans l'application
  if (isCartMinimized) {
    return (
      <div 
        style={{
          position: 'absolute',
          right: '20px',
          top: '20px',
          zIndex: 1000
        }}
      >
        <button
          onClick={() => setIsCartMinimized(false)}
          style={{
            backgroundColor: '#F55D3E',
            color: 'white',
            border: 'none',
            borderRadius: '50%',
            width: '60px',
            height: '60px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(245, 93, 62, 0.4)',
            transition: 'all 0.3s ease'
          }}
          onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
          onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
        >
          <ShoppingCart size={20} />
          {cartItemsCount > 0 && (
            <div
              style={{
                position: 'absolute',
                top: '-5px',
                right: '-5px',
                backgroundColor: '#FFFFFF',
                color: '#F55D3E',
                borderRadius: '50%',
                width: '20px',
                height: '20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '10px',
                fontWeight: 'bold',
                border: '2px solid #F55D3E'
              }}
            >
              {cartItemsCount}
            </div>
          )}
        </button>
      </div>
    );
  }

  return (
    <>
      <div style={cartPanelStyles}>
      
      {/* Header du panier */}
      <div 
        style={{
          background: 'linear-gradient(135deg, #477A0C 0%, #14281D 100%)',
          color: 'white',
          padding: '16px 20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <ShoppingCart size={24} />
          <div>
            <div style={{ fontSize: '18px', fontWeight: 'bold' }}>
              Mon Panier
              <span style={{ 
                marginLeft: '8px', 
                fontSize: '10px', 
                backgroundColor: 'rgba(255,255,255,0.2)', 
                padding: '2px 6px', 
                borderRadius: '4px',
                fontWeight: 'normal'
              }}>
                v3.0
              </span>
            </div>
            <div style={{ 
              fontSize: '14px', 
              opacity: 0.9
            }}>
              {cartItemsCount} articles
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* Bouton vider le panier - compact dans l'en-tête */}
          <button
            onClick={clearCart}
            disabled={cart.length === 0}
            title="Vider le panier"
            style={{
              background: cart.length === 0 ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.2)',
              border: 'none',
              color: cart.length === 0 ? 'rgba(255,255,255,0.4)' : 'white',
              borderRadius: '6px',
              padding: '8px',
              cursor: cart.length === 0 ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            onMouseEnter={(e) => {
              if (cart.length > 0) {
                e.currentTarget.style.background = 'rgba(245, 93, 62, 0.8)';
              }
            }}
            onMouseLeave={(e) => {
              if (cart.length > 0) {
                e.currentTarget.style.background = 'rgba(255,255,255,0.2)';
              }
            }}
          >
            <Trash2 size={16} />
          </button>
          
          <button
            onClick={() => setIsCartMinimized(true)}
            style={{
              background: 'rgba(255,255,255,0.2)',
              border: 'none',
              color: 'white',
              borderRadius: '6px',
              padding: '8px',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Liste des produits dans le panier */}
      {cart.length > 0 ? (
        <div style={{
          flex: 1,
          padding: '16px',
          overflowY: 'auto',
          WebkitOverflowScrolling: 'touch',
          overscrollBehavior: 'contain',
          touchAction: 'pan-y',
          borderBottom: '1px solid #e5e7eb'
        }}>
          {cart.map((item, index) => {
            console.log(`📦 Rendering item ${index}:`, item.name);
            
            // ▼ NOUVEAU: Calcul des prix négociés
            const priceInfo = formatPriceDisplay(item);
            const finalPrice = calculateFinalPrice(item);
            
            return (
            <div
              key={`${item.id}-${index}`}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '12px 0',
                borderBottom: index < cart.length - 1 ? '1px solid #f3f4f6' : 'none'
              }}
            >
              <div style={{ flex: 1 }}>
                <div style={{ 
                  fontSize: '14px', 
                  fontWeight: '600',
                  color: '#14281D',
                  marginBottom: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  {item.name}
                  {item.offert && (
                    <span style={{
                      fontSize: '10px',
                      padding: '2px 5px',
                      backgroundColor: '#dcfce7',
                      color: '#166534',
                      borderRadius: '4px',
                      fontWeight: 'bold'
                    }}>
                      🎁 Offert
                    </span>
                  )}
                  {/* ▼ NOUVEAU: Badge prix modifié ultra-discret et élégant */}
                  {priceInfo.hasOverride && (
                    <span style={{
                      fontSize: '8px',
                      padding: '1px 3px',
                      backgroundColor: '#3b82f6',
                      color: 'white',
                      borderRadius: '2px',
                      fontWeight: '600',
                      textTransform: 'uppercase',
                      letterSpacing: '0.3px'
                    }}>
                      ✏️
                    </span>
                  )}
                </div>
                {/* ▼ NOUVEAU: Affichage prix optimisé et plus visible */}
                <div style={{ 
                  fontSize: '14px', 
                  color: '#374151',
                  fontWeight: '500',
                  marginTop: '2px'
                }}>
                  {item.offert ? (
                    <span style={{ color: '#059669', fontWeight: '600' }}>
                      GRATUIT × {item.quantity}
                    </span>
                  ) : priceInfo.hasOverride ? (
                    <div style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '8px',
                      flexWrap: 'wrap'
                    }}>
                      <span style={{ 
                        textDecoration: 'line-through', 
                        color: '#9CA3AF', 
                        fontSize: '11px',
                        opacity: 0.7
                      }}>
                        {priceInfo.originalPrice.toFixed(2)}€
                      </span>
                      <span style={{ 
                        color: '#1d4ed8', 
                        fontWeight: '700',
                        fontSize: '15px'
                      }}>
                        {finalPrice.toFixed(2)}€ × {item.quantity}
                      </span>
                    </div>
                  ) : (
                    <span style={{ fontWeight: '600' }}>
                      {finalPrice.toFixed(2)}€ × {item.quantity}
                    </span>
                  )}
                </div>
              </div>
              
              {/* ▼ NOUVEAU: Bouton édition prix élégant et discret */}
              {!item.offert && onPriceOverride && (
                <button
                  onClick={() => handleEditPrice(item)}
                  style={{
                    backgroundColor: priceInfo.hasOverride ? '#dbeafe' : 'transparent',
                    color: priceInfo.hasOverride ? '#1d4ed8' : '#6B7280',
                    border: priceInfo.hasOverride ? '1px solid #3b82f6' : '1px solid #e5e7eb',
                    borderRadius: '8px',
                    padding: '4px 8px',
                    fontSize: '11px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    marginRight: '6px',
                    transition: 'all 0.3s ease',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '3px',
                    minWidth: '28px',
                    justifyContent: 'center',
                    boxShadow: priceInfo.hasOverride ? '0 1px 3px rgba(59, 130, 246, 0.2)' : 'none'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = priceInfo.hasOverride ? '#bfdbfe' : '#f9fafb';
                    e.currentTarget.style.transform = 'scale(1.05)';
                    e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = priceInfo.hasOverride ? '#dbeafe' : 'transparent';
                    e.currentTarget.style.transform = 'scale(1)';
                    e.currentTarget.style.boxShadow = priceInfo.hasOverride ? '0 1px 3px rgba(59, 130, 246, 0.2)' : 'none';
                  }}
                  title="Modifier le prix"
                >
                  <Edit3 size={10} />
                  {priceInfo.hasOverride && (
                    <span style={{ fontSize: '9px' }}>✓</span>
                  )}
                </button>
              )}
              
              {/* Bouton Offert */}
              {toggleOffert && (
                <button
                  onClick={() => toggleOffert(item.id)}
                  style={{
                    backgroundColor: item.offert ? '#dcfce7' : '#f3f4f6',
                    color: item.offert ? '#166534' : '#6B7280',
                    border: item.offert ? '1px solid #bbf7d0' : '1px solid #d1d5db',
                    borderRadius: '6px',
                    padding: '4px 8px',
                    fontSize: '12px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    marginRight: '8px',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    if (!item.offert) {
                      e.currentTarget.style.backgroundColor = '#e5e7eb';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!item.offert) {
                      e.currentTarget.style.backgroundColor = '#f3f4f6';
                    }
                  }}
                >
                  🎁 {item.offert ? 'Annuler' : 'Offert'}
                </button>
              )}
              
              {/* Contrôles de quantité */}
              {updateQuantity && (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  marginRight: '12px'
                }}>
                  <button
                    onClick={() => updateQuantity(item.id, item.quantity - 1)}
                    style={{
                      backgroundColor: '#f3f4f6',
                      border: 'none',
                      borderRadius: '4px',
                      width: '24px',
                      height: '24px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      color: '#6B7280'
                    }}
                  >
                    <Minus size={12} />
                  </button>
                  <span style={{ 
                    fontSize: '14px', 
                    fontWeight: '600',
                    minWidth: '20px',
                    textAlign: 'center'
                  }}>
                    {item.quantity}
                  </span>
                  <button
                    onClick={() => updateQuantity(item.id, item.quantity + 1)}
                    style={{
                      backgroundColor: '#f3f4f6',
                      border: 'none',
                      borderRadius: '4px',
                      width: '24px',
                      height: '24px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      color: '#6B7280'
                    }}
                  >
                    <Plus size={12} />
                  </button>
                </div>
              )}
              
              <div style={{ 
                fontSize: '14px', 
                fontWeight: 'bold',
                color: item.offert ? '#166534' : '#477A0C'
              }}>
                {item.offert ? '0.00' : (item.price * item.quantity).toFixed(2)}€
              </div>
            </div>
            );
          })}
        </div>
      ) : (
        <div style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#6B7280',
          fontSize: '14px'
        }}>
          Votre panier est vide
        </div>
      )}

      {/* Contenu principal du panier */}
      <div style={{ 
        padding: '20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '20px'
      }}>
        
        {/* Section du total */}
        <div style={{ 
          padding: '20px',
          backgroundColor: '#f8f9fa',
          borderRadius: '12px',
          border: '2px solid #477A0C',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '14px', color: '#6B7280', marginBottom: '8px' }}>
            Total TTC
          </div>
          <div style={{ 
            fontSize: '32px', 
            fontWeight: 'bold', 
            color: '#477A0C',
            lineHeight: 1
          }}>
            {cartTotals.totalWithNegotiations.toFixed(2).replace('.', ',')}€
          </div>
          
          {/* ▼ NOUVEAU: Affichage des économies simplifiées */}
          {cartTotals.negotiationSavings > 0 && (
            <div style={{ 
              fontSize: '14px', 
              color: '#0369a1', 
              marginTop: '8px',
              fontWeight: '600'
            }}>
              Économie: -{cartTotals.negotiationSavings.toFixed(2)}€
            </div>
          )}
          
          {/* Économies matelas existantes */}
          {totalSavings > 0 && (
            <div style={{ 
              fontSize: '14px', 
              color: '#F55D3E', 
              marginTop: cartTotals.negotiationSavings > 0 ? '4px' : '8px',
              fontWeight: '600'
            }}>
              Économie matelas: -{totalSavings.toFixed(2)}€
            </div>
          )}
        </div>

        {/* Section des actions simplifiées */}
        <div style={{ 
          display: 'flex',
          flexDirection: 'column',
          gap: '12px'
        }}>
          {/* Bouton Mode de paiement */}
          <button
            onClick={() => {
              if (!selectedVendor) {
                alert('⚠️ Veuillez d\'abord sélectionner une vendeuse dans l\'onglet "Vendeuse"');
                return;
              }
              if (cart.length === 0) {
                alert('⚠️ Le panier est vide');
                return;
              }
              // Ouvrir directement la page de paiement dans une nouvelle fenêtre ou modal
              setShowPaymentPage(true);
            }}
            disabled={!selectedVendor || cart.length === 0}
            style={{
              backgroundColor: (!selectedVendor || cart.length === 0) ? '#9CA3AF' : '#477A0C',
              color: 'white',
              border: 'none',
              borderRadius: '12px',
              padding: '16px',
              fontSize: '16px',
              fontWeight: 'bold',
              cursor: (!selectedVendor || cart.length === 0) ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              transition: 'all 0.2s ease',
              opacity: (!selectedVendor || cart.length === 0) ? 0.6 : 1
            }}
          >
            <CreditCard size={18} />
            {!selectedVendor ? 'Sélectionner une vendeuse' : 'Mode de paiement'}
          </button>
        </div>
      </div>

      {/* Page complète de paiement en plein écran */}
      {showPaymentPage && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'white',
          zIndex: 9999,
          overflow: 'auto'
        }}>
          <StepPaymentNoScroll 
            cartTotal={cartTotal}
            onBack={() => setShowPaymentPage(false)}
            onSelectPayment={handleCompleteSale}
          />
        </div>
      )}

      {/* Modale de saisie manuelle client/facture */}
      <ManualInvoiceModal
        isOpen={showManualInvoiceModal}
        onClose={() => {
          setShowManualInvoiceModal(false);
          setPendingPaymentData(null);
        }}
        onSave={handleManualInvoiceComplete}
        cartTotal={cartTotal}
        reason="matelas-classique"
      />
      </div>

      {/* ▼ NOUVEAU: Modal d'édition des prix simplifiée */}
      <SimplePriceEditor
        isOpen={showPriceEditor}
        item={editingItem}
        onClose={handleClosePriceEditor}
        onSave={handleSavePriceOverride}
      />

      {/* 🆕 Ruban bas de page supprimé - le panier va maintenant jusqu'en bas */}
    </>
  );
}

// Petit modal inline pour configurer un paiement mixte 2 parts
function MixedPaymentModal({
  open,
  total,
  part1,
  part2,
  onChange,
  onClose,
  onConfirm
}: {
  open: boolean;
  total: number;
  part1: { method: 'Carte Bleue' | 'Espèces' | 'Virement' | 'Chèque'; amount: number };
  part2: { method: 'Carte Bleue' | 'Espèces' | 'Virement' | 'Chèque'; amount: number };
  onChange: (p1: typeof part1, p2: typeof part2) => void;
  onClose: () => void;
  onConfirm: () => void;
}) {
  if (!open) return null;
  const methods = ['Carte Bleue', 'Espèces', 'Virement', 'Chèque'] as const;
  const sum = Number((part1.amount + part2.amount).toFixed(2));
  const valid = Math.abs(sum - total) < 0.01;

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.35)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:9999 }}>
      <div style={{ background:'#fff', borderRadius:12, padding:20, width:420, boxShadow:'0 8px 24px rgba(0,0,0,0.2)', border:'2px solid #e5e7eb' }}>
        <h3 style={{ marginTop:0, marginBottom:12, fontSize:18, fontWeight:800, color:'#14281D' }}>Paiement mixte (2 parts)</h3>
        <p style={{ marginTop:0, color:'#6B7280' }}>Total à répartir: <strong>{total.toFixed(2)}€</strong></p>

        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
          {[{label:'Partie 1', val:part1}, {label:'Partie 2', val:part2}].map((row, idx) => (
            <div key={idx} style={{ border:'1px solid #e5e7eb', borderRadius:8, padding:12 }}>
              <div style={{ fontSize:12, color:'#6B7280', marginBottom:8 }}>{row.label}</div>
              <select
                value={row.val.method}
                onChange={e => {
                  const next = { ...row.val, method: e.target.value as typeof row.val.method };
                  if (idx === 0) onChange(next, part2); else onChange(part1, next);
                }}
                style={{ width:'100%', padding:'8px', borderRadius:6, border:'1px solid #d1d5db', marginBottom:8 }}
              >
                {methods.map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
              <input
                type="number"
                min={0}
                step={0.01}
                value={row.val.amount}
                onChange={e => {
                  const amount = Number(e.target.value) || 0;
                  const next = { ...row.val, amount };
                  if (idx === 0) onChange(next, part2); else onChange(part1, next);
                }}
                style={{ width:'100%', padding:'8px', borderRadius:6, border:'1px solid #d1d5db' }}
              />
            </div>
          ))}
        </div>

        <div style={{ marginTop:12, fontSize:13, color: valid ? '#166534' : '#92400e' }}>
          Somme des parts: <strong>{sum.toFixed(2)}€</strong> {valid ? '✓' : `(doit égaler ${total.toFixed(2)}€)`}
        </div>

        <div style={{ display:'flex', justifyContent:'flex-end', gap:8, marginTop:16 }}>
          <button onClick={onClose} style={{ padding:'8px 12px', borderRadius:8, border:'1px solid #e5e7eb', background:'#fff' }}>Annuler</button>
          <button onClick={onConfirm} disabled={!valid} style={{ padding:'8px 16px', borderRadius:8, border:'none', background: valid ? '#16a34a' : '#9CA3AF', color:'#fff', fontWeight:700 }}>
            Valider
          </button>
        </div>
      </div>
    </div>
  );
}
// Composant de paiement complet - Version adaptée pour FloatingCart
function StepPaymentNoScroll({
  cartTotal,
  onBack,
  onSelectPayment
}: {
  cartTotal: number;
  onBack: () => void;
  onSelectPayment: (
    method: PaymentMethod,
    checkDetails?: { count: number; amount: number; totalAmount: number; notes?: string },
    paymentDetails?: PaymentDetails
  ) => void;
}) {
  const [selectedMethod, setSelectedMethod] = useState<PaymentData['method']>('');
  const [acompte, setAcompte] = useState<number>(0);
  const [showAlmaPage, setShowAlmaPage] = useState(false);
  const [showChequesPage, setShowChequesPage] = useState(false);
  const [checkDetails, setCheckDetails] = useState<{
    count: number; amount: number; totalAmount: number; notes?: string
  } | null>(null);
  const [acompteMethod, setAcompteMethod] = useState<'card' | 'check' | 'cash' | ''>('');

  // Paiement mixte (local)
  const [showMixedModal, setShowMixedModal] = useState(false);
  const [mixedPart1, setMixedPart1] = useState<{ method: 'Carte Bleue' | 'Espèces' | 'Virement' | 'Chèque'; amount: number }>({ method: 'Carte Bleue', amount: 0 });
  const [mixedPart2, setMixedPart2] = useState<{ method: 'Carte Bleue' | 'Espèces' | 'Virement' | 'Chèque'; amount: number }>({ method: 'Espèces', amount: 0 });
  const [mixedPaymentsState, setMixedPaymentsState] = useState<PaymentDetails['mixedPayments']>([]);

  const uiToPaymentMethod = (label: string): PaymentMethod => {
    if (label === 'Carte Bleue') return 'card';
    if (label === 'Espèces') return 'cash';
    if (label === 'Virement') return 'transfer';
    if (label === 'Chèque' || label.includes('Chèque')) return 'check';
    return 'mixed';
  };

  const restePay = Math.max(0, cartTotal - acompte);
  const isValidPayment = !!selectedMethod && acompte >= 0 && acompte <= cartTotal;

  // Sous-pages : restent confinées DANS le cadre
  if (showAlmaPage) {
    return (
      <div className="ipad-frame">
        <div className="h-screen flex flex-col gradient-bg" style={{ position: 'relative' }}>
          <AlmaDetailsPage
            totalAmount={cartTotal}
            acompte={acompte}
            onBack={() => setShowAlmaPage(false)}
            onSelect={(installments) => {
              const method = `Alma ${installments}x` as PaymentData['method'];
              setSelectedMethod(method);
              setShowAlmaPage(false);
            }}
          />
        </div>
      </div>
    );
  }

  if (showChequesPage) {
    return (
      <div className="ipad-frame">
        <div className="h-screen flex flex-col gradient-bg" style={{ position: 'relative' }}>
          <ChequesDetailsPage
            totalAmount={cartTotal}
            acompte={acompte}
            onBack={() => setShowChequesPage(false)}
            onComplete={(data: { count: number; amount: number; notes: string }) => {
              const totalAmount = data.count * data.amount;
              const details = { count: data.count, amount: data.amount, totalAmount, notes: data.notes };
              setCheckDetails(details);
              setSelectedMethod('Chèque à venir');
              setShowChequesPage(false);
            }}
          />
        </div>
      </div>
    );
  }

  // Page principale de paiement DANS le cadre iPad
  return (
    <div className="ipad-frame">
      <div className="h-screen flex flex-col gradient-bg">
        {/* Header */}
        <div
          style={{
            padding: '20px',
            borderBottom: '2px solid #e5e7eb',
            backgroundColor: 'white',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}
        >
          <div>
            <h1
              style={{
                fontSize: '28px',
                fontWeight: 'bold',
                color: '#14281D',
                margin: 0,
                display: 'flex',
                alignItems: 'center',
                gap: '12px'
              }}
            >
              💳 Mode de Règlement
            </h1>
            <p style={{ color: '#6B7280', fontSize: '16px', margin: '4px 0 0 0' }}>
              Total : {cartTotal.toFixed(2)}€ TTC
            </p>
          </div>
          <button
            onClick={onBack}
            style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', color: '#6B7280', padding: '8px' }}
          >
            ✕
          </button>
        </div>

        {/* Content en mode paysage - Structure linéaire */}
        <div style={{ 
          flex: 1, 
          padding: '20px', 
          maxWidth: '1200px',
          margin: '0 auto',
          overflowY: 'auto',
          WebkitOverflowScrolling: 'touch',
          overscrollBehavior: 'contain',
          touchAction: 'pan-y'
        }}>
          {/* LIGNE 1 - Montant à payer */}
          <div
            style={{
              backgroundColor: '#f0f9ff',
              padding: '20px',
              borderRadius: '12px',
              border: '2px solid #bfdbfe',
              marginBottom: '24px',
              textAlign: 'center'
            }}
          >
            <h2 style={{ 
              fontSize: '32px', 
              fontWeight: 'bold', 
              color: '#14281D', 
              margin: '0 0 8px 0' 
            }}>
              💰 {cartTotal.toFixed(2)}€ TTC
            </h2>
            <p style={{ 
              fontSize: '16px', 
              color: '#6B7280', 
              margin: 0 
            }}>
              Montant total à encaisser
            </p>
          </div>

          {/* LIGNE 2 - Section Acompte avec 3 petits onglets */}
          <div style={{ 
            backgroundColor: 'white',
            padding: '20px',
            borderRadius: '12px',
            border: '2px solid #e5e7eb',
            marginBottom: '24px' 
          }}>
            <h3 style={{ 
              fontSize: '20px', 
              fontWeight: '600', 
              color: '#14281D', 
              margin: '0 0 16px 0' 
            }}>
              💳 Acompte (optionnel)
            </h3>
            
            <div style={{ 
              display: 'flex', 
              gap: '20px', 
              alignItems: 'center',
              flexWrap: 'wrap'
            }}>
              {/* Champ montant acompte */}
              <div style={{ flex: '0 0 200px' }}>
                <label style={{ 
                  display: 'block', 
                  fontSize: '14px', 
                  fontWeight: '500', 
                  color: '#6B7280', 
                  marginBottom: '6px' 
                }}>
                  Montant (€)
                </label>
                <input
                  type="number"
                  value={acompte}
                  onChange={(e) => setAcompte(Number(e.target.value) || 0)}
                  min={0}
                  max={cartTotal}
                  placeholder="0"
                  style={{
                    width: '100%',
                    fontSize: '18px',
                    fontWeight: 'bold',
                    border: '2px solid #d1d5db',
                    borderRadius: '8px',
                    padding: '10px',
                    textAlign: 'center',
                    backgroundColor: '#f9fafb'
                  }}
                />
              </div>

              {/* 3 petits onglets simples pour l'acompte */}
              <div style={{ flex: 1, minWidth: '300px' }}>
                <label style={{ 
                  display: 'block', 
                  fontSize: '14px', 
                  fontWeight: '500', 
                  color: '#6B7280', 
                  marginBottom: '6px' 
                }}>
                  Mode de paiement de l'acompte
                </label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={() => setAcompteMethod('card')}
                    disabled={acompteMethod === 'card'}
                    style={{
                      padding: '10px 16px',
                      backgroundColor: acompteMethod === 'card' ? '#9CA3AF' : '#3b82f6',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      fontSize: '14px',
                      fontWeight: '600',
                      cursor: acompteMethod === 'card' ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      opacity: acompteMethod === 'card' ? 0.7 : 1
                    }}
                    title={acompteMethod === 'card' ? 'Sélectionné' : 'Sélectionner Carte bleue'}
                  >
                    💳 Carte bleue
                    {acompteMethod === 'card' && (
                      <span
                        style={{
                          marginLeft: '8px',
                          backgroundColor: '#16a34a',
                          color: 'white',
                          borderRadius: '9999px',
                          fontSize: '12px',
                          fontWeight: 700,
                          padding: '2px 6px',
                          lineHeight: 1
                        }}
                      >
                        ✓
                      </span>
                    )}
                  </button>
                  <button
                    onClick={() => setAcompteMethod('check')}
                    disabled={acompteMethod === 'check'}
                    style={{
                      padding: '10px 16px',
                      backgroundColor: acompteMethod === 'check' ? '#9CA3AF' : '#f59e0b',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      fontSize: '14px',
                      fontWeight: '600',
                      cursor: acompteMethod === 'check' ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      opacity: acompteMethod === 'check' ? 0.7 : 1
                    }}
                    title={acompteMethod === 'check' ? 'Sélectionné' : 'Sélectionner Chèque'}
                  >
                    🧾 Chèque
                    {acompteMethod === 'check' && (
                      <span
                        style={{
                          marginLeft: '8px',
                          backgroundColor: '#16a34a',
                          color: 'white',
                          borderRadius: '9999px',
                          fontSize: '12px',
                          fontWeight: 700,
                          padding: '2px 6px',
                          lineHeight: 1
                        }}
                      >
                        ✓
                      </span>
                    )}
                  </button>
                  <button
                    onClick={() => setAcompteMethod('cash')}
                    disabled={acompteMethod === 'cash'}
                    style={{
                      padding: '10px 16px',
                      backgroundColor: acompteMethod === 'cash' ? '#9CA3AF' : '#10b981',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      fontSize: '14px',
                      fontWeight: '600',
                      cursor: acompteMethod === 'cash' ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      opacity: acompteMethod === 'cash' ? 0.7 : 1
                    }}
                    title={acompteMethod === 'cash' ? 'Sélectionné' : 'Sélectionner Espèce'}
                  >
                    💵 Espèce
                    {acompteMethod === 'cash' && (
                      <span
                        style={{
                          marginLeft: '8px',
                          backgroundColor: '#16a34a',
                          color: 'white',
                          borderRadius: '9999px',
                          fontSize: '12px',
                          fontWeight: 700,
                          padding: '2px 6px',
                          lineHeight: 1
                        }}
                      >
                        ✓
                      </span>
                    )}
                  </button>
                </div>
              </div>

              {/* Affichage reste à payer */}
              <div style={{ 
                flex: '0 0 150px',
                textAlign: 'center',
                backgroundColor: '#fef3c7',
                padding: '12px',
                borderRadius: '8px',
                border: '1px solid #fbbf24'
              }}>
                <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#92400e' }}>
                  Reste à payer
                </div>
                <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#92400e' }}>
                  {restePay.toFixed(2)}€
                </div>
              </div>
            </div>
          </div>

          {/* LIGNE 3 - Tous les modes de règlement */}
          <div style={{ 
            backgroundColor: 'white',
            padding: '20px',
            borderRadius: '12px',
            border: '2px solid #e5e7eb',
            marginBottom: '24px' 
          }}>
            <h3 style={{ 
              fontSize: '20px', 
              fontWeight: '600', 
              color: '#14281D', 
              margin: '0 0 16px 0' 
            }}>
              🎯 Mode de règlement pour le solde ({restePay.toFixed(2)}€)
            </h3>
            
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', 
              gap: '12px' 
            }}>
              <PaymentCard
                active={selectedMethod === 'Espèces'}
                title="Espèces"
                subtitle="Paiement comptant"
                emoji="💵"
                onClick={() => {
                  setSelectedMethod('Espèces');
                }}
              />

              <PaymentCard
                active={selectedMethod === 'Virement 1'}
                title="Virement 1"
                subtitle="Banque à banque"
                emoji="🏦"
                onClick={() => {
                  setSelectedMethod('Virement 1');
                }}
              />

              <PaymentCard
                active={selectedMethod === 'Virement 2'}
                title="Virement 2"
                subtitle="Banque à banque"
                emoji="🏦"
                onClick={() => {
                  setSelectedMethod('Virement 2');
                }}
              />

              <PaymentCard
                active={selectedMethod === 'Carte Bleue'}
                title="Carte bleue"
                subtitle="CB comptant"
                emoji="💳"
                onClick={() => {
                  setSelectedMethod('Carte Bleue');
                }}
              />

              <PaymentCard
                active={selectedMethod?.startsWith('Alma') || false}
                title={selectedMethod?.startsWith('Alma') ? (selectedMethod as string) : 'Alma'}
                subtitle={selectedMethod?.startsWith('Alma') ? 'Configuré ✓' : '2x, 3x ou 4x →'}
                emoji="💳"
                onClick={() => setShowAlmaPage(true)}
                highlight="blue"
              />

              <PaymentCard
                active={selectedMethod === 'Paiement mixte'}
                title="Paiement mixte"
                subtitle={(mixedPaymentsState?.length ?? 0) > 0 ? 'Répartition configurée ✓' : 'Deux parts (2 clientes) →'}
                emoji="🔀"
                onClick={() => {
                  // Pré-remplir 50/50
                  const half = Number((restePay / 2).toFixed(2));
                  setMixedPart1(prev => ({ ...prev, amount: half }));
                  setMixedPart2(prev => ({ ...prev, amount: Number((restePay - half).toFixed(2)) }));
                  setSelectedMethod('Paiement mixte');
                  setShowMixedModal(true);
                }}
                highlight="green"
              />

              <PaymentCard
                active={selectedMethod === 'Chèque au comptant'}
                title="Chèque (comptant)"
                subtitle="Remis à la commande"
                emoji="🧾"
                onClick={() => {
                  setSelectedMethod('Chèque au comptant');
                }}
              />

              <PaymentCard
                active={selectedMethod === 'Chèque à venir'}
                title="Chèques à venir"
                subtitle={
                  checkDetails
                    ? `${checkDetails.count} chèques de ${checkDetails.amount}€ ✓`
                    : 'Planifier le paiement échelonné →'
                }
                emoji="📄"
                onClick={() => setShowChequesPage(true)}
                highlight="amber"
              />
            </div>
          </div>

          {/* LIGNE 4 - Boutons de validation */}
          <div
            style={{
              backgroundColor: '#f8fafc',
              padding: '20px',
              borderRadius: '12px',
              border: '2px solid #e2e8f0',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              gap: '20px'
            }}
          >
            <button
              onClick={onBack}
              style={{
                backgroundColor: '#6b7280',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                padding: '12px 24px',
                fontSize: '16px',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              ← Annuler
            </button>

            <button
              onClick={() => {
                if (isValidPayment && selectedMethod) {
                  let method: PaymentMethod = 'multi';
                  let paymentDetailsArg: PaymentDetails | undefined = undefined;
                  if (selectedMethod === 'Espèces') method = 'cash';
                  else if (selectedMethod === 'Carte Bleue') method = 'card';
                  else if (selectedMethod.startsWith('Virement')) method = 'transfer';
                  else if (selectedMethod.includes('Chèque')) method = 'check';
                  else if (selectedMethod === 'Paiement mixte' && (mixedPaymentsState?.length ?? 0) > 0) {
                    method = 'mixed';
                    paymentDetailsArg = { mixedPayments: mixedPaymentsState };
                  }

                  if (selectedMethod === 'Chèque à venir' && checkDetails) {
                    onSelectPayment(method, checkDetails, paymentDetailsArg);
                  } else {
                    onSelectPayment(method, undefined, paymentDetailsArg);
                  }
                }
              }}
              disabled={!isValidPayment}
              style={{
                backgroundColor: isValidPayment ? '#16a34a' : '#9CA3AF',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                padding: '16px 40px',
                fontSize: '20px',
                fontWeight: 'bold',
                cursor: isValidPayment ? 'pointer' : 'not-allowed',
                opacity: isValidPayment ? 1 : 0.6,
                boxShadow: isValidPayment ? '0 4px 12px rgba(22, 163, 74, 0.3)' : 'none'
              }}
            >
              💳 ENCAISSER
            </button>
          </div>
        </div>
      </div>
      <MixedPaymentModal
        open={showMixedModal}
        total={restePay}
        part1={mixedPart1}
        part2={mixedPart2}
        onChange={(p1, p2) => { setMixedPart1(p1); setMixedPart2(p2); }}
        onClose={() => setShowMixedModal(false)}
        onConfirm={() => {
          const details: PaymentDetails = {
            mixedPayments: [
              { method: uiToPaymentMethod(mixedPart1.method), amount: mixedPart1.amount },
              { method: uiToPaymentMethod(mixedPart2.method), amount: mixedPart2.amount },
            ]
          };
          setMixedPaymentsState(details.mixedPayments);
          setShowMixedModal(false);
        }}
      />
    </div>
  );
}

// Composant de carte de paiement
function PaymentCard({
  active,
  title,
  subtitle,
  emoji,
  onClick,
  highlight
}: {
  active: boolean;
  title: string;
  subtitle: string;
  emoji?: string;
  onClick: () => void;
  highlight?: 'amber' | 'blue' | 'green' | 'orange';
}) {
  const baseInactive: CSSProperties = { border: '2px solid #d1d5db', backgroundColor: 'white' };
  const activeStyles: CSSProperties = (() => {
    switch (highlight) {
      case 'amber':
        return { border: '2px solid #f59e0b', backgroundColor: '#fef3c7', boxShadow: '0 4px 12px rgba(245, 158, 11, 0.3)' };
      case 'blue':
        return { border: '2px solid #3b82f6', backgroundColor: '#dbeafe', boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)' };
      case 'green':
        return { border: '2px solid #22c55e', backgroundColor: '#dcfce7', boxShadow: '0 4px 12px rgba(34,197,94,0.3)' };
      case 'orange':
        return { border: '2px solid #fb923c', backgroundColor: '#ffedd5', boxShadow: '0 4px 12px rgba(251,146,60,0.3)' };
      default:
        return { border: '2px solid #477A0C', backgroundColor: '#f0f9ff', boxShadow: '0 4px 12px rgba(71, 122, 12, 0.3)' };
    }
  })();

  return (
    <button
      onClick={onClick}
      style={{
        padding: '16px',
        borderRadius: '12px',
        ...(active ? activeStyles : baseInactive),
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        textAlign: 'left',
        width: '100%',
        position: 'relative'
      }}
      onMouseEnter={(e) => {
        if (!active) {
          e.currentTarget.style.borderColor = '#477A0C';
          e.currentTarget.style.backgroundColor = '#f8f9fa';
        }
      }}
      onMouseLeave={(e) => {
        if (!active) {
          e.currentTarget.style.borderColor = '#d1d5db';
          e.currentTarget.style.backgroundColor = 'white';
        }
      }}
    >
      {active && (
        <span
          style={{
            position: 'absolute',
            top: '10px',
            right: '10px',
            backgroundColor: '#16a34a',
            color: 'white',
            borderRadius: '9999px',
            fontSize: '12px',
            fontWeight: 700,
            padding: '2px 6px',
            lineHeight: 1
          }}
        >
          ✓
        </span>
      )}
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between',
        marginBottom: '8px' 
      }}>
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '12px' 
        }}>
          <span style={{ fontSize: '24px' }}>{emoji}</span>
          <div style={{ fontWeight: '600', fontSize: '16px' }}>{title}</div>
        </div>
      </div>
      <div style={{ fontSize: '14px', color: '#6B7280' }}>{subtitle}</div>
    </button>
  );
}

// Page Alma simplifiée
function AlmaDetailsPage({
  totalAmount,
  acompte,
  onBack,
  onSelect,
}: {
  totalAmount: number;
  acompte: number;
  onBack: () => void;
  onSelect: (installments: number) => void;
}) {
  const restePay = Math.max(0, totalAmount - acompte);
  const options = [
    { times: 2, label: '2 fois', fee: '1.5%', amount: restePay / 2 },
    { times: 3, label: '3 fois', fee: '2.5%', amount: restePay / 3 },
    { times: 4, label: '4 fois', fee: '3.5%', amount: restePay / 4 },
  ];

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: '#f8f9fa',
      zIndex: 1250,
      overflowY: 'auto'
    }}>
      <div style={{
        padding: '20px',
        borderBottom: '2px solid #e5e7eb',
        backgroundColor: 'white'
      }}>
        <h1 style={{ 
          fontSize: '28px', 
          fontWeight: 'bold', 
          color: '#14281D',
          margin: 0 
        }}>
          💳 Paiement Alma
        </h1>
        <p style={{ 
          color: '#6B7280', 
          fontSize: '16px',
          margin: '4px 0 0 0' 
        }}>
          Reste à payer : {restePay.toFixed(2)}€
        </p>
      </div>

      <div style={{ padding: '20px', maxWidth: '600px', margin: '0 auto' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {options.map(option => (
            <button
              key={option.times}
              onClick={() => onSelect(option.times)}
              style={{
                padding: '20px',
                backgroundColor: 'white',
                borderRadius: '12px',
                border: '2px solid #d1d5db',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#3b82f6';
                e.currentTarget.style.backgroundColor = '#f8fafc';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = '#d1d5db';
                e.currentTarget.style.backgroundColor = 'white';
              }}
            >
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'space-between' 
              }}>
                <div>
                  <div style={{ 
                    fontSize: '20px', 
                    fontWeight: 'bold', 
                    color: '#14281D' 
                  }}>
                    Alma {option.label}
                  </div>
                  <div style={{ color: '#6B7280' }}>
                    Frais : {option.fee} • {option.amount.toFixed(2)}€ / mois
                  </div>
                </div>
                <div style={{ fontSize: '24px' }}>→</div>
              </div>
            </button>
          ))}
        </div>

        <button
          onClick={onBack}
          style={{
            marginTop: '32px',
            backgroundColor: '#f3f4f6',
            color: '#6B7280',
            border: 'none',
            borderRadius: '8px',
            padding: '12px 24px',
            fontSize: '16px',
            fontWeight: '600',
            cursor: 'pointer'
          }}
        >
          ← Retour
        </button>
      </div>
    </div>
  );
}

// Page Chèques simplifiée
function ChequesDetailsPage({
  totalAmount,
  acompte,
  onBack,
  onComplete,
}: {
  totalAmount: number;
  acompte: number;
  onBack: () => void;
  onComplete: (data: { count: number; amount: number; notes: string }) => void;
}) {
  const restePay = Math.max(0, totalAmount - acompte);
  const [chequeCount, setChequeCount] = useState<number>(1);
  const [notes, setNotes] = useState<string>('');

  const perCheque = Math.floor(restePay / chequeCount);
  const remainder = restePay - perCheque * chequeCount;
  const isValid = chequeCount >= 1 && chequeCount <= 10 && perCheque > 0;

  const tabs = Array.from({ length: 10 }, (_, i) => i + 1);

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: '#fffbeb',
      zIndex: 1250,
      overflowY: 'auto'
    }}>
      <div style={{
        padding: '20px',
        borderBottom: '2px solid #fbbf24',
        backgroundColor: '#fef3c7'
      }}>
        <h1 style={{ 
          fontSize: '28px', 
          fontWeight: 'bold', 
          color: '#92400e',
          margin: 0 
        }}>
          📄 Chèques à venir
        </h1>
        <p style={{ 
          color: '#92400e', 
          fontSize: '16px',
          margin: '4px 0 0 0' 
        }}>
          Reste à payer : {restePay.toFixed(2)}€
        </p>
      </div>

      <div style={{ padding: '20px', maxWidth: '600px', margin: '0 auto' }}>
        
        {/* Tabs pour nombre de chèques */}
        <div style={{ marginBottom: '24px' }}>
          <div style={{ 
            display: 'flex', 
            flexWrap: 'wrap', 
            gap: '8px',
            marginBottom: '12px' 
          }}>
            {tabs.map(n => (
              <button
                key={n}
                onClick={() => setChequeCount(n)}
                style={{
                  padding: '8px 16px',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: 'bold',
                  transition: 'all 0.2s ease',
                  border: 'none',
                  cursor: 'pointer',
                  backgroundColor: chequeCount === n ? '#f59e0b' : 'white',
                  color: chequeCount === n ? 'white' : '#92400e',
                  ...(chequeCount === n && { boxShadow: '0 2px 8px rgba(245, 158, 11, 0.3)' })
                }}
              >
                {n}x
              </button>
            ))}
          </div>
          <div style={{ fontSize: '14px', color: '#92400e' }}>
            Choisissez le nombre de chèques (1 à 10)
          </div>
        </div>

        {/* Calcul */}
        <div style={{
          backgroundColor: 'white',
          padding: '16px',
          borderRadius: '12px',
          border: '2px solid #fbbf24',
          marginBottom: '24px'
        }}>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: '1fr 1fr', 
            gap: '16px', 
            textAlign: 'center' 
          }}>
            <div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#92400e' }}>
                {perCheque}€
              </div>
              <div style={{ fontSize: '14px', color: '#78350f' }}>
                Montant par chèque
              </div>
            </div>
            <div>
              <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#92400e' }}>
                {remainder > 0 ? `+${remainder}€` : '✓ Exact'}
              </div>
              <div style={{ fontSize: '14px', color: '#78350f' }}>
                {remainder > 0 ? 'À ajouter sur le 1er chèque' : 'Répartition parfaite'}
              </div>
            </div>
          </div>
        </div>

        {/* Notes */}
        <div style={{ marginBottom: '24px' }}>
          <label style={{ 
            display: 'block', 
            fontSize: '16px', 
            fontWeight: '600', 
            color: '#92400e', 
            marginBottom: '8px' 
          }}>
            Notes (optionnel)
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder="Ex : premier chèque à l'installation, suivants tous les 30 jours…"
            style={{
              width: '100%',
              padding: '12px',
              border: '2px solid #fbbf24',
              borderRadius: '12px',
              backgroundColor: 'white',
              resize: 'none',
              fontSize: '14px'
            }}
          />
        </div>

        {/* Footer */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center' 
        }}>
          <button
            onClick={onBack}
            style={{
              backgroundColor: '#f3f4f6',
              color: '#6B7280',
              border: 'none',
              borderRadius: '8px',
              padding: '12px 24px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            ← Retour
          </button>
          
          <button
            onClick={() => {
              if (isValid) {
                onComplete({ count: chequeCount, amount: perCheque, notes });
              }
            }}
            disabled={!isValid}
            style={{
              backgroundColor: isValid ? '#f59e0b' : '#9CA3AF',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              padding: '12px 24px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: isValid ? 'pointer' : 'not-allowed',
              opacity: isValid ? 1 : 0.6
            }}
          >
            Confirmer →
          </button>
        </div>
      </div>
    </div>
  );
}