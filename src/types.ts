// ===== TYPES SYSTÈME PRIX NÉGOCIÉS v1.0.0 =====
// 🎯 Fonctionnalité: Prix personnalisés avec validation et traçabilité
// 📅 Créé: septembre 2025

export type DiscountType = 'amount' | 'percent' | 'override';

/**
 * 💰 Métadonnées des prix négociés par ligne de panier
 * Traçabilité complète pour audit et contrôle
 */
export interface PriceOverrideMeta {
  enabled: boolean;           // true si un prix personnalisé est appliqué
  type: DiscountType;         // 'amount' = remise € ; 'percent' = % ; 'override' = saisir le prix TTC
  value: number;              // valeur positive (ex: 10 = -10€ ou -10%)
  reason?: string;            // raison de l'ajustement
  author?: string;            // id/nom de la vendeuse
  approvedBy?: string;        // id/nom du responsable (si PIN demandé)
  ts?: number;                // timestamp de création
  originalPrice?: number;     // prix catalogue original pour comparaison
}

/**
 * 🛒 Article panier étendu avec système prix négociés
 * Compatible avec le système existant (ExtendedCartItem de types/index.ts)
 */
export interface ExtendedCartItemWithNegotiation {
  id: string;
  name: string;
  price: number;              // prix actuel (peut être négocié)
  quantity: number;
  category: string;
  addedAt: Date;
  offert?: boolean;
  originalPrice?: number;     // prix catalogue original
  // ▼ NOUVEAU: Système prix négociés
  priceOverride?: PriceOverrideMeta;
}

/**
 * 🔐 Configuration validation prix
 */
export interface PriceValidationConfig {
  requirePinForDiscountAbove?: number;    // PIN obligatoire si remise > montant
  requirePinForPercentAbove?: number;     // PIN obligatoire si % > valeur
  requirePinForOverride?: boolean;        // PIN toujours requis pour prix libre
  maxDiscountPercent?: number;            // % remise maximum autorisé
  allowNegativePrices?: boolean;          // autoriser prix négatifs (remboursements)
}

/**
 * 📊 Types existants du panier (rétrocompatibilité)
 */
export interface CartItem {
  id: string;
  name: string;
  qty: number;
  unitPriceTTC: number;
  tvaRate?: number;
  isGift?: boolean;
}

/**
 * 🎨 Types pour l'interface utilisateur
 */
export interface PriceEditState {
  isOpen: boolean;
  itemId: string | null;
  mode: DiscountType;
  value: string;
  reason: string;
  isValidating: boolean;
}

// ===== UTILITAIRES =====

/**
 * 💡 Calcule le prix final après négociation
 */
export const calculateFinalPrice = (item: ExtendedCartItemWithNegotiation): number => {
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
 * 🏷️ Formate l'affichage prix avec indications visuelles
 */
export const formatPriceDisplay = (item: ExtendedCartItemWithNegotiation) => {
  const catalogPrice = item.originalPrice || item.price;
  const finalPrice = calculateFinalPrice(item);
  const hasOverride = item.priceOverride?.enabled;

  return {
    catalogPrice,
    finalPrice,
    hasOverride,
    savings: hasOverride ? catalogPrice - finalPrice : 0,
    discountType: item.priceOverride?.type || null,
    discountValue: item.priceOverride?.value || 0
  };
};
