import type { CatalogProduct, Vendor } from '../types';

// Données complètes du catalogue - EXACTEMENT SELON VOTRE LISTE (54 produits) - MIS À JOUR
export const productCatalog: CatalogProduct[] = [
  // Matelas (10)
  { category: 'Matelas', name: 'MATELAS BAMBOU 70 x 190', priceTTC: 900, autoCalculateHT: true },
  { category: 'Matelas', name: 'MATELAS BAMBOU 80 x 200', priceTTC: 1050, autoCalculateHT: true },
  { category: 'Matelas', name: 'MATELAS BAMBOU 90 x 190', priceTTC: 1110, autoCalculateHT: true },
  { category: 'Matelas', name: 'MATELAS BAMBOU 90 x 200', priceTTC: 1150, autoCalculateHT: true },
  { category: 'Matelas', name: 'MATELAS BAMBOU 120 x 190', priceTTC: 1600, autoCalculateHT: true },
  { category: 'Matelas', name: 'MATELAS BAMBOU 140 x 190', priceTTC: 1800, autoCalculateHT: true },
  { category: 'Matelas', name: 'MATELAS BAMBOU 140 x 200', priceTTC: 1880, autoCalculateHT: true },
  { category: 'Matelas', name: 'MATELAS BAMBOU 160 x 200', priceTTC: 2100, autoCalculateHT: true },
  { category: 'Matelas', name: 'MATELAS BAMBOU 180 x 200', priceTTC: 2200, autoCalculateHT: true },
  { category: 'Matelas', name: 'MATELAS BAMBOU 200 x 200', priceTTC: 2300, autoCalculateHT: true },

  // Sur-matelas (9)
  { category: 'Sur-matelas', name: 'SURMATELAS BAMBOU 70 x 190', priceTTC: 220, autoCalculateHT: true },
  { category: 'Sur-matelas', name: 'SURMATELAS BAMBOU 80 x 200', priceTTC: 280, autoCalculateHT: true },
  { category: 'Sur-matelas', name: 'SURMATELAS BAMBOU 90 x 190', priceTTC: 310, autoCalculateHT: true },
  { category: 'Sur-matelas', name: 'SURMATELAS BAMBOU 90 x 200', priceTTC: 320, autoCalculateHT: true },
  { category: 'Sur-matelas', name: 'SURMATELAS BAMBOU 120 x 190', priceTTC: 420, autoCalculateHT: true },
  { category: 'Sur-matelas', name: 'SURMATELAS BAMBOU 140 x 190', priceTTC: 440, autoCalculateHT: true },
  { category: 'Sur-matelas', name: 'SURMATELAS BAMBOU 160 x 200', priceTTC: 490, autoCalculateHT: true },
  { category: 'Sur-matelas', name: 'SURMATELAS BAMBOU 180 x 200', priceTTC: 590, autoCalculateHT: true },
  { category: 'Sur-matelas', name: 'SURMATELAS BAMBOU 200 x 200', priceTTC: 630, autoCalculateHT: true },
  
  // Couettes (2)
  { category: 'Couettes', name: 'Couette 220x240', priceTTC: 300, autoCalculateHT: true },
  { category: 'Couettes', name: 'Couette 240 x 260', priceTTC: 350, autoCalculateHT: true },
  
  // Oreillers (15) - PACKS EN PREMIER (ordre prioritaire)
  { category: 'Oreillers', name: 'Pack Oreiller 2 Thalasso', priceTTC: 100, autoCalculateHT: true, isPack: true, packColor: '#dc2626' },
  { category: 'Oreillers', name: 'Pack Oreiller 2 Dual', priceTTC: 100, autoCalculateHT: true, isPack: true, packColor: '#ea580c' },
  { category: 'Oreillers', name: 'Pack oreillers 150 euros, douceur et papillon', priceTTC: 150, autoCalculateHT: true, isPack: true, packColor: '#16a34a' },
  
  // Oreillers individuels
  { category: 'Oreillers', name: 'Oreiller Douceur', priceTTC: 80, autoCalculateHT: true },
  { category: 'Oreillers', name: 'Oreiller Thalasso', priceTTC: 60, autoCalculateHT: true },
  { category: 'Oreillers', name: 'Oreiller Dual', priceTTC: 60, autoCalculateHT: true },
  { category: 'Oreillers', name: 'Oreiller Panama', priceTTC: 70, autoCalculateHT: true },
  { category: 'Oreillers', name: 'Oreiller Papillon', priceTTC: 80, autoCalculateHT: true },
  { category: 'Oreillers', name: 'Oreiller Flocon', priceTTC: 50, autoCalculateHT: true },
  { category: 'Oreillers', name: 'Oreiller Voyage', priceTTC: 35, autoCalculateHT: true },
  { category: 'Oreillers', name: 'Traversin 140', priceTTC: 140, autoCalculateHT: true },
  { category: 'Oreillers', name: 'Traversin 160', priceTTC: 160, autoCalculateHT: true },
  { category: 'Oreillers', name: 'Pack oreiller dual plus douceur', priceTTC: 130, autoCalculateHT: true },
  
  // Plateaux Prestige (10)
  { category: 'Plateau', name: 'PLATEAU PRESTIGE 70 x 190', priceTTC: 70, autoCalculateHT: true },
  { category: 'Plateau', name: 'PLATEAU PRESTIGE 80 x 200', priceTTC: 80, autoCalculateHT: true },
  { category: 'Plateau', name: 'PLATEAU PRESTIGE 90 x 190', priceTTC: 100, autoCalculateHT: true },
  { category: 'Plateau', name: 'PLATEAU PRESTIGE 90 x 200', priceTTC: 110, autoCalculateHT: true },
  { category: 'Plateau', name: 'PLATEAU PRESTIGE 120 x 190', priceTTC: 160, autoCalculateHT: true },
  { category: 'Plateau', name: 'PLATEAU PRESTIGE 140 x 190', priceTTC: 180, autoCalculateHT: true },
  { category: 'Plateau', name: 'PLATEAU PRESTIGE 140 x 200', priceTTC: 190, autoCalculateHT: true },
  { category: 'Plateau', name: 'PLATEAU PRESTIGE 160 x 200', priceTTC: 210, autoCalculateHT: true },
  { category: 'Plateau', name: 'PLATEAU PRESTIGE 180 x 200', priceTTC: 220, autoCalculateHT: true },
  { category: 'Plateau', name: 'PLATEAU PRESTIGE 200 x 200', priceTTC: 230, autoCalculateHT: true },

  // Plateaux Fraîche (10) - Même tailles, même prix
  { category: 'Plateau Fraîche', name: 'PLATEAU FRAÎCHE 70 x 190', priceTTC: 70, autoCalculateHT: true },
  { category: 'Plateau Fraîche', name: 'PLATEAU FRAÎCHE 80 x 200', priceTTC: 80, autoCalculateHT: true },
  { category: 'Plateau Fraîche', name: 'PLATEAU FRAÎCHE 90 x 190', priceTTC: 100, autoCalculateHT: true },
  { category: 'Plateau Fraîche', name: 'PLATEAU FRAÎCHE 90 x 200', priceTTC: 110, autoCalculateHT: true },
  { category: 'Plateau Fraîche', name: 'PLATEAU FRAÎCHE 120 x 190', priceTTC: 160, autoCalculateHT: true },
  { category: 'Plateau Fraîche', name: 'PLATEAU FRAÎCHE 140 x 190', priceTTC: 180, autoCalculateHT: true },
  { category: 'Plateau Fraîche', name: 'PLATEAU FRAÎCHE 140 x 200', priceTTC: 190, autoCalculateHT: true },
  { category: 'Plateau Fraîche', name: 'PLATEAU FRAÎCHE 160 x 200', priceTTC: 210, autoCalculateHT: true },
  { category: 'Plateau Fraîche', name: 'PLATEAU FRAÎCHE 180 x 200', priceTTC: 220, autoCalculateHT: true },
  { category: 'Plateau Fraîche', name: 'PLATEAU FRAÎCHE 200 x 200', priceTTC: 230, autoCalculateHT: true },
  
  // Accessoires (7)
  { category: 'Accessoires', name: 'Le régule jambes', priceTTC: 70, autoCalculateHT: true },
  { category: 'Accessoires', name: 'PACK 2 Taies d\'oreiller fraîcheur Actif Cool', priceTTC: 20, autoCalculateHT: true },
  { category: 'Accessoires', name: 'Protège-matelas 80 x 200', priceTTC: 80, autoCalculateHT: true },
  { category: 'Accessoires', name: 'Protège-matelas 90 x 200', priceTTC: 90, autoCalculateHT: true },
  { category: 'Accessoires', name: 'Protège-matelas 140 x 190', priceTTC: 140, autoCalculateHT: true },
  { category: 'Accessoires', name: 'Protège-matelas 160 x 200', priceTTC: 160, autoCalculateHT: true },
  { category: 'Accessoires', name: 'Protège-matelas 180 x 200', priceTTC: 180, autoCalculateHT: true }
];

// Vendeuses disponibles avec couleurs de la charte Natural Confort
export const vendors: Vendor[] = [
  // ✅ Personnel ACTIF
  { id: '1', name: 'Sylvie', dailySales: 0, totalSales: 0, color: '#477A0C', active: true },
  { id: '2', name: 'Babette', dailySales: 0, totalSales: 0, color: '#F55D3E', active: true },
  { id: '3', name: 'Lucia', dailySales: 0, totalSales: 0, color: '#14281D', active: true },
  { id: '6', name: 'Sabrina', dailySales: 0, totalSales: 0, color: '#D68FD6', active: true },
  { id: '8', name: 'Karima', dailySales: 0, totalSales: 0, color: '#FF6B9D', active: true },
  // ❌ Ancien personnel (gardé pour historique ventes)
  { id: '5', name: 'Johan', dailySales: 0, totalSales: 0, color: '#89BBFE', active: false },
  { id: '7', name: 'Billy', dailySales: 0, totalSales: 0, color: '#FFFF99', active: false },
];

// Clés localStorage standardisées pour Natural Confort
export const STORAGE_KEYS = {
  CART: 'naturalconfort-cart',
  SALES: 'naturalconfort-sales',
  VENDOR: 'naturalconfort-current-vendor',
  VENDORS_STATS: 'naturalconfort-vendors'
} as const;
