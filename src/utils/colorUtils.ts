/**
 * Utilitaires pour calculer les couleurs de contraste
 */

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
 * Calcule la luminance d'une couleur RGB
 */
function getLuminance(r: number, g: number, b: number): number {
  const [rs, gs, bs] = [r, g, b].map(c => {
    c = c / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

/**
 * Détermine si un fond nécessite un texte blanc ou noir pour un bon contraste
 */
export function getContrastColor(backgroundColor: string): string {
  const rgb = hexToRgb(backgroundColor);
  if (!rgb) return '#000000'; // Fallback vers noir
  
  const luminance = getLuminance(rgb.r, rgb.g, rgb.b);
  
  // Si la luminance est faible (fond sombre), utiliser du blanc
  // Si la luminance est élevée (fond clair), utiliser du noir
  return luminance > 0.5 ? '#000000' : '#FFFFFF';
}

/**
 * Génère une version plus claire ou plus foncée d'une couleur
 */
export function adjustColorBrightness(color: string, amount: number): string {
  const rgb = hexToRgb(color);
  if (!rgb) return color;
  
  const adjust = (value: number) => {
    const adjusted = Math.round(value + (amount * 255));
    return Math.max(0, Math.min(255, adjusted));
  };
  
  const newR = adjust(rgb.r);
  const newG = adjust(rgb.g);
  const newB = adjust(rgb.b);
  
  return `#${newR.toString(16).padStart(2, '0')}${newG.toString(16).padStart(2, '0')}${newB.toString(16).padStart(2, '0')}`;
}

/**
 * Obtient les couleurs thématiques pour un vendeur avec contraste automatique
 */
export function getVendorThemeColors(vendorColor: string) {
  const backgroundColor = vendorColor;
  const textColor = getContrastColor(vendorColor);
  const lightBackground = adjustColorBrightness(vendorColor, 0.4); // Plus clair pour les backgrounds secondaires
  const darkBackground = adjustColorBrightness(vendorColor, -0.2); // Plus foncé pour les accents
  
  return {
    primary: backgroundColor,
    text: textColor,
    light: lightBackground,
    dark: darkBackground,
    textOnLight: getContrastColor(lightBackground),
    textOnDark: getContrastColor(darkBackground)
  };
}
