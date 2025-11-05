// Version de l'application Mon Panier
export const APP_VERSION = '3.01';
export const BUILD_DATE = new Date().toISOString();
export const FEATURES = [
  'Mode Classique (Caisse uniquement)',
  'Mode Facturier (iPad + N8N sync)',
  'Prévention doublons entre systèmes',
  'Synchronisation automatique N8N',
  'RAZ filtrée par mode'
];

// Informations de build détaillées
export const BUILD_INFO = {
  version: APP_VERSION,
  buildDate: BUILD_DATE,
  // Variables Netlify injectées au build
  branch: import.meta.env.VITE_BRANCH ?? 'main',
  commitRef: (import.meta.env.VITE_COMMIT_REF ?? 'd344939').slice(0, 7),
  buildTime: import.meta.env.VITE_BUILD_TIME ?? BUILD_DATE,
  context: import.meta.env.VITE_CONTEXT ?? 'production'
};

// Stamp de build complet pour debugging
export const BUILD_STAMP = `${BUILD_INFO.branch} @ ${BUILD_INFO.commitRef} – ${BUILD_INFO.buildTime}`;

// Pour déboguer les problèmes de synchronisation
export const DEBUG_INFO = {
  ...BUILD_INFO,
  userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : 'Unknown',
  timestamp: Date.now(),
  isProduction: BUILD_INFO.context === 'production'
};
