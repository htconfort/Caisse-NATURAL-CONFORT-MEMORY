function normalizeBase(url?: string): string {
  if (!url) return '';
  return url.replace(/\/$/, '');
}

// Priorités d'URL (override explicite > base proxy > vide)
const WEBHOOK_BASE: string = normalizeBase(import.meta.env.VITE_N8N_WEBHOOK_URL as string) || '';
// Base proxy par défaut sur Netlify/Vite
const N8N_BASE: string = normalizeBase((import.meta.env.VITE_N8N_URL as string) || 'https://n8n.myconfort.fr');
// URL spécifiques (si directement fournies)
const N8N_SYNC_URL: string = normalizeBase(import.meta.env.VITE_N8N_SYNC_URL as string) || '';
const N8N_GET_FACTURES_URL: string = normalizeBase(import.meta.env.VITE_N8N_GET_FACTURES_URL as string) || '';
const N8N_STATUS_URL: string = normalizeBase(import.meta.env.VITE_N8N_STATUS_URL as string) || '';

function assertConfigured(): void {
  // Avec fallback par défaut sur /api/n8n, on considère toujours configuré
  if (!N8N_BASE) {
    throw new Error('Configuration N8N invalide: base URL absente.');
  }
}

export async function sendInvoice(payload: unknown): Promise<any> {
  assertConfigured();
  // Utiliser directement l'ID du webhook POST correct pour envoyer les factures
  const url = WEBHOOK_BASE || N8N_SYNC_URL || `${N8N_BASE}/webhook/bc49c897-8666-4127-ad8-4bc688c2272c`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error('n8n facture failed');
  return response.json();
}

export async function updateStatus(numero_facture: string, patch: Record<string, unknown>): Promise<any> {
  assertConfigured();
  const base = WEBHOOK_BASE?.replace(/\/caisse\/facture$/, '') || '';
  const statusUrlFromWebhook = base ? `${base}/caisse/status` : '';
  const url = statusUrlFromWebhook || N8N_STATUS_URL || `${N8N_BASE}/caisse/status`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ numero_facture, ...patch }),
  });
  if (!response.ok) throw new Error('n8n status failed');
  return response.json();
}

export async function listInvoices(limit: number = 50): Promise<any> {
  assertConfigured();
  // Utiliser directement l'URL N8N avec l'ID du webhook GET correct
  const listBase = N8N_GET_FACTURES_URL || `${N8N_BASE}/webhook/053170e3-fe71-4382-80c3-eaef4751cdeb`;
  const fullUrl = `${listBase}?limit=${encodeURIComponent(String(limit))}`;
  
  console.log('🔍 listInvoices - Configuration:', {
    N8N_BASE,
    N8N_GET_FACTURES_URL,
    listBase,
    fullUrl,
    limit
  });
  
  const response = await fetch(fullUrl);
  
  console.log('🔍 listInvoices - Response:', {
    ok: response.ok,
    status: response.status,
    statusText: response.statusText,
    url: response.url
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    console.error('❌ listInvoices - Error response:', errorText);
    throw new Error(`n8n list failed: ${response.status} ${response.statusText} - ${errorText}`);
  }
  
  const data = await response.json();
  console.log('✅ listInvoices - Success:', { dataLength: Array.isArray(data) ? data.length : 'not array', data });
  return data;
}



