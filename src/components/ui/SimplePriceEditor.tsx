// ===== ÉDITEUR PRIX SIMPLE v1.0.0 =====
// 🎯 Prix éditable directement sans PIN ni raison
// 📅 Créé: septembre 2025

import React, { useState, useEffect } from 'react';
import { ExtendedCartItemWithNegotiation, PriceOverrideMeta } from '../../types';

interface SimplePriceEditorProps {
  isOpen: boolean;
  item: ExtendedCartItemWithNegotiation | null;
  onClose: () => void;
  onSave: (itemId: string, override: PriceOverrideMeta) => void;
}

const SimplePriceEditor: React.FC<SimplePriceEditorProps> = ({
  isOpen,
  item,
  onClose,
  onSave
}) => {
  const [newPrice, setNewPrice] = useState<string>('');
  const [error, setError] = useState<string>('');

  // Reset à l'ouverture
  useEffect(() => {
    if (isOpen && item) {
      const currentPrice = item.priceOverride?.enabled 
        ? item.priceOverride.value 
        : (item.originalPrice || item.price);
      setNewPrice(currentPrice.toString());
      setError('');
    }
  }, [isOpen, item]);

  const handleSave = () => {
    if (!item || !newPrice) return;

    const numPrice = parseFloat(newPrice);
    if (isNaN(numPrice) || numPrice < 0) {
      setError('Prix invalide');
      return;
    }

    const catalogPrice = item.originalPrice || item.price;
    
    // Si le prix est différent du prix catalogue, créer un override
    if (numPrice !== catalogPrice) {
      const override: PriceOverrideMeta = {
        enabled: true,
        type: 'override',
        value: numPrice,
        reason: 'Prix modifié',
        ts: Date.now(),
        originalPrice: catalogPrice
      };
      onSave(item.id, override);
    } else {
      // Si prix identique au catalogue, supprimer l'override
      const override: PriceOverrideMeta = {
        enabled: false,
        type: 'override',
        value: numPrice
      };
      onSave(item.id, override);
    }
    
    onClose();
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  if (!isOpen || !item) return null;

  const catalogPrice = item.originalPrice || item.price;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-30 flex items-start justify-end pt-16 pr-8 z-[3000]">
      <div className="bg-white rounded-xl p-5 w-72 shadow-xl border border-gray-200 animate-in slide-in-from-right-5 duration-200">
        {/* En-tête compact */}
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-base font-semibold text-gray-800">✏️ Modifier prix</h3>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl leading-none w-6 h-6 rounded-full hover:bg-gray-100 flex items-center justify-center transition-colors"
          >
            ×
          </button>
        </div>

        {/* Produit compact */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-3 mb-4 border border-blue-100">
          <h4 className="font-medium text-gray-800 text-sm truncate">{item.name}</h4>
          <p className="text-xs text-gray-600 mt-1">
            Catalogue: <span className="font-semibold text-blue-600">{catalogPrice.toFixed(2)}€</span>
          </p>
        </div>

        {/* Saisie prix stylée */}
        <div className="mb-4">
          <label className="block text-xs font-medium text-gray-700 mb-2">
            💰 Nouveau prix (€)
          </label>
          <div className="relative">
            <input
              type="number"
              value={newPrice}
              onChange={(e) => setNewPrice(e.target.value)}
              onKeyDown={handleKeyPress}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-blue-400 text-lg font-semibold text-center bg-gradient-to-br from-white to-gray-50 transition-all"
              placeholder="0.00"
              step="0.01"
              min="0"
              autoFocus
            />
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-sm">€</div>
          </div>
        </div>

        {/* Erreur élégante */}
        {error && (
          <div className="bg-red-50 border-l-4 border-red-400 rounded-r-lg p-3 mb-4">
            <p className="text-red-700 text-sm flex items-center">
              <span className="mr-2">⚠️</span>
              {error}
            </p>
          </div>
        )}

        {/* Actions élégantes */}
        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-all duration-200 text-sm font-medium"
          >
            Annuler
          </button>
          
          <button
            onClick={handleSave}
            disabled={!newPrice}
            className="flex-2 px-6 py-2.5 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed transition-all duration-200 text-sm font-medium shadow-md hover:shadow-lg"
          >
            ✓ Valider
          </button>
        </div>
      </div>
    </div>
  );
};

export default SimplePriceEditor;
