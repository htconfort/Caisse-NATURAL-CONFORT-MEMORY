/**
 * Configuration du webhook N8N pour réception des factures MyConfort
 * Convertit les données N8N vers le format de notre système externe
 * Version: 3.8.1
 */

export interface N8NInvoiceData {
  numero_facture: string;
  date_facture: string;
  nom_du_client: string;
  email_client: string;
  telephone_client: string;
  adresse_client?: string;
  client_code_postal?: string;
  client_ville?: string;
  client_siret?: string;
  produits: Array<{
    nom: string;
    categorie?: string;
    quantite: number;
    prix_ht: number;
    prix_ttc: number;
    taux_tva: number;
    remise?: number;
    type_remise?: 'percent' | 'amount';
    statut_livraison?: 'delivered' | 'to_deliver' | 'pending' | 'cancelled';
  }>;
  montant_ht: number;
  montant_tva: number;
  montant_ttc: number;
  acompte?: number;
  montant_restant?: number;
  mode_paiement: string;
  mode_paiement_details?: string;
  signature?: string;
  signature_image?: string;
  conseiller?: string;
  lieu_evenement?: string;
  notes_facture?: string;
  fichier_facture?: string; // PDF en base64
}

/**
 * Convertit les données N8N vers le format InvoicePayload
 */
export const convertN8NToInvoicePayload = (n8nData: N8NInvoiceData) => {
  // Validation des données requises
  if (!n8nData.numero_facture || !n8nData.nom_du_client) {
    throw new Error('Données N8N invalides : numero_facture et nom_du_client requis');
  }

  // Conversion des produits
  const items = n8nData.produits.map(produit => ({
    sku: `${n8nData.numero_facture}-${produit.nom.replace(/\s+/g, '-')}`,
    name: produit.nom,
    qty: produit.quantite,
    unitPriceHT: produit.prix_ht,
    tvaRate: produit.taux_tva / 100 // Convertir en décimal (20% = 0.20)
  }));

  // Détermination du statut de paiement
  const isPaid = (n8nData.acompte || 0) >= n8nData.montant_ttc || 
                 (n8nData.montant_restant || 0) === 0 ||
                 ['espèces', 'carte bleue', 'virement'].includes(n8nData.mode_paiement.toLowerCase());

  // Construction du payload
  const invoicePayload = {
    invoiceNumber: n8nData.numero_facture,
    invoiceDate: n8nData.date_facture,
    client: {
      name: n8nData.nom_du_client,
      email: n8nData.email_client,
      phone: n8nData.telephone_client,
      address: n8nData.adresse_client,
      postalCode: n8nData.client_code_postal,
      city: n8nData.client_ville,
      siret: n8nData.client_siret
    },
    items,
    totals: {
      ht: n8nData.montant_ht,
      tva: n8nData.montant_tva,
      ttc: n8nData.montant_ttc
    },
    payment: {
      method: n8nData.mode_paiement,
      paid: isPaid,
      paidAmount: n8nData.acompte || (isPaid ? n8nData.montant_ttc : 0),
      depositRate: n8nData.acompte ? n8nData.acompte / n8nData.montant_ttc : 0
    },
    channels: {
      source: n8nData.lieu_evenement || 'MyConfort',
      via: 'N8N Webhook'
    },
    pdfBase64: n8nData.fichier_facture,
    idempotencyKey: n8nData.numero_facture
  };

  return invoicePayload;
};

/**
 * Code à ajouter dans le workflow N8N (noeud Code avant l'envoi)
 */
export const n8nWorkflowCode = `
// Conversion des données pour l'API MyConfort
const invoiceData = {
  invoiceNumber: $json.numero_facture,
  invoiceDate: $json.date_facture,
  client: {
    name: $json.nom_du_client,
    email: $json.email_client,
    phone: $json.telephone_client,
    address: $json.adresse_client,
    postalCode: $json.client_code_postal,
    city: $json.client_ville,
    siret: $json.client_siret
  },
  items: $json.produits.map(p => ({
    sku: \`\${$json.numero_facture}-\${p.nom.replace(/\\s+/g, '-')}\`,
    name: p.nom,
    qty: p.quantite,
    unitPriceHT: p.prix_ht,
    tvaRate: p.taux_tva / 100
  })),
  totals: {
    ht: $json.montant_ht,
    tva: $json.montant_tva,
    ttc: $json.montant_ttc
  },
  payment: {
    method: $json.mode_paiement,
    paid: $json.acompte >= $json.montant_ttc || $json.montant_restant === 0,
    paidAmount: $json.acompte || 0,
    depositRate: $json.acompte ? $json.acompte / $json.montant_ttc : 0
  },
  channels: {
    source: $json.lieu_evenement || 'MyConfort',
    via: 'N8N Webhook'
  },
  pdfBase64: $json.fichier_facture,
  idempotencyKey: $json.numero_facture
};

return [{
  json: {
    ...invoiceData,
    // Garder les données originales pour compatibilité
    originalN8NData: $json
  }
}];
`;

/**
 * Configuration du webhook HTTP Request dans N8N
 */
export const n8nWebhookConfig = {
  url: 'https://votre-domaine.com/api/receive-invoice',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-Auth-Token': 'votre-token-secret'
  },
  body: '={{ JSON.stringify($json) }}',
  options: {
    timeout: 30000,
    retry: {
      enabled: false, // 🚫 DÉSACTIVÉ pour éviter les boucles infinies
      maxRetries: 0,
      retryDelay: 0
    }
  }
};

/**
 * Test de validation des données N8N
 */
export const validateN8NData = (data: unknown): data is N8NInvoiceData => {
   
  const d = data as any;
  return (
    typeof d?.numero_facture === 'string' &&
    typeof d?.nom_du_client === 'string' &&
    typeof d?.email_client === 'string' &&
    Array.isArray(d?.produits) &&
    d?.produits.length > 0 &&
    typeof d?.montant_ttc === 'number'
  );
};

export default {
  convertN8NToInvoicePayload,
  validateN8NData,
  n8nWorkflowCode,
  n8nWebhookConfig
};
