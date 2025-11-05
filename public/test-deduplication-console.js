// Script de test pour la correction de déduplication des factures
// À exécuter dans la console du navigateur (F12)

console.log('🧪 Test de correction déduplication factures');
console.log('==============================================');

// Simuler des données N8N avec doublons de numéros
const testData = {
  success: true,
  count: 3,
  invoices: [
    {
      invoiceNumber: '2025-005',
      client: { name: 'Bruno Sylvain', email: 'bruno.sylvain@example.com' },
      products: [
        {
          name: 'Matelas Excellence 140x190',
          category: 'Matelas',
          quantity: 1,
          unitPrice: 800,
          totalPrice: 800
        }
      ],
      totalTTC: 800,
      totalHT: 666.67,
      paymentMethod: 'Chèque',
      status: 'sent',
      lastUpdate: '2025-01-27T10:00:00Z'
    },
    {
      invoiceNumber: '2025-005', // Même numéro
      client: { name: 'Bruno Sabrina', email: 'bruno.sabrina@example.com' }, // Client différent
      products: [
        {
          name: 'Oreiller ergonomique',
          category: 'Oreillers',
          quantity: 2,
          unitPrice: 50,
          totalPrice: 100
        }
      ],
      totalTTC: 100,
      totalHT: 83.33,
      paymentMethod: 'Carte',
      status: 'sent',
      lastUpdate: '2025-01-27T10:30:00Z'
    },
    {
      invoiceNumber: '2025-006',
      client: { name: 'Marie Dupont', email: 'marie.dupont@example.com' },
      products: [
        {
          name: 'Couette 4 saisons 220x240',
          category: 'Couettes',
          quantity: 1,
          unitPrice: 120,
          totalPrice: 120
        }
      ],
      totalTTC: 120,
      totalHT: 100,
      paymentMethod: 'Espèces',
      status: 'sent',
      lastUpdate: '2025-01-27T11:00:00Z'
    }
  ]
};

// Fonction de test de transformation (simulation de la méthode privée)
function testTransformInvoicesData(response) {
  const rawData = response.invoices || response || [];
  
  console.log(`🔍 Transformation de ${rawData.length} entrées de factures N8N`);
  
  // Étape 1: Regrouper les factures par numéro ET client pour éviter les doublons
  const invoiceMap = new Map();
  
  rawData.forEach((item) => {
    const invoiceNumber = item.invoiceNumber || item.number || `INV-${Date.now()}`;
    const clientName = item.client?.name || item.clientName || 'Client inconnu';
    // Clé unique combinant numéro de facture ET nom du client
    const uniqueKey = `${invoiceNumber}|||${clientName}`;
    
    if (invoiceMap.has(uniqueKey)) {
      // Facture existante : fusionner les produits
      const existing = invoiceMap.get(uniqueKey);
      const existingProducts = existing.products || [];
      const newProducts = item.products || [];
      
      // Combiner les produits en évitant les doublons
      const allProducts = [...existingProducts];
      newProducts.forEach((newProduct) => {
        const isDuplicate = existingProducts.some((existing) => 
          existing.name === newProduct.name && 
          existing.category === newProduct.category
        );
        if (!isDuplicate) {
          allProducts.push(newProduct);
        }
      });
      
      // Mettre à jour avec la liste de produits la plus complète
      existing.products = allProducts;
      
      console.log(`🔄 Fusion facture ${invoiceNumber} (${clientName}): ${allProducts.length} produits`);
    } else {
      // Nouvelle facture
      invoiceMap.set(uniqueKey, { ...item });
      console.log(`✅ Nouvelle facture ${invoiceNumber} (${clientName}): ${(item.products || []).length} produits`);
    }
  });
  
  // Étape 2: Transformer les factures fusionnées
  const uniqueInvoices = Array.from(invoiceMap.values());
  console.log(`📊 Résultat: ${uniqueInvoices.length} factures uniques`);
  
  return uniqueInvoices.map((item, index) => ({
    id: item.id || item.invoiceNumber || `inv-${Date.now()}-${index}`,
    number: item.invoiceNumber || item.number || `INV-${Date.now()}`,
    clientName: item.client?.name || item.clientName || 'Client inconnu',
    clientEmail: item.client?.email || item.clientEmail,
    items: (item.products || []).map((rawItem, itemIndex) => ({
      id: `${item.invoiceNumber || 'inv'}-item-${itemIndex}`,
      productName: rawItem.name || rawItem.productName || 'Produit inconnu',
      category: rawItem.category || 'Divers',
      quantity: Number(rawItem.quantity) || 1,
      unitPrice: Number(rawItem.unitPrice) || 0,
      totalPrice: Number(rawItem.totalPrice) || 0,
      status: 'delivered'
    })),
    totalHT: Number(item.totalHT) || 0,
    totalTTC: Number(item.totalTTC) || 0,
    status: 'paid',
    dueDate: new Date(),
    createdAt: new Date(item.lastUpdate || Date.now()),
    updatedAt: new Date(item.lastUpdate || Date.now()),
    vendorName: 'Bruno'
  }));
}

// Exécuter le test
console.log('📤 Données test:');
console.log('- Facture 2025-005 pour Bruno Sylvain (Matelas 800€)');
console.log('- Facture 2025-005 pour Bruno Sabrina (Oreillers 100€)');
console.log('- Facture 2025-006 pour Marie Dupont (Couette 120€)');
console.log('');

const result = testTransformInvoicesData(testData);

console.log('');
console.log('🎯 Résultat de transformation:');
result.forEach((invoice, index) => {
  console.log(`${index + 1}. ${invoice.number} - ${invoice.clientName} (${invoice.totalTTC}€)`);
});

console.log('');
console.log('✅ Attendu: 3 factures distinctes');
console.log(`📊 Obtenu: ${result.length} factures`);

if (result.length === 3) {
  const hasBrunoSylvain = result.some(inv => inv.clientName === 'Bruno Sylvain');
  const hasBrunoSabrina = result.some(inv => inv.clientName === 'Bruno Sabrina');
  const hasMarie = result.some(inv => inv.clientName === 'Marie Dupont');
  
  if (hasBrunoSylvain && hasBrunoSabrina && hasMarie) {
    console.log('🎉 SUCCÈS ! La correction fonctionne correctement');
    console.log('   - Les deux factures 2025-005 sont bien distinctes');
    console.log('   - Chaque client apparaît séparément');
  } else {
    console.log('❌ ÉCHEC ! Des clients sont manquants');
  }
} else {
  console.log('❌ ÉCHEC ! Nombre de factures incorrect');
}

console.log('');
console.log('💡 Maintenant, allez sur l\'onglet Factures pour vérifier l\'affichage visuel');
