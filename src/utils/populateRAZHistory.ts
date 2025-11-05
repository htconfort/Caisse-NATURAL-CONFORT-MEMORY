// Utilitaire pour peupler l'historique RAZ avec des données de test
// À utiliser uniquement pour démonstration
import { getDB, type RAZHistoryEntry } from '@/db/index';

export async function populateRAZHistoryWithTestData(): Promise<void> {
  console.log('🎯 Peuplement de l\'historique RAZ avec données de test...');
  
  const db = await getDB();
  
  // Données de test pour 5 RAZ différents
  const testEntries: Omit<RAZHistoryEntry, 'id'>[] = [
    // RAZ 1 - Foire de Lyon (la plus récente)
    {
      date: Date.now() - 2 * 24 * 60 * 60 * 1000, // Il y a 2 jours
      sessionName: 'Foire de Lyon 2025',
      sessionStart: Date.now() - 5 * 24 * 60 * 60 * 1000,
      sessionEnd: Date.now() - 2 * 24 * 60 * 60 * 1000,
      totalSales: 4250.00,
      totalCash: 1850.00,
      totalCard: 2100.00,
      totalChecks: 300.00,
      salesCount: 38,
      vendorStats: [
        { name: 'Marie Dubois', dailySales: 1850.00, totalSales: 5200.00 },
        { name: 'Sophie Martin', dailySales: 1450.00, totalSales: 3800.00 },
        { name: 'Amélie Bernard', dailySales: 950.00, totalSales: 2100.00 }
      ],
      emailContent: undefined,
      fullData: {
        sales: [],
        invoices: [],
        vendorStats: []
      }
    },
    
    // RAZ 2 - Salon Toulouse
    {
      date: Date.now() - 7 * 24 * 60 * 60 * 1000, // Il y a 7 jours
      sessionName: 'Salon Toulouse - Parc Expo',
      sessionStart: Date.now() - 10 * 24 * 60 * 60 * 1000,
      sessionEnd: Date.now() - 7 * 24 * 60 * 60 * 1000,
      totalSales: 5680.00,
      totalCash: 2340.00,
      totalCard: 2890.00,
      totalChecks: 450.00,
      salesCount: 52,
      vendorStats: [
        { name: 'Sophie Martin', dailySales: 2150.00, totalSales: 6800.00 },
        { name: 'Marie Dubois', dailySales: 1980.00, totalSales: 5500.00 },
        { name: 'Amélie Bernard', dailySales: 1100.00, totalSales: 2900.00 },
        { name: 'Julie Lefevre', dailySales: 450.00, totalSales: 1200.00 }
      ],
      emailContent: undefined,
      fullData: {
        sales: [],
        invoices: [],
        vendorStats: []
      }
    },
    
    // RAZ 3 - Marché Bordeaux
    {
      date: Date.now() - 14 * 24 * 60 * 60 * 1000, // Il y a 14 jours
      sessionName: 'Marché de Bordeaux',
      sessionStart: Date.now() - 15 * 24 * 60 * 60 * 1000,
      sessionEnd: Date.now() - 14 * 24 * 60 * 60 * 1000,
      totalSales: 2890.00,
      totalCash: 1230.00,
      totalCard: 1560.00,
      totalChecks: 100.00,
      salesCount: 24,
      vendorStats: [
        { name: 'Marie Dubois', dailySales: 1450.00, totalSales: 3200.00 },
        { name: 'Amélie Bernard', dailySales: 1440.00, totalSales: 2800.00 }
      ],
      emailContent: undefined,
      fullData: {
        sales: [],
        invoices: [],
        vendorStats: []
      }
    },
    
    // RAZ 4 - Foire Marseille
    {
      date: Date.now() - 21 * 24 * 60 * 60 * 1000, // Il y a 21 jours
      sessionName: 'Foire de Marseille - Palais',
      sessionStart: Date.now() - 24 * 24 * 60 * 60 * 1000,
      sessionEnd: Date.now() - 21 * 24 * 60 * 60 * 1000,
      totalSales: 6250.00,
      totalCash: 2780.00,
      totalCard: 3120.00,
      totalChecks: 350.00,
      salesCount: 67,
      vendorStats: [
        { name: 'Sophie Martin', dailySales: 2450.00, totalSales: 8900.00 },
        { name: 'Marie Dubois', dailySales: 2150.00, totalSales: 7200.00 },
        { name: 'Julie Lefevre', dailySales: 980.00, totalSales: 2500.00 },
        { name: 'Amélie Bernard', dailySales: 670.00, totalSales: 1800.00 }
      ],
      emailContent: undefined,
      fullData: {
        sales: [],
        invoices: [],
        vendorStats: []
      }
    },
    
    // RAZ 5 - Journée Nantes
    {
      date: Date.now() - 30 * 24 * 60 * 60 * 1000, // Il y a 30 jours
      sessionName: 'Journée du 19 septembre 2025',
      sessionStart: Date.now() - 30 * 24 * 60 * 60 * 1000,
      sessionEnd: Date.now() - 30 * 24 * 60 * 60 * 1000,
      totalSales: 1890.00,
      totalCash: 890.00,
      totalCard: 850.00,
      totalChecks: 150.00,
      salesCount: 15,
      vendorStats: [
        { name: 'Marie Dubois', dailySales: 1120.00, totalSales: 2500.00 },
        { name: 'Sophie Martin', dailySales: 770.00, totalSales: 1800.00 }
      ],
      emailContent: undefined,
      fullData: {
        sales: [],
        invoices: [],
        vendorStats: []
      }
    }
  ];

  // Insérer les données de test
  for (const entry of testEntries) {
    const fullEntry: RAZHistoryEntry = {
      ...entry,
      id: `raz_${entry.date}_${Math.random().toString(36).substr(2, 9)}`
    };
    
    try {
      await db.table('razHistory').add(fullEntry);
      console.log(`✅ RAZ test ajouté: ${fullEntry.sessionName}`);
    } catch (error) {
      console.warn(`⚠️ Erreur ajout RAZ test (peut-être déjà existant):`, error);
    }
  }
  
  console.log('🎉 Historique RAZ peuplé avec succès !');
  console.log(`📊 Total: ${testEntries.length} RAZ de test créés`);
  
  // Calculer les totaux
  const totalCA = testEntries.reduce((sum, e) => sum + e.totalSales, 0);
  const totalVentes = testEntries.reduce((sum, e) => sum + e.salesCount, 0);
  
  console.log(`💰 CA total archivé: ${totalCA.toFixed(2)}€`);
  console.log(`📈 Ventes totales: ${totalVentes}`);
}

export async function clearRAZHistory(): Promise<void> {
  console.log('🧹 Nettoyage de l\'historique RAZ...');
  const db = await getDB();
  await db.table('razHistory').clear();
  console.log('✅ Historique RAZ vidé');
}







