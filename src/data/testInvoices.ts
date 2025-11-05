/**
 * Données de test pour les factures externes
 * À charger via la console du navigateur pour tester l'interface
 * Version: 3.8.1
 */

export const testExternalInvoices = [
  {
    invoiceNumber: "2025-001",
    invoiceDate: "2025-08-09T10:30:00.000Z",
    client: {
      name: "Jean Dupont",
      email: "jean.dupont@email.com",
      phone: "06 12 34 56 78",
      address: "123 Rue de la Paix, 75001 Paris"
    },
    items: [
      {
        sku: "MAT-140x190-BAMBOU",
        name: "Matelas Bambou 140×190",
        qty: 1,
        unitPriceHT: 1500,
        tvaRate: 0.20
      },
      {
        sku: "SOM-140x190-RELAX",
        name: "Sommier Relaxation 140×190",
        qty: 1,
        unitPriceHT: 800,
        tvaRate: 0.20
      }
    ],
    totals: {
      ht: 2300,
      tva: 460,
      ttc: 2760
    },
    payment: {
      method: "Carte bleue",
      paid: true,
      paidAmount: 2760,
      depositRate: 0
    },
    channels: {
      source: "Salon de l'Habitat Paris",
      via: "N8N Webhook"
    },
    idempotencyKey: "2025-001"
  },
  {
    invoiceNumber: "2025-002",
    invoiceDate: "2025-08-09T14:15:00.000Z",
    client: {
      name: "Marie Martin",
      email: "marie.martin@email.com",
      phone: "06 98 76 54 32",
      address: "456 Avenue des Champs, 75008 Paris"
    },
    items: [
      {
        sku: "MAT-160x200-MEMO",
        name: "Matelas Mémoire de Forme 160×200",
        qty: 1,
        unitPriceHT: 2000,
        tvaRate: 0.20
      }
    ],
    totals: {
      ht: 2000,
      tva: 400,
      ttc: 2400
    },
    payment: {
      method: "Acompte + 3 chèques",
      paid: false,
      paidAmount: 600,
      depositRate: 0.25
    },
    channels: {
      source: "Boutique MyConfort",
      via: "N8N Webhook"
    },
    idempotencyKey: "2025-002"
  },
  {
    invoiceNumber: "2025-003",
    invoiceDate: "2025-08-09T16:45:00.000Z",
    client: {
      name: "Pierre Durand",
      email: "pierre.durand@email.com",
      phone: "06 11 22 33 44",
      address: "789 Boulevard Saint-Germain, 75007 Paris"
    },
    items: [
      {
        sku: "ENS-140x190-COMPLETE",
        name: "Ensemble Complet 140×190",
        qty: 1,
        unitPriceHT: 1200,
        tvaRate: 0.20
      },
      {
        sku: "ORE-ERGO-MEMORY",
        name: "Oreiller Ergonomique Memory",
        qty: 2,
        unitPriceHT: 80,
        tvaRate: 0.20
      }
    ],
    totals: {
      ht: 1360,
      tva: 272,
      ttc: 1632
    },
    payment: {
      method: "Virement",
      paid: false,
      paidAmount: 0,
      depositRate: 0
    },
    channels: {
      source: "Site Web MyConfort",
      via: "N8N Webhook"
    },
    idempotencyKey: "2025-003"
  }
];

// Code à exécuter dans la console du navigateur pour charger les données de test
export const loadTestDataScript = `
// Charger les données de test dans localStorage
const testInvoices = ${JSON.stringify(testExternalInvoices, null, 2)};

// Ajouter chaque facture dans le service
testInvoices.forEach(invoice => {
  if (window.externalInvoiceService) {
    window.externalInvoiceService.receiveInvoice(invoice);
    console.log('✅ Facture ajoutée:', invoice.invoiceNumber);
  }
});

console.log('🎉 Données de test chargées ! Rechargez la page pour voir les factures.');
console.log('📊 Total:', testInvoices.length, 'factures externes ajoutées');
`;

console.log('📋 Données de test disponibles');
console.log('🔧 Pour charger dans l\'app, copiez et exécutez dans la console:');
console.log(loadTestDataScript);

export default testExternalInvoices;
