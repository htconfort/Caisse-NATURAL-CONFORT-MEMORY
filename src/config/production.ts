// src/config/production.ts
// Active des "garde-fous" anti-données démo en prod (ou dès que ce n'est pas localhost)

export const PRODUCTION_CONFIG = {
  // On n'utilise plus de garde bloquant l'affichage des factures externes
  DISABLE_DEMO_DATA: false,
  FORCE_EMPTY_INVOICES: false,
  DEMO_MODE: false,
  DEBUG_MODE: false,
};

declare global {
  interface Window {
    PRODUCTION_MODE?: boolean;
    DISABLE_ALL_DEMO_DATA?: boolean;
    FORCE_EMPTY_INVOICES?: boolean;
    DEMO_MODE?: boolean;
  }
}

// Activation côté client
if (typeof window !== 'undefined') {
  // Désactiver les drapeaux qui cachaient les factures externes
  window.PRODUCTION_MODE = false;
  window.DISABLE_ALL_DEMO_DATA = false;
  window.FORCE_EMPTY_INVOICES = false;
  window.DEMO_MODE = false;
}
