// src/services/invoiceEmail.ts
// Service utilitaire: génère le HTML d'email facture et l'envoie à n8n (Alternative 1)

export interface InvoiceEmailItem {
  name: string;
  qty: number;
  unitPriceHT: number;
}

export interface InvoiceEmailClient {
  name: string;
  email?: string;
  phone?: string;
  address?: string;
}

export interface InvoiceEmailData {
  numero_facture: string;
  date_facture: string; // ISO yyyy-mm-dd
  client: InvoiceEmailClient;
  items: InvoiceEmailItem[];
  totals: { ht?: number; tva?: number; ttc: number };
  payment?: { method?: string };
}

const fmtCurrency = (n: number | string) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(
    typeof n === 'number' ? n : Number(n || 0)
  );

/**
 * Génère le HTML complet de la facture (version email responsive simple)
 */
export function generateInvoiceHTML(invoice: InvoiceEmailData): string {
  const { numero_facture, date_facture, client, items, totals, payment } = invoice;

  const itemsHtml = (items || [])
    .map(
      (it) => `
        <li style="padding:10px; margin-bottom:8px; border-left:3px solid #477A0C; background:#fff; border-radius:4px;">
          <strong>${it.name}</strong> — ${it.qty} × ${fmtCurrency(it.unitPriceHT)} = <em>${fmtCurrency(
        (it.qty || 0) * (it.unitPriceHT || 0)
      )}</em>
        </li>`
    )
    .join('');

  return `<!DOCTYPE html>
  <html lang="fr">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>Facture ${numero_facture}</title>
      <style>
        * { margin:0; padding:0; box-sizing:border-box; }
        body { font-family: Arial, sans-serif; line-height:1.45; background:#F2EFE2; -webkit-text-size-adjust:100%; }
        .container { max-width:600px; margin:0 auto; background:#fff; }
        .header { background:linear-gradient(135deg,#477A0C 0%,#14281D 100%); padding:15px; text-align:center; }
        .header h1 { color:#fff; font-size:20px; margin:0 0 6px; }
        .intro { padding:15px; background:#F2EFE2; color:#14281D; }
        .section-title { background:#477A0C; color:#fff; padding:10px; text-align:center; font-weight:bold; }
        .totals { background:#fff; padding:15px; margin:10px 15px; border:2px solid #477A0C; border-radius:8px; }
        .total-main { font-size:18px; color:#14281D; font-weight:bold; text-align:center; margin:0 0 10px 0; padding:12px; background:#FFE5CC; border:2px solid #FFA500; border-radius:8px; }
        .footer { background:linear-gradient(135deg,#477A0C 0%,#14281D 100%); color:#fff !important; padding:15px; text-align:center; }
        .footer a { color:#fff !important; text-decoration:none; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>MYCONFORT — Facture ${numero_facture}</h1>
        </div>

        <div class="intro">
          <p>Bonjour ${client?.name || ''},</p>
          <p>Veuillez trouver ci-dessous le récapitulatif de votre facture du ${date_facture}.</p>
        </div>

        <div class="section-title">Produits</div>
        <div style="background:#fff; padding:15px;">
          <ul style="list-style:none; padding:0; margin:0;">${itemsHtml ||
            '<li><em>Aucun produit</em></li>'}</ul>
        </div>

        <div class="section-title">Total</div>
        <div class="totals">
          <div class="total-main">${fmtCurrency(totals?.ttc || 0)}</div>
          <div style="font-size:13px; color:#14281D; text-align:center;">
            ${payment?.method ? `Mode de règlement : <strong>${payment.method}</strong>` : ''}
          </div>
        </div>

        <div class="footer">
          <div>Merci pour votre confiance !</div>
          <div style="margin-top:8px; font-size:12px; opacity:.9;">
            88 Avenue des Ternes, 75017 Paris — Tél : 06 61 48 60 23 — Email : <a href="mailto:myconfort@gmail.com">myconfort@gmail.com</a>
          </div>
        </div>
      </div>
    </body>
  </html>`;
}

export interface N8nInvoicePayload {
  numero_facture: string;
  nom_du_client: string;
  email_client?: string;
  html_content: string;
  fichier_facture?: string; // base64
}

export function buildN8nPayload(invoice: InvoiceEmailData, pdfBase64?: string): N8nInvoicePayload {
  return {
    numero_facture: invoice.numero_facture,
    nom_du_client: invoice.client?.name || '',
    email_client: invoice.client?.email,
    html_content: generateInvoiceHTML(invoice),
    ...(pdfBase64 ? { fichier_facture: pdfBase64 } : {}),
  };
}

export async function sendInvoiceToN8n(payload: N8nInvoicePayload): Promise<Response> {
  // Proxy Netlify Functions → n8n (Alternative 1)
  return fetch('/api/n8n/webhook/caisse/facture', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

export async function sendInvoiceEmail(invoice: InvoiceEmailData, pdfBase64?: string): Promise<boolean> {
  const payload = buildN8nPayload(invoice, pdfBase64);
  const res = await sendInvoiceToN8n(payload);
  return res.ok;
}


