import React, { useState } from 'react';
import { X, ShoppingCart, Check, Plus, Minus, Gift } from 'lucide-react';
import type { ExtendedCartItem, PaymentMethod, Vendor, CartType } from '@/types';

interface FloatingCartProps {
  activeTab: string;
  cart: ExtendedCartItem[];
  cartItemsCount: number;
  cartTotal: number;
  selectedVendor: Vendor | null;
  updateQuantity: (itemId: string, newQuantity: number) => void;
  toggleOffert: (itemId: string) => void;
  cartType: CartType;
  onCartTypeChange: (type: CartType) => void;
  clearCart: () => void;
  completeSale: (
    paymentMethod?: PaymentMethod,
    checkDetails?: { count: number; amount: number; totalAmount: number; notes?: string },
    manualInvoiceData?: { clientName: string; invoiceNumber: string }
  ) => void;
}

export function FloatingCart({
  activeTab,
  cart,
  cartItemsCount,
  cartTotal,
  selectedVendor,
  updateQuantity,
  toggleOffert,
  cartType,
  onCartTypeChange,
  clearCart,
  completeSale
}: FloatingCartProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState<'cart' | 'payment'>('cart');

  // Ne pas afficher le cart si on n'est pas sur les onglets produits/annulation
  const shouldShowCart = ['produits', 'annulation'].includes(activeTab) && cartItemsCount > 0;

  if (!shouldShowCart) {
    return null;
  }

  const handleCompleteSale = () => {
    if (!selectedVendor) {
      alert("Veuillez sélectionner une vendeuse");
      return;
    }
    
    completeSale('card'); // Par défaut carte bancaire
    setIsOpen(false);
    setCurrentStep('cart');
  };

  return (
    <>
      {/* Bouton flottant */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className={`fixed bottom-6 right-6 z-50 bg-blue-600 hover:bg-blue-700 text-white rounded-full p-4 shadow-lg transition-all duration-300 ${
            cartItemsCount > 0 ? 'animate-pulse' : ''
          }`}
          style={{ animation: cartItemsCount > 0 ? 'pulse 2s infinite' : 'none' }}
        >
          <ShoppingCart size={24} />
          {cartItemsCount > 0 && (
            <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-6 h-6 flex items-center justify-center font-bold">
              {cartItemsCount}
            </span>
          )}
        </button>
      )}

      {/* Modal du panier */}
      {isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[80vh] overflow-hidden">
            
            {/* En-tête */}
            <div className="bg-blue-600 text-white p-4 flex justify-between items-center">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <ShoppingCart size={20} />
                Panier ({cartItemsCount} articles)
              </h2>
              <button
                onClick={() => {
                  setIsOpen(false);
                  setCurrentStep('cart');
                }}
                className="text-white hover:bg-blue-700 p-1 rounded"
              >
                <X size={20} />
              </button>
            </div>

            {currentStep === 'cart' && (
              <>
                {/* Liste des articles */}
                <div className="max-h-96 overflow-y-auto p-4">
                  {cart.map((item) => (
                    <div key={item.id} className="flex items-center justify-between border-b pb-3 mb-3">
                      <div className="flex-1">
                        <h3 className="font-medium">{item.name}</h3>
                        <p className="text-sm text-gray-600">{item.category}</p>
                        <p className="text-lg font-bold text-blue-600">
                          {item.offert ? (
                            <span className="text-green-600">OFFERT</span>
                          ) : (
                            `${item.price.toFixed(2)}€`
                          )}
                        </p>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {/* Bouton offert */}
                        <button
                          onClick={() => toggleOffert(item.id)}
                          className={`p-1 rounded ${
                            item.offert 
                              ? 'bg-green-100 text-green-600' 
                              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          }`}
                          title={item.offert ? 'Annuler l\'offre' : 'Offrir cet article'}
                        >
                          <Gift size={16} />
                        </button>

                        {/* Contrôles quantité */}
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => updateQuantity(item.id, item.quantity - 1)}
                            className="bg-gray-200 hover:bg-gray-300 p-1 rounded"
                          >
                            <Minus size={16} />
                          </button>
                          <span className="px-2 py-1 bg-gray-100 rounded min-w-[32px] text-center">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => updateQuantity(item.id, item.quantity + 1)}
                            className="bg-gray-200 hover:bg-gray-300 p-1 rounded"
                          >
                            <Plus size={16} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Total et actions */}
                <div className="p-4 border-t bg-gray-50">
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-lg font-bold">Total:</span>
                    <span className="text-2xl font-bold text-blue-600">
                      {cartTotal.toFixed(2)}€
                    </span>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={clearCart}
                      className="flex-1 bg-gray-500 hover:bg-gray-600 text-white py-2 px-4 rounded font-medium"
                    >
                      Vider
                    </button>
                    <button
                      onClick={() => setCurrentStep('payment')}
                      disabled={!selectedVendor}
                      className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white py-2 px-4 rounded font-medium"
                    >
                      Valider
                    </button>
                  </div>
                  
                  {!selectedVendor && (
                    <p className="text-red-600 text-sm mt-2 text-center">
                      Sélectionnez une vendeuse pour continuer
                    </p>
                  )}
                </div>
              </>
            )}

            {currentStep === 'payment' && (
              <div className="p-4">
                <div className="text-center mb-4">
                  <h3 className="text-lg font-bold mb-2">Finaliser la vente</h3>
                  <p className="text-gray-600">
                    Vendeuse: <strong>{selectedVendor?.name}</strong>
                  </p>
                  <p className="text-2xl font-bold text-blue-600 mt-2">
                    Total: {cartTotal.toFixed(2)}€
                  </p>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => setCurrentStep('cart')}
                    className="flex-1 bg-gray-500 hover:bg-gray-600 text-white py-2 px-4 rounded font-medium"
                  >
                    Retour
                  </button>
                  <button
                    onClick={handleCompleteSale}
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded font-medium flex items-center justify-center gap-2"
                  >
                    <Check size={16} />
                    Confirmer
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
