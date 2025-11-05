// 🧪 Script de test physique pour le système de factures compact
// Utilisation : Coller dans la console du navigateur pour tester

console.log('🧪 Démarrage des tests physiques - Système de factures compact');
console.log('=============================================================');

// 1. NETTOYAGE COMPLET
console.log('\n1️⃣ Nettoyage de l\'environnement...');
localStorage.clear();
if (window.externalInvoiceService) {
  window.externalInvoiceService.clearAll();
}
console.log('✅ Environment nettoyé');

// 2. DONNÉES DE TEST RÉALISTES
const testInvoicesRealistic = [
  {
    id: 'test_001',
    clientName: 'Restaurant Le Gourmet',
    amount: 2450.00,
    status: 'pending',
    date: new Date().toISOString(),
    description: 'Équipement cuisine professionnelle',
    isExternal: true,
    items: [
      { name: 'Four convection', quantity: 1, price: 1200.00 },
      { name: 'Friteuse industrielle', quantity: 1, price: 850.00 },
      { name: 'Installation', quantity: 1, price: 400.00 }
    ]
  },
  {
    id: 'test_002', 
    clientName: 'Hôtel des Alpes',
    amount: 3200.00,
    status: 'paid',
    date: new Date(Date.now() - 86400000).toISOString(), // Hier
    description: 'Rénovation chambre standard',
    isExternal: true,
    items: [
      { name: 'Matelas premium', quantity: 2, price: 800.00 },
      { name: 'Mobilier bois', quantity: 1, price: 1200.00 },
      { name: 'Décoration', quantity: 1, price: 1200.00 }
    ]
  },
  {
    id: 'test_003',
    clientName: 'Café du Centre',
    amount: 1150.00,
    status: 'overdue',
    date: new Date(Date.now() - 172800000).toISOString(), // Il y a 2 jours
    description: 'Machine à café professionnelle',
    isExternal: true,
    items: [
      { name: 'Machine expresso', quantity: 1, price: 950.00 },
      { name: 'Formation équipe', quantity: 1, price: 200.00 }
    ]
  },
  {
    id: 'test_004',
    clientName: 'Boutique Mode Élégante',
    amount: 890.00,
    status: 'pending',
    date: new Date().toISOString(),
    description: 'Aménagement vitrine',
    isExternal: true,
    items: [
      { name: 'Éclairage LED', quantity: 5, price: 120.00 },
      { name: 'Supports présentoir', quantity: 3, price: 90.00 },
      { name: 'Installation', quantity: 1, price: 290.00 }
    ]
  },
  {
    id: 'test_005',
    clientName: 'Entreprise TechnoSoft',
    amount: 4500.00,
    status: 'cancelled',
    date: new Date(Date.now() - 259200000).toISOString(), // Il y a 3 jours
    description: 'Équipement bureau moderne',
    isExternal: true,
    items: [
      { name: 'Postes de travail', quantity: 6, price: 600.00 },
      { name: 'Mobilier ergonomique', quantity: 1, price: 1200.00 },
      { name: 'Installation réseau', quantity: 1, price: 1000.00 }
    ]
  }
];

// 3. INJECTION DES DONNÉES DE TEST
console.log('\n2️⃣ Injection des données de test...');
let addedCount = 0;
testInvoicesRealistic.forEach(invoice => {
  if (window.externalInvoiceService) {
    window.externalInvoiceService.addInvoice(invoice);
    addedCount++;
  }
});
console.log(`✅ ${addedCount} factures de test ajoutées`);

// 4. VÉRIFICATION DES DONNÉES
console.log('\n3️⃣ Vérification des données...');
if (window.externalInvoiceService) {
  const invoices = window.externalInvoiceService.getInvoices();
  console.log(`📊 Total factures: ${invoices.length}`);
  
  const totalAmount = invoices.reduce((sum, inv) => sum + inv.amount, 0);
  console.log(`💰 Montant total: ${totalAmount.toFixed(2)}€`);
  
  const byStatus = invoices.reduce((acc, inv) => {
    acc[inv.status] = (acc[inv.status] || 0) + 1;
    return acc;
  }, {});
  console.log('📈 Répartition par statut:', byStatus);
}

// 5. FONCTIONS DE TEST INTERACTIVES
console.log('\n4️⃣ Fonctions de test disponibles:');
console.log('- testAddInvoice() : Ajouter une facture aléatoire');
console.log('- testUpdateStatus() : Changer le statut d\'une facture');
console.log('- testClearAll() : Vider toutes les factures');
console.log('- testStats() : Afficher les statistiques');

window.testAddInvoice = function() {
  const randomInvoice = {
    id: `test_${Date.now()}`,
    clientName: `Client Test ${Math.floor(Math.random() * 100)}`,
    amount: Math.floor(Math.random() * 5000) + 100,
    status: ['pending', 'paid', 'overdue'][Math.floor(Math.random() * 3)],
    date: new Date().toISOString(),
    description: 'Facture test générée automatiquement',
    isExternal: true,
    items: [{ name: 'Service test', quantity: 1, price: Math.floor(Math.random() * 1000) + 100 }]
  };
  
  window.externalInvoiceService.addInvoice(randomInvoice);
  console.log('✅ Facture test ajoutée:', randomInvoice.clientName);
};

window.testUpdateStatus = function() {
  const invoices = window.externalInvoiceService.getInvoices();
  if (invoices.length > 0) {
    const randomInvoice = invoices[Math.floor(Math.random() * invoices.length)];
    const newStatus = ['pending', 'paid', 'overdue'][Math.floor(Math.random() * 3)];
    // Note: Implémentation dépendante de votre service
    console.log(`🔄 Changement statut: ${randomInvoice.clientName} → ${newStatus}`);
  }
};

window.testClearAll = function() {
  window.externalInvoiceService.clearAll();
  console.log('🧹 Toutes les factures supprimées');
};

window.testStats = function() {
  const invoices = window.externalInvoiceService.getInvoices();
  console.log('\n📊 STATISTIQUES EN TEMPS RÉEL:');
  console.log(`Total factures: ${invoices.length}`);
  console.log(`Montant total: ${invoices.reduce((sum, inv) => sum + inv.amount, 0).toFixed(2)}€`);
  
  const stats = invoices.reduce((acc, inv) => {
    acc[inv.status] = (acc[inv.status] || 0) + 1;
    return acc;
  }, {});
  console.log('Par statut:', stats);
};

console.log('\n🎯 TESTS PRÊTS !');
console.log('Naviguez vers l\'onglet Factures pour voir le design compact en action.');
console.log('Utilisez les fonctions test* pour interagir avec les données.');
