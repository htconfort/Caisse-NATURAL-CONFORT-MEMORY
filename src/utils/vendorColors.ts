import { vendors } from '../data';

export interface VendorColorInfo {
  backgroundColor: string;
  textColor: string;
  borderColor: string;
  accentColor: string;
}

/**
 * Calcule la luminance d'une couleur pour déterminer le contraste
 */
function getLuminance(hex: string): number {
  const rgb = hexToRgb(hex);
  if (!rgb) return 0;
  
  const { r, g, b } = rgb;
  const [rs, gs, bs] = [r, g, b].map(c => {
    c = c / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

/**
 * Convertit une couleur hex en RGB
 */
function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
}

/**
 * Assombrit une couleur d'un pourcentage donné
 */
function darkenColor(hex: string, percent: number): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  
  const { r, g, b } = rgb;
  const factor = (100 - percent) / 100;
  
  const newR = Math.round(r * factor);
  const newG = Math.round(g * factor);
  const newB = Math.round(b * factor);
  
  return `#${[newR, newG, newB].map(c => c.toString(16).padStart(2, '0')).join('')}`;
}

/**
 * Éclaircit une couleur d'un pourcentage donné
 */
function lightenColor(hex: string, percent: number): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  
  const { r, g, b } = rgb;
  const factor = percent / 100;
  
  const newR = Math.round(r + (255 - r) * factor);
  const newG = Math.round(g + (255 - g) * factor);
  const newB = Math.round(b + (255 - b) * factor);
  
  return `#${[newR, newG, newB].map(c => c.toString(16).padStart(2, '0')).join('')}`;
}

/**
 * Récupère les informations de couleur complètes pour une vendeuse
 */
export function getVendorColorInfo(vendorName?: string): VendorColorInfo {
  if (!vendorName) {
    return {
      backgroundColor: '#f8f9fa',
      textColor: '#1f2937',
      borderColor: '#e5e7eb',
      accentColor: '#6b7280'
    };
  }

  // Normaliser le nom (enlever les espaces et convertir en minuscules)
  const normalizedName = vendorName.toLowerCase().trim();
  
  // Trouver la vendeuse correspondante
  const vendor = vendors.find(v => 
    v.name.toLowerCase().trim() === normalizedName ||
    v.name.toLowerCase().trim().includes(normalizedName) ||
    normalizedName.includes(v.name.toLowerCase().trim())
  );

  if (!vendor) {
    // Couleur par défaut si vendeuse non trouvée
    return {
      backgroundColor: '#f8f9fa',
      textColor: '#1f2937',
      borderColor: '#e5e7eb',
      accentColor: '#6b7280'
    };
  }

  const baseColor = vendor.color;
  const luminance = getLuminance(baseColor);
  
  // Couleurs franches et contrastées pour iPad
  const backgroundColor = baseColor; // Couleur franche directe
  
  // Règles spécifiques pour chaque vendeuse selon vos demandes
  let textColor = '#000000'; // Par défaut noir
  
  // Vendeuses avec texte BLANC (fonds sombres)
  if (['Sylvie', 'Lucia', 'Babette'].includes(vendor.name)) {
    textColor = '#ffffff';
  }
  // Vendeuses avec texte NOIR (fonds clairs)  
  else if (['Johan', 'Sabrina', 'Billy'].includes(vendor.name)) {
    textColor = '#000000';
  }
  // Fallback automatique basé sur la luminance
  else {
    textColor = luminance > 0.5 ? '#000000' : '#ffffff';
  }
  
  const borderColor = darkenColor(baseColor, 20); // Bordure plus foncée
  const accentColor = luminance > 0.5 ? darkenColor(baseColor, 30) : lightenColor(baseColor, 30);

  return {
    backgroundColor,
    textColor,
    borderColor,
    accentColor
  };
}

/**
 * Obtient la couleur associée à une vendeuse (legacy)
 */
export function getVendorColor(vendorName?: string): string {
  return getVendorColorInfo(vendorName).backgroundColor;
}

/**
 * Génère les styles CSS complets pour une facture de vendeuse
 */
export function getVendorInvoiceStyles(vendorName?: string): React.CSSProperties {
  const colors = getVendorColorInfo(vendorName);
  
  return {
    backgroundColor: colors.backgroundColor,
    color: colors.textColor,
    borderColor: colors.borderColor,
    borderWidth: '4px',
    borderStyle: 'solid',
    borderRadius: '12px',
    // Styles spécifiques iPad : polices plus grandes
    fontSize: '16px',
    fontWeight: '500'
  };
}

/**
 * Génère les styles pour l'en-tête d'une facture
 */
export function getVendorHeaderStyles(vendorName?: string): React.CSSProperties {
  const colors = getVendorColorInfo(vendorName);
  
  return {
    backgroundColor: colors.backgroundColor, // Couleur de fond de la vendeuse
    color: colors.textColor, // Utilise la couleur de texte calculée selon la luminance
    fontSize: '24px',
    fontWeight: 'bold',
    padding: '16px',
    borderRadius: '8px 8px 0 0',
    textShadow: colors.textColor === '#ffffff' 
      ? '1px 1px 2px rgba(0,0,0,0.8)' // Ombre noire pour texte blanc
      : '1px 1px 2px rgba(255,255,255,0.8)', // Ombre blanche pour texte noir
    border: `2px solid ${colors.borderColor}`
  };
}

/**
 * Génère les styles pour le nom de la vendeuse
 */
export function getVendorNameStyles(vendorName?: string): React.CSSProperties {
  const colors = getVendorColorInfo(vendorName);
  
  return {
    color: colors.accentColor,
    fontSize: '16px',
    fontWeight: 'bold',
    textShadow: '1px 1px 2px rgba(0,0,0,0.1)'
  };
}

/**
 * Génère un style CSS avec la couleur de la vendeuse (legacy)
 */
export function getVendorColorStyle(vendorName?: string, opacity: number = 0.1) {
  const color = getVendorColor(vendorName);
  
  return {
    borderLeftColor: color,
    borderLeftWidth: '4px',
    borderLeftStyle: 'solid',
    backgroundColor: `${color}${Math.round(opacity * 255).toString(16).padStart(2, '0')}`
  };
}

/**
 * Obtient une version claire de la couleur de la vendeuse pour les fonds (legacy)
 */
export function getVendorLightColor(vendorName?: string): string {
  const color = getVendorColor(vendorName);
  return `${color}15`; // Ajouter 15 en hex = ~8% d'opacité
}

/**
 * Obtient la couleur principale de la vendeuse pour les textes et accents
 * @param vendorName Le nom de la vendeuse
 * @returns La couleur complète
 */
export function getVendorAccentColor(vendorName?: string): string {
  return getVendorColor(vendorName);
}
