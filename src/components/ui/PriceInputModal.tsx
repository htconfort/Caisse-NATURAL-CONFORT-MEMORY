import React, { useState } from 'react';
import { X, Euro } from 'lucide-react';
import type { CatalogProduct } from '../../types';

interface PriceInputModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (product: CatalogProduct, price: number) => void;
  product: CatalogProduct | null;
}

export const PriceInputModal: React.FC<PriceInputModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  product
}) => {
  const [price, setPrice] = useState('');
  const [error, setError] = useState('');

  if (!isOpen || !product) return null;

  const handlePriceChange = (value: string) => {
    // Permettre seulement les nombres et la virgule/point
    const cleanValue = value.replace(/[^0-9.,]/g, '').replace(',', '.');
    setPrice(cleanValue);
    setError('');
  };

  const handleConfirm = () => {
    const numPrice = parseFloat(price);
    
    if (!price || isNaN(numPrice) || numPrice <= 0) {
      setError('Veuillez saisir un prix valide');
      return;
    }

    if (numPrice > 9999) {
      setError('Le prix ne peut pas dépasser 9999€');
      return;
    }

    onConfirm(product, numPrice);
    handleClose();
  };

  const handleClose = () => {
    setPrice('');
    setError('');
    onClose();
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleConfirm();
    } else if (e.key === 'Escape') {
      handleClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 animate-fadeIn">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-gray-900">Saisie du prix</h3>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Product info */}
        <div className="mb-6 p-4 bg-blue-50 rounded-lg">
          <h4 className="font-semibold text-gray-900 mb-1">{product.name}</h4>
          <p className="text-sm text-gray-600">{product.description}</p>
        </div>

        {/* Price input */}
        <div className="mb-4">
          <label htmlFor="price" className="block text-sm font-medium text-gray-700 mb-2">
            Prix TTC (en euros)
          </label>
          <div className="relative">
            <Euro className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              id="price"
              type="text"
              value={price}
              onChange={(e) => handlePriceChange(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder="Ex: 150.00"
              className="input pl-10 text-lg font-semibold"
              autoFocus
            />
          </div>
          {error && (
            <p className="text-red-600 text-sm mt-1">{error}</p>
          )}
        </div>

        {/* Suggestions */}
        <div className="mb-6">
          <p className="text-sm text-gray-600 mb-2">Suggestions rapides :</p>
          <div className="flex gap-2 flex-wrap">
            {[100, 120, 150, 160, 200].map((suggestedPrice) => (
              <button
                key={suggestedPrice}
                onClick={() => setPrice(suggestedPrice.toString())}
                className="px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm transition-colors"
              >
                {suggestedPrice}€
              </button>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={handleClose}
            className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
          >
            Annuler
          </button>
          <button
            onClick={handleConfirm}
            className="flex-1 btn-primary"
            disabled={!price || parseFloat(price) <= 0}
          >
            Ajouter au panier
          </button>
        </div>
      </div>
    </div>
  );
};
