
// Nettoyage localStorage
localStorage.clear();

// Réinitialisation du service de factures externes
if (window.externalInvoiceService) {
  window.externalInvoiceService.clearAll();
}

console.log('✅ Environment nettoyé pour les tests');

