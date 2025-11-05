import type { InvoiceItem, InvoicePayload } from '@/types';
import { resolveVendor } from '@/utils/vendorMapping';
import { externalInvoiceService } from './externalInvoiceService';
import { createSale, type CreateSalePayload } from './salesService';

function b64ToUtf8(b64: string): string {
  try {
    return decodeURIComponent(escape(atob(b64)));
  } catch {
    return atob(b64);
  }
}

function toInvoicePayload(raw: any): InvoicePayload {
  const number = String(
    raw.invoiceNumber || raw.numero_facture || raw.number || raw.id || `INV-${Date.now()}`
  );
  const date = String(raw.invoiceDate || raw.date_facture || new Date().toISOString());

  const itemsSrc = Array.isArray(raw.items) ? raw.items : Array.isArray(raw.produits) ? raw.produits : [];
  const items: InvoiceItem[] = itemsSrc.map((p: any, idx: number) => {
    const qty = Number(p.qty ?? p.quantite ?? 1);
    const unitPriceHT = Number(p.unitPriceHT ?? p.prix_ht ?? 0);
    const tvaRate = Number(p.tvaRate ?? 0.2);
    return { sku: p.sku || `${number}-${idx}`, name: p.name || p.nom || 'Produit', qty, unitPriceHT, tvaRate };
  });

  const ht = items.reduce((s, it) => s + it.unitPriceHT * it.qty, 0);
  const ttc = Number(raw.totalTTC ?? raw.montant_ttc ?? raw.amount ?? 0) || Math.round(ht * 1.2 * 100) / 100;

  return {
    invoiceNumber: number,
    invoiceDate: date,
    client: { name: raw.client?.name || raw.nom_client || 'Client inconnu' },
    items,
    totals: { ht, tva: Math.max(0, ttc - ht), ttc },
    payment: { method: raw.payment_method || raw.payment?.method || 'card', paid: true, paidAmount: ttc },
    channels: { source: 'Facturation', via: 'DirectImport' },
    idempotencyKey: number,
  };
}

export async function processImportFromHash(): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  const hash = window.location.hash || '';
  const prefix = '#import=';
  if (!hash.startsWith(prefix)) return false;
  try {
    const b64 = hash.slice(prefix.length);
    const jsonStr = b64ToUtf8(b64);
    const raw = JSON.parse(jsonStr);

    // 1) Normaliser en InvoicePayload et stocker côté factures externes
    const payload = toInvoicePayload(raw);
    externalInvoiceService.receiveInvoice(payload);
    window.dispatchEvent(new CustomEvent('external-invoices-updated'));

    // 2) Créer une vente rattachée à la vendeuse
    const resolved = resolveVendor(raw.vendeuse || raw.vendorName);
    const vendorName: string = resolved.vendorName;
    const vendorId: string = resolved.vendorId;
    const timestamp = Date.parse(payload.invoiceDate) || Date.now();
    const totalAmount = payload.totals.ttc;
    const paymentMethod = (payload.payment?.method as any) || 'card';

    const items = payload.items.map((it) => ({
      id: `${payload.invoiceNumber}-${it.sku}`,
      name: it.name,
      price: Math.round(it.unitPriceHT * (1 + it.tvaRate) * 100) / 100,
      quantity: it.qty,
      category: 'Externe',
      addedAt: new Date()
    }));

    const salePayload: CreateSalePayload = {
      vendorId,
      vendorName,
      totalAmount,
      paymentMethod,
      canceled: false,
      timestamp,
      items
    } as CreateSalePayload;

    const created = await createSale(salePayload);
    // Notifier l'UI pour mettre à jour le CA instant et la liste des ventes
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('external-sale-created', { detail: { sale: created } }));
    }

    // 3) Nettoyer le hash pour éviter réimport au refresh
    const url = new URL(window.location.href);
    url.hash = '';
    window.history.replaceState({}, document.title, url.toString());

    console.log('✅ Import direct terminé');
    return true;
  } catch (e) {
    console.error('❌ Import direct échoué:', e);
    return false;
  }
}

// 🔄 Poll léger: consommer immédiatement les POST entrants via la Function (si l’app de facturation push)
export function startDirectWebhookPolling(intervalMs: number = 5000): void {
  if (typeof window === 'undefined') return;
  const key = '__directWebhookPolling';
  if ((window as any)[key]) return; // éviter doublons
  (window as any)[key] = true;

  // Stockage temporaire pour déduplication par numéro de facture
  const processedInvoices = new Set();

  const run = async () => {
    try {
      console.log('🔄 Direct polling: récupération factures...');
      const res = await fetch('/api/caisse/facture', { method: 'GET', cache: 'no-store' });
      console.log('🔄 Direct polling: status', res.status, res.ok ? 'OK' : 'KO');

      if (!res.ok) {
        console.log('🔄 Direct polling: réponse non OK, skip');
        return;
      }

      const data = await res.json().catch(()=>null);
      console.log('🔄 Direct polling: data reçue', data);

      if (!data || !Array.isArray(data.invoices) || data.invoices.length === 0) {
        console.log('🔄 Direct polling: aucune facture, skip');
        return;
      }

      console.log(`🔄 Direct polling: ${data.invoices.length} factures à traiter`);

      let processedCount = 0;
      for (const raw of data.invoices) {
        // 🚨 DÉDUPLICATION : vérifier si facture déjà traitée
        if (processedInvoices.has(raw.numero_facture)) {
          console.log(`⏭️ Facture ${raw.numero_facture} déjà traitée, skip`);
          continue;
        }

        console.log('🔄 Traitement facture:', raw.numero_facture, 'pour', raw.vendeuse);
        const payload = toInvoicePayload(raw);

        // Ajouter à l'ensemble des factures traitées
        processedInvoices.add(raw.numero_facture);
        processedCount++;

        externalInvoiceService.receiveInvoice(payload);

        // 🚨 IMPORTANT : Les factures externes NE DOIVENT PAS créer de ventes dans IndexedDB
        // Elles doivent seulement être affichées dans "Factures" et impacter le CA instant
        // Pas de createSale() pour éviter les doublons avec les ventes caisse iPad

        console.log('✅ Facture externe reçue:', raw.numero_facture, 'pour', raw.vendeuse, 'montant:', payload.totals.ttc);

        // Dispatch d'événement pour mettre à jour le CA instant SANS créer de vente
        if (typeof window !== 'undefined') {
          console.log('🔄 Dispatch external-invoice-received (pas de vente créée)');
          window.dispatchEvent(new CustomEvent('external-invoice-received', {
            detail: {
              invoice: payload,
              vendorId: resolveVendor(raw.vendeuse || raw.vendorName).vendorId,
              amount: payload.totals.ttc
            }
          }));
        }
      }

      if (processedCount > 0) {
        console.log(`✅ ${processedCount} nouvelles factures traitées (déduplication active)`);
        console.log('🔄 Dispatch external-invoices-updated');
        window.dispatchEvent(new CustomEvent('external-invoices-updated'));
      } else {
        console.log('⏭️ Aucune nouvelle facture à traiter');
      }
    } catch (error) {
      console.error('❌ Erreur polling:', error);
    }
  };

  setInterval(run, intervalMs);
}


