// Script de test direct pour diagnostiquer et corriger l'affichage des factures
// À utiliser dans la console du navigateur

console.log('🔧 DIAGNOSTIC ET CORRECTION - Factures Externes');
console.log('===============================================');

// 1. Vérifier l'état actuel
if (window.externalInvoiceService) {
  const currentInvoices = window.externalInvoiceService.getAllInvoices();
  console.log(`📊 Factures actuelles: ${currentInvoices.length}`);
  
  if (currentInvoices.length > 0) {
    console.log('📋 Exemple de facture actuelle:', currentInvoices[0]);
  }
} else {
  console.error('❌ Service externe non disponible');
}

// 2. Nettoyer et injecter des données de test détaillées
function injectDetailedTestData() {
  if (!window.externalInvoiceService) {
    console.error('❌ Service non disponible');
    return;
  }

  // Nettoyer d'abord
  window.externalInvoiceService.clearAllInvoices();
  console.log('🧹 Données nettoyées');

  // Injecter des factures de test avec tous les détails
  const detailedTestInvoices = [
    {
      invoiceNumber: "FAC-2025-001",
      invoiceDate: new Date().toISOString(),
      client: {
        name: "Restaurant La Belle Époque",
        email: "contact@belleepoque.fr",
        phone: "01 42 34 56 78",
        address: "15 rue des Gourmet, 75001 Paris"
      },
      items: [
        {
          sku: "MAT-001",
          name: "Matelas King Size Premium",
          qty: 2,
          unitPriceHT: 800.00,
          tvaRate: 0.20,
          description: "Matelas haut de gamme 180x200"
        },
        {
          sku: "SOM-001", 
          name: "Sommier Tapissier Deluxe",
          qty: 2,
          unitPriceHT: 400.00,
          tvaRate: 0.20,
          description: "Sommier tapissier 180x200"
        }
      ],
      totals: {
        ht: 2400.00,
        tva: 480.00,
        ttc: 2880.00
      },
      payment: {
        method: "Carte Bancaire",
        paid: true,
        paidAmount: 2880.00,
        paidDate: new Date().toISOString()
      },
      channels: {
        source: "Site Web",
        via: "Commande en ligne"
      },
      notes: "Livraison urgente demandée",
      idempotencyKey: "TEST-DETAILED-001"
    },
    {
      invoiceNumber: "FAC-2025-002",
      invoiceDate: new Date(Date.now() - 86400000).toISOString(), // Hier
      client: {
        name: "Hôtel des Trois Couronnes",
        email: "commandes@3couronnes.com",
        phone: "04 91 23 45 67",
        address: "27 avenue de la République, 13001 Marseille"
      },
      items: [
        {
          sku: "LIT-001",
          name: "Ensemble Literie Complète 140x190",
          qty: 5,
          unitPriceHT: 650.00,
          tvaRate: 0.20,
          description: "Matelas + sommier + tête de lit"
        },
        {
          sku: "ORE-001",
          name: "Pack 2 Oreillers Ergonomiques",
          qty: 10,
          unitPriceHT: 45.00,
          tvaRate: 0.20,
          description: "Oreillers memory foam"
        }
      ],
      totals: {
        ht: 3700.00,
        tva: 740.00,
        ttc: 4440.00
      },
      payment: {
        method: "Virement",
        paid: false,
        paidAmount: 0.00
      },
      channels: {
        source: "Commercial",
        via: "Visite directe"
      },
      notes: "Remise négociée 15%",
      idempotencyKey: "TEST-DETAILED-002"
    },
    {
      invoiceNumber: "FAC-2025-003",
      invoiceDate: new Date(Date.now() - 172800000).toISOString(), // Il y a 2 jours
      client: {
        name: "Particulier - M. Dupont",
        email: "jean.dupont@email.com",
        phone: "06 12 34 56 78",
        address: "42 rue de la Paix, 69001 Lyon"
      },
      items: [
        {
          sku: "MAT-002",
          name: "Matelas Orthopédique 160x200",
          qty: 1,
          unitPriceHT: 1200.00,
          tvaRate: 0.20,
          description: "Matelas à ressorts ensachés"
        }
      ],
      totals: {
        ht: 1200.00,
        tva: 240.00,
        ttc: 1440.00
      },
      payment: {
        method: "Chèque",
        paid: true,
        paidAmount: 1440.00,
        paidDate: new Date(Date.now() - 86400000).toISOString()
      },
      channels: {
        source: "Magasin",
        via: "Achat direct"
      },
      notes: "Client fidèle - livraison gratuite",
      idempotencyKey: "TEST-DETAILED-003"
    }
  ];

  // Injecter les factures
  let success = 0;
  detailedTestInvoices.forEach((invoice, index) => {
    if (window.externalInvoiceService.receiveInvoice(invoice)) {
      success++;
      console.log(`✅ Facture ${invoice.invoiceNumber} injectée`);
    } else {
      console.error(`❌ Échec injection ${invoice.invoiceNumber}`);
    }
  });

  console.log(`📊 ${success}/${detailedTestInvoices.length} factures injectées avec succès`);
  
  // Vérifier le résultat
  const newInvoices = window.externalInvoiceService.getAllInvoices();
  console.log('📋 Nouvelles factures:', newInvoices);
  
  return success;
}

// 3. Fonction de diagnostic détaillé
function fullDiagnostic() {
  console.log('\n🔍 DIAGNOSTIC COMPLET');
  console.log('=====================');
  
  if (window.externalInvoiceService) {
    const invoices = window.externalInvoiceService.getAllInvoices();
    const stats = window.externalInvoiceService.getStats();
    
    console.log(`📊 Total factures: ${invoices.length}`);
    console.log('📈 Statistiques:', stats);
    
    if (invoices.length > 0) {
      console.log('\n📋 STRUCTURE DES DONNÉES:');
      const sample = invoices[0];
      console.log('Structure de facture:', Object.keys(sample));
      console.log('Client:', sample.client);
      console.log('Items:', sample.items);
      console.log('Totaux:', sample.totals);
      console.log('Paiement:', sample.payment);
    }
  }
}

// Exposer les fonctions pour utilisation facile
window.injectDetailedTestData = injectDetailedTestData;
window.fullDiagnostic = fullDiagnostic;

console.log('\n🎯 FONCTIONS DISPONIBLES:');
console.log('- injectDetailedTestData() : Injecter des données de test détaillées');
console.log('- fullDiagnostic() : Diagnostic complet du système');
console.log('\n💡 Utilisez injectDetailedTestData() puis rechargez l\'onglet Factures');
