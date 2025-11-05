import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Router } from './Router.tsx'
import './index.css'
import { processImportFromHash, startDirectWebhookPolling } from './services/directImport'
import ErrorBoundary from './components/ErrorBoundary'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <Router />
    </ErrorBoundary>
  </StrictMode>,
)
// Cache-buster: 20250828_172726

// Import direct via hash (#import=base64)
processImportFromHash().catch(() => {})

// 🚫 DÉSACTIVÉ : Démarrage d'un polling léger pour consommer les factures poussées par webhook
// startDirectWebhookPolling(5000) // Désactivé pour éviter les boucles infinies
