/**
 * Traductions françaises pour l'application Caisse MyConfort
 */

export const translations = {
  // Statuts des factures
  invoiceStatus: {
    draft: '📝 Brouillon',
    sent: '📤 Envoyée', 
    partial: '🔄 Partielle',
    paid: '✅ Payée',
    cancelled: '❌ Annulée'
  },

  // Statuts des articles
  itemStatus: {
    pending: '⏳ En attente',
    available: '✅ Disponible', 
    delivered: '📦 Livré',
    cancelled: '❌ Annulé'
  },

  // Actions sur les articles
  itemActions: {
    pending: 'Marquer en attente',
    available: 'Marquer disponible',
    delivered: 'Marquer livré', 
    cancelled: 'Marquer annulé'
  },

  // Couleurs des vendeurs
  vendorColors: {
    'MYCONFORT': { bg: 'bg-blue-50', border: 'border-blue-200', accent: 'bg-blue-500' },
    'Sophie Dubois': { bg: 'bg-pink-50', border: 'border-pink-200', accent: 'bg-pink-500' },
    'Marie Lefebvre': { bg: 'bg-green-50', border: 'border-green-200', accent: 'bg-green-500' },
    'Lucie Petit': { bg: 'bg-purple-50', border: 'border-purple-200', accent: 'bg-purple-500' },
    'Bruno': { bg: 'bg-orange-50', border: 'border-orange-200', accent: 'bg-orange-500' },
    'SYLVIE': { bg: 'bg-indigo-50', border: 'border-indigo-200', accent: 'bg-indigo-500' },
    default: { bg: 'bg-gray-50', border: 'border-gray-200', accent: 'bg-gray-500' }
  },

  // Interface générale
  ui: {
    createdOn: 'Créée le',
    seller: 'Vendeuse',
    notes: 'Notes',
    products: 'Produits',
    quantity: 'Quantité',
    unitPrice: 'Prix unitaire',
    totalPrice: 'Prix total',
    event: 'Événement',
    client: 'Client',
    email: 'Email',
    phone: 'Téléphone'
  }
};

/**
 * Obtient la couleur associée à un vendeur
 */
export const getVendorColor = (vendorName?: string): typeof translations.vendorColors.default => {
  if (!vendorName) return translations.vendorColors.default;
  
  // Recherche exacte d'abord
  const vendorColors = translations.vendorColors as Record<string, typeof translations.vendorColors.default>;
  if (vendorColors[vendorName]) {
    return vendorColors[vendorName];
  }
  
  // Recherche partielle (au cas où le nom contiendrait des espaces ou caractères supplémentaires)
  const normalizedVendor = vendorName.trim().toUpperCase();
  for (const [key, colors] of Object.entries(translations.vendorColors)) {
    if (key.toUpperCase().includes(normalizedVendor) || normalizedVendor.includes(key.toUpperCase())) {
      return colors;
    }
  }
  
  return translations.vendorColors.default;
};
