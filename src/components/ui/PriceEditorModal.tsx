// ===== COMPOSANT ÉDITEUR PRIX NÉGOCIÉS v1.0.0 =====
// 🎯 Modal d'édition prix avec validation PIN et traçabilité
// 📅 Créé: septembre 2025

import React, { useState, useEffect } from 'react';
import { DiscountType, PriceOverrideMeta, ExtendedCartItemWithNegotiation } from '../../types';

interface PriceEditorModalProps {
  isOpen: boolean;
  item: ExtendedCartItemWithNegotiation | null;
  onClose: () => void;
  onSave: (itemId: string, override: PriceOverrideMeta) => void;
  currentUser?: string;
}

const PriceEditorModal: React.FC<PriceEditorModalProps> = ({
  isOpen,
  item,
  onClose,
  onSave,
  currentUser = 'Vendeur'
}) => {
  const [discountType, setDiscountType] = useState<DiscountType>('amount');
  const [value, setValue] = useState<string>('');
  const [reason, setReason] = useState<string>('');
  const [pin, setPin] = useState<string>('');
  const [requiresPin, setRequiresPin] = useState<boolean>(false);
  const [isValidating, setIsValidating] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  // Reset à l'ouverture
  useEffect(() => {
    if (isOpen && item) {
      const existing = item.priceOverride;
      if (existing?.enabled) {
        setDiscountType(existing.type);
        setValue(existing.value.toString());
        setReason(existing.reason || '');
      } else {
        setDiscountType('amount');
        setValue('');
        setReason('');
      }
      setPin('');
      setError('');
    }
  }, [isOpen, item]);

  // Calcul prix final en temps réel
  const calculatePreview = (): number => {
    if (!item || !value) return (item?.originalPrice || item?.price) || 0;
    
    const numValue = parseFloat(value);
    const catalogPrice = item.originalPrice || item.price;
    if (isNaN(numValue)) return catalogPrice;

    switch (discountType) {
      case 'amount':
        return Math.max(0, catalogPrice - numValue);
      case 'percent':
        return Math.max(0, catalogPrice * (1 - numValue / 100));
      case 'override':
        return Math.max(0, numValue);
      default:
        return catalogPrice;
    }
  };

  // Vérification si PIN requis
  useEffect(() => {
    if (!value || !item) {
      setRequiresPin(false);
      return;
    }

    const numValue = parseFloat(value);
    if (isNaN(numValue)) {
      setRequiresPin(false);
      return;
    }

    // Règles PIN (configurables)
    const needsPin = 
      (discountType === 'amount' && numValue > 20) ||     // Remise > 20€
      (discountType === 'percent' && numValue > 10) ||    // Remise > 10%
      (discountType === 'override');                      // Prix libre toujours

    setRequiresPin(needsPin);
  }, [discountType, value, item]);

  const validatePin = (inputPin: string): boolean => {
    // PIN par défaut (en production: base de données)
    const validPins = ['1234', '0000', '9999'];
    return validPins.includes(inputPin);
  };

  const handleSave = async () => {
    if (!item || !value) return;

    setIsValidating(true);
    setError('');

    try {
      // Validation PIN si requis
      if (requiresPin && !validatePin(pin)) {
        setError('PIN incorrect');
        setIsValidating(false);
        return;
      }

      const numValue = parseFloat(value);
      if (isNaN(numValue) || numValue < 0) {
        setError('Valeur invalide');
        setIsValidating(false);
        return;
      }

      // Validation limites
      if (discountType === 'percent' && numValue > 50) {
        setError('Remise maximum: 50%');
        setIsValidating(false);
        return;
      }

      // Création de l'override
      const override: PriceOverrideMeta = {
        enabled: true,
        type: discountType,
        value: numValue,
        reason: reason.trim() || 'Prix négocié',
        author: currentUser,
        approvedBy: requiresPin ? 'PIN validé' : undefined,
        ts: Date.now(),
        originalPrice: item.originalPrice || item.price
      };

      onSave(item.id, override);
      onClose();

    } catch (err) {
      setError('Erreur lors de l\'enregistrement');
    } finally {
      setIsValidating(false);
    }
  };

  const handleRemoveOverride = () => {
    if (!item) return;
    
    const override: PriceOverrideMeta = {
      enabled: false,
      type: 'amount',
      value: 0
    };
    
    onSave(item.id, override);
    onClose();
  };

  if (!isOpen || !item) return null;

  const previewPrice = calculatePreview();
  const catalogPrice = item.originalPrice || item.price;
  const savings = catalogPrice - previewPrice;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[3000]">
      <div className="bg-white rounded-2xl p-6 w-96 max-w-[90vw] shadow-2xl">
        {/* En-tête */}
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold text-gray-800">Prix négocié</h3>
          <button 
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl leading-none"
          >
            ×
          </button>
        </div>

        {/* Produit */}
        <div className="bg-gray-50 rounded-lg p-4 mb-6">
          <h4 className="font-medium text-gray-800">{item.name}</h4>
          <p className="text-sm text-gray-600">
            Prix catalogue: <span className="font-bold">{catalogPrice.toFixed(2)}€</span>
          </p>
        </div>

        {/* Mode de remise */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Type de négociation
          </label>
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => setDiscountType('amount')}
              className={`p-3 rounded-lg text-sm font-medium transition-colors ${
                discountType === 'amount'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Remise €
            </button>
            <button
              onClick={() => setDiscountType('percent')}
              className={`p-3 rounded-lg text-sm font-medium transition-colors ${
                discountType === 'percent'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Remise %
            </button>
            <button
              onClick={() => setDiscountType('override')}
              className={`p-3 rounded-lg text-sm font-medium transition-colors ${
                discountType === 'override'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Prix libre
            </button>
          </div>
        </div>

        {/* Saisie valeur */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {discountType === 'amount' && 'Montant de la remise (€)'}
            {discountType === 'percent' && 'Pourcentage de remise (%)'}
            {discountType === 'override' && 'Nouveau prix TTC (€)'}
          </label>
          <input
            type="number"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder={discountType === 'override' ? '0.00' : '0'}
            step={discountType === 'override' ? '0.01' : discountType === 'percent' ? '1' : '0.01'}
          />
        </div>

        {/* Raison */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Raison (optionnel)
          </label>
          <input
            type="text"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Ex: Client fidèle, promotion..."
          />
        </div>

        {/* PIN si requis */}
        {requiresPin && (
          <div className="mb-4">
            <label className="block text-sm font-medium text-orange-700 mb-2">
              🔐 PIN requis pour cette modification
            </label>
            <input
              type="password"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              className="w-full px-3 py-2 border border-orange-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              placeholder="Saisissez votre PIN"
            />
          </div>
        )}

        {/* Aperçu */}
        {value && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-700">Prix final:</span>
              <span className="text-xl font-bold text-green-600">
                {previewPrice.toFixed(2)}€
              </span>
            </div>
            {savings > 0 && (
              <div className="text-sm text-green-600 mt-1">
                Économie: {savings.toFixed(2)}€
              </div>
            )}
          </div>
        )}

        {/* Erreur */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Annuler
          </button>
          
          {item.priceOverride?.enabled && (
            <button
              onClick={handleRemoveOverride}
              className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
            >
              Supprimer
            </button>
          )}
          
          <button
            onClick={handleSave}
            disabled={!value || isValidating || (requiresPin && !pin)}
            className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            {isValidating ? 'Validation...' : 'Enregistrer'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PriceEditorModal;
