// ===== UTILITAIRES PRIX NÉGOCIÉS v1.0.0 =====
// 🎯 Fonctions de calcul et formatage des prix avec négociation
// 📅 Créé: septembre 2025

import { ExtendedCartItemWithNegotiation as ExtendedCartItem, PriceOverrideMeta, DiscountType } from '../types';

/**
 * 💰 Calcule le prix final après application des négociations
 */
export const calculateFinalPrice = (item: ExtendedCartItem): number => {
  if (!item.priceOverride?.enabled) {
    return item.originalPrice || item.price;
  }

  const { type, value } = item.priceOverride;
  const catalogPrice = item.originalPrice || item.price;

  switch (type) {
    case 'amount':
      return Math.max(0, catalogPrice - value);
    case 'percent':
      return Math.max(0, catalogPrice * (1 - value / 100));
    case 'override':
      return Math.max(0, value);
    default:
      return catalogPrice;
  }
};

/**
 * 🏷️ Formate l'affichage des prix avec informations détaillées
 */
export const formatPriceDisplay = (item: ExtendedCartItem) => {
  const catalogPrice = item.originalPrice || item.price;
  const finalPrice = calculateFinalPrice(item);
  const hasOverride = item.priceOverride?.enabled || false;
  const savings = hasOverride ? catalogPrice - finalPrice : 0;

  return {
    originalPrice: catalogPrice,
    finalPrice,
    hasOverride,
    savings,
    savingsPercent: hasOverride ? (savings / catalogPrice) * 100 : 0,
    discountType: item.priceOverride?.type || null,
    discountValue: item.priceOverride?.value || 0,
    reason: item.priceOverride?.reason || '',
    author: item.priceOverride?.author || '',
    isValidated: !!item.priceOverride?.approvedBy
  };
};

/**
 * 🧮 Calcule le total d'une ligne (prix × quantité)
 */
export const calculateLineTotal = (item: ExtendedCartItem): number => {
  const unitPrice = calculateFinalPrice(item);
  return unitPrice * item.quantity;
};

/**
 * 🛒 Calcule le total du panier avec négociations
 */
export const calculateCartTotal = (items: ExtendedCartItem[]): {
  subtotal: number;
  totalSavings: number;
  originalTotal: number;
  itemCount: number;
  negotiatedItems: number;
} => {
  let subtotal = 0;
  let originalTotal = 0;
  let negotiatedItems = 0;
  let itemCount = 0;

  items.forEach(item => {
    const lineTotal = calculateLineTotal(item);
    const catalogPrice = item.originalPrice || item.price;
    const originalLineTotal = catalogPrice * item.quantity;
    
    subtotal += lineTotal;
    originalTotal += originalLineTotal;
    itemCount += item.quantity;
    
    if (item.priceOverride?.enabled) {
      negotiatedItems++;
    }
  });

  return {
    subtotal,
    totalSavings: originalTotal - subtotal,
    originalTotal,
    itemCount,
    negotiatedItems
  };
};

/**
 * 🎨 Génère les classes CSS pour l'affichage des prix
 */
export const getPriceDisplayClasses = (item: ExtendedCartItem) => {
  const { hasOverride, savings } = formatPriceDisplay(item);
  
  return {
    originalPrice: hasOverride 
      ? 'text-gray-500 line-through text-sm' 
      : 'text-gray-800 font-semibold',
    finalPrice: hasOverride 
      ? 'text-green-600 font-bold text-lg' 
      : 'text-gray-800 font-semibold',
    savings: savings > 0 
      ? 'text-green-600 text-xs font-medium' 
      : 'hidden',
    negotiatedBadge: hasOverride 
      ? 'bg-orange-100 text-orange-700 text-xs px-2 py-1 rounded-full' 
      : 'hidden'
  };
};

/**
 * 📊 Génère un résumé des négociations pour la facture
 */
export const generateNegotiationSummary = (items: ExtendedCartItem[]): {
  hasNegotiations: boolean;
  totalSavings: number;
  negotiatedLines: Array<{
    productName: string;
    originalPrice: number;
    finalPrice: number;
    savings: number;
    reason: string;
    type: string;
  }>;
} => {
  const negotiatedLines: Array<{
    productName: string;
    originalPrice: number;
    finalPrice: number;
    savings: number;
    reason: string;
    type: string;
  }> = [];

  let totalSavings = 0;

  items.forEach(item => {
    if (item.priceOverride?.enabled) {
      const { finalPrice, savings, reason, discountType } = formatPriceDisplay(item);
      const catalogPrice = item.originalPrice || item.price;
      
      negotiatedLines.push({
        productName: item.name,
        originalPrice: catalogPrice,
        finalPrice,
        savings,
        reason,
        type: discountType === 'amount' ? 'Remise €' :
              discountType === 'percent' ? 'Remise %' : 'Prix libre'
      });
      
      totalSavings += savings * item.quantity;
    }
  });

  return {
    hasNegotiations: negotiatedLines.length > 0,
    totalSavings,
    negotiatedLines
  };
};

/**
 * 🔍 Valide si une négociation est autorisée
 */
export const validateNegotiation = (
  type: DiscountType,
  value: number,
  originalPrice: number,
  maxDiscountPercent: number = 50
): { isValid: boolean; error?: string; requiresPin: boolean } => {
  
  if (value < 0) {
    return { isValid: false, error: 'La valeur doit être positive', requiresPin: false };
  }

  switch (type) {
    case 'amount':
      if (value >= originalPrice) {
        return { isValid: false, error: 'La remise ne peut pas être supérieure au prix', requiresPin: false };
      }
      return { 
        isValid: true, 
        requiresPin: value > 20 // PIN requis pour remise > 20€
      };

    case 'percent':
      if (value > maxDiscountPercent) {
        return { isValid: false, error: `Remise maximum: ${maxDiscountPercent}%`, requiresPin: false };
      }
      return { 
        isValid: true, 
        requiresPin: value > 10 // PIN requis pour remise > 10%
      };

    case 'override':
      if (value > originalPrice * 2) {
        return { isValid: false, error: 'Prix libre trop élevé', requiresPin: false };
      }
      return { 
        isValid: true, 
        requiresPin: true // Toujours PIN pour prix libre
      };

    default:
      return { isValid: false, error: 'Type de négociation invalide', requiresPin: false };
  }
};

/**
 * 📝 Génère un log d'audit pour les modifications de prix
 */
export const createAuditLog = (
  item: ExtendedCartItem,
  override: PriceOverrideMeta,
  action: 'CREATE' | 'UPDATE' | 'DELETE'
): string => {
  const timestamp = new Date().toLocaleString('fr-FR');
  const { finalPrice, savings } = formatPriceDisplay({ ...item, priceOverride: override });
  const catalogPrice = item.originalPrice || item.price;
  
  return `[${timestamp}] ${action} - ${item.name} - ${override.author} - ` +
         `Prix: ${catalogPrice}€ → ${finalPrice.toFixed(2)}€ ` +
         `(${savings > 0 ? '-' : '+'}${Math.abs(savings).toFixed(2)}€) - ` +
         `Raison: ${override.reason || 'N/A'}`;
};
