import type { Sale, ExtendedCartItem } from '../types';

// Fonctions utilitaires pour l'application

/**
 * Extrait les dimensions d'un nom de produit
 * @param productName - Nom du produit
 * @returns Les dimensions au format "largeur x longueur" ou null si non trouvé
 */
export const extractDimensions = (productName: string): string | null => {
  const match = productName.match(/(\d+)\s*x\s*(\d+)/);
  return match ? `${match[1]} x ${match[2]}` : null;
};

/**
 * Supprime les dimensions d'un nom de produit
 * @param productName - Nom du produit avec dimensions
 * @returns Le nom du produit sans les dimensions
 */
export const getProductNameWithoutDimensions = (productName: string): string => {
  return productName.replace(/\s*\d+\s*x\s*\d+/, '').trim();
};

/**
 * Vérifie si un produit est un matelas
 * @param category - Catégorie du produit
 * @returns true si c'est un matelas
 */
export const isMatressProduct = (category: string): boolean => {
  return category === 'Matelas';
};

/**
 * Obtient la couleur de fond selon la catégorie
 * @param category - Catégorie du produit
 * @returns Couleur CSS pour le fond
 */
export const getCategoryBackgroundColor = (category: string): string => {
  switch (category) {
    case 'Matelas': return 'var(--primary-green)';
    case 'Sur-matelas': return 'var(--secondary-blue)';
    case 'Couettes': return 'var(--accent-purple)';
    case 'Oreillers': return 'var(--warning-red)';
    case 'Plateau': return 'var(--dark-green)';
    case 'Accessoires': return 'var(--accent-lime)';
    default: return 'white';
  }
};

/**
 * Obtient la couleur de texte selon la couleur de fond
 * @param backgroundColor - Couleur de fond CSS
 * @returns Couleur de texte appropriée
 */
export const getTextColor = (backgroundColor: string): string => {
  const lightColors = ['var(--accent-lime)', 'var(--secondary-blue)', 'var(--accent-purple)', 'var(--warning-red)'];
  return lightColors.includes(backgroundColor) ? '#000000' : '#ffffff';
};

/**
 * Convertit les données de vente en format CSV
 * @param salesData - Données des ventes
 * @returns String CSV
 */
export const convertToCSV = (salesData: Sale[]): string => {
  const headers = ['Date', 'Vendeur', 'Montant', 'Mode de paiement', 'Nombre d\'articles'];
  const rows = salesData.map(sale => [
    new Date(sale.date).toLocaleString('fr-FR'),
    sale.vendorName,
    sale.totalAmount.toFixed(2) + '€',
    sale.paymentMethod,
    sale.items.reduce((sum: number, item: ExtendedCartItem) => sum + item.quantity, 0)
  ]);
  
  return [headers, ...rows].map(row => row.join(',')).join('\n');
};
