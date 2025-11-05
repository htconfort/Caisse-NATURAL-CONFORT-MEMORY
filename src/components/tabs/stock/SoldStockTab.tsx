import React, { useState, useEffect } from 'react';
import { TrendingUp, Package, Calendar, ChevronDown, ChevronRight, Download } from 'lucide-react';
import { getDB } from '@/db/index';
import { useSupabaseInvoices } from '@/hooks/useSupabaseInvoices';
import { getCurrentSession } from '@/services/sessionService';
import type { Sale, SessionDB } from '@/types';
import { productCatalog } from '@/data';

interface ProductStat {
  productName: string;
  category: string;
  quantity: number;
}

interface CategoryGroup {
  category: string;
  products: ProductStat[];
  totalQuantity: number;
}

export const SoldStockTab: React.FC = () => {
  const [localSales, setLocalSales] = useState<Sale[]>([]);
  const [currentSession, setCurrentSession] = useState<SessionDB | null>(null);
  const { invoices: supabaseInvoices } = useSupabaseInvoices();
  const [expandedCategoriesDay, setExpandedCategoriesDay] = useState<Set<string>>(new Set());
  const [expandedCategoriesSession, setExpandedCategoriesSession] = useState<Set<string>>(new Set());

  // Créer un Map pour retrouver la catégorie officielle d'un produit
  const productCategoryMap = new Map(
    productCatalog.map(product => [product.name, product.category])
  );

  // Fonction pour obtenir la VRAIE catégorie d'un produit depuis le catalogue
  const getRealCategory = (productName: string): string => {
    // Chercher dans le catalogue
    const catalogCategory = productCategoryMap.get(productName);
    if (catalogCategory) {
      return catalogCategory;
    }
    
    // Si pas trouvé, essayer de deviner depuis le nom
    const nameLower = productName.toLowerCase();
    if (nameLower.includes('protège')) return 'Protège-matelas'; // Catégorie dédiée
    if (nameLower.includes('matelas') && !nameLower.includes('sur')) return 'Matelas';
    if (nameLower.includes('surmatelas') || nameLower.includes('sur-matelas')) return 'Sur-matelas';
    if (nameLower.includes('oreiller') || nameLower.includes('traversin')) return 'Oreillers';
    if (nameLower.includes('couette')) return 'Couettes';
    if (nameLower.includes('plateau') && nameLower.includes('fraîche')) return 'Plateau Fraîche';
    if (nameLower.includes('plateau')) return 'Plateau';
    if (nameLower.includes('taie') || nameLower.includes('régule') || nameLower.includes('pack')) return 'Accessoires';
    
    // Sinon, ignorer complètement (ne pas afficher Test, Divers, etc.)
    return 'IGNORE';
  };

  // Charger les données
  useEffect(() => {
    loadData();
  }, [supabaseInvoices]); // 🔧 Recharger quand factures Supabase changent

  const loadData = async () => {
    try {
      const db = await getDB();
      
      // Charger session
      const session = await getCurrentSession();
      setCurrentSession(session || null);
      
      // Charger ventes locales
      const salesData = await db.table('sales').toArray();
      setLocalSales(salesData);
      
      const razTimestamp = localStorage.getItem('lastRAZTimestamp');
      
      console.log('📊 Stock Vendu - Données chargées:', {
        session: session?.eventName,
        eventStart: session?.eventStart ? new Date(session.eventStart).toLocaleString('fr-FR') : 'non défini',
        eventEnd: session?.eventEnd ? new Date(session.eventEnd).toLocaleString('fr-FR') : 'non défini',
        openedAt: session?.openedAt ? new Date(session.openedAt).toLocaleString('fr-FR') : 'non défini',
        sales: salesData.length,
        supabaseInvoices: supabaseInvoices.length,
        supabaseAnnulees: supabaseInvoices.filter(inv => inv.status === 'canceled' || inv.canceled === true).length,
        razTime: razTimestamp ? new Date(parseInt(razTimestamp)).toLocaleString('fr-FR') : 'pas de RAZ'
      });
    } catch (error) {
      console.error('❌ Erreur chargement données Stock Vendu:', error);
    }
  };

  // Calculer les ventes PAR PRODUIT DÉTAILLÉ pour le JOUR
  const calculateDaySalesByProduct = (): CategoryGroup[] => {
    const productMap = new Map<string, ProductStat>();
    
    // 🔧 FIX: Utiliser date du jour (minuit) au lieu de razTime
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStart = today.getTime();

    // Filtrer ventes du jour (depuis minuit aujourd'hui)
    const todaySales = localSales.filter(sale => {
      // 🔧 Exclure ancien personnel (Billy, Johan)
      const excludedVendors = ['Billy', 'Johan', 'billy', 'johan'];
      if (excludedVendors.includes(sale.vendorName)) return false;
      
      const saleTime = new Date(sale.date).getTime();
      return saleTime >= todayStart;
    });

    // Compter PAR PRODUIT (ventes locales)
    todaySales.forEach(sale => {
      sale.items.forEach(item => {
        const productName = item.name;
        const category = getRealCategory(productName);
        
        // Ignorer produits Test, Divers sans correspondance
        if (category === 'IGNORE') {
          console.log('⚠️ Produit ignoré (pas dans catalogue):', productName);
          return;
        }
        
        const key = `${category}::${productName}`;
        
        const existing = productMap.get(key) || {
          productName,
          category,
          quantity: 0
        };
        existing.quantity += item.quantity;
        productMap.set(key, existing);
      });
    });

    // Ajouter factures Supabase du jour (depuis minuit aujourd'hui)
    const todayInvoices = supabaseInvoices.filter(inv => {
      const invTime = new Date(inv.created_at).getTime();
      return invTime >= todayStart;
    });
    
    console.log('📅 Ventes du JOUR - FILTRAGE:', {
      totalSales: localSales.length,
      todaySales: todaySales.length,
      totalInvoices: supabaseInvoices.length,
      todayInvoices: todayInvoices.length,
      todayStart: new Date(todayStart).toLocaleString('fr-FR'),
      todaySalesItems: todaySales.reduce((sum, s) => sum + s.items.length, 0),
      todayInvoicesProduits: todayInvoices.reduce((sum, inv) => sum + (Array.isArray(inv.produits) ? inv.produits.length : 0), 0)
    });
    
    console.log('📦 Sample vente locale:', todaySales[0]);
    console.log('📦 Sample facture Supabase:', todayInvoices[0]);

    todayInvoices.forEach(invoice => {
      if (invoice.produits && Array.isArray(invoice.produits)) {
        invoice.produits.forEach((item: any) => {
          const productName = item.nom || item.name || 'Produit inconnu';
          const category = getRealCategory(productName);
          
          // Ignorer produits Test, Divers sans correspondance
          if (category === 'IGNORE') {
            console.log('⚠️ Produit ignoré (pas dans catalogue):', productName);
            return;
          }
          
          const qty = item.quantite || item.quantity || 1;
          const key = `${category}::${productName}`;
          
          const existing = productMap.get(key) || {
            productName,
            category,
            quantity: 0
          };
          existing.quantity += qty;
          productMap.set(key, existing);
        });
      }
    });

    // Grouper par catégorie
    return groupByCategory(productMap);
  };

  // Calculer les ventes PAR PRODUIT DÉTAILLÉ pour la SESSION
  const calculateSessionSalesByProduct = (): CategoryGroup[] => {
    const productMap = new Map<string, ProductStat>();
    let ignoredCount = 0; // Compteur produits ignorés

    // 🔧 FIX CRITIQUE: Utiliser eventStart/eventEnd au lieu de openedAt
    const sessionStart = currentSession?.eventStart || 0;
    const sessionEnd = currentSession?.eventEnd || Date.now();
    
    console.log('📅 Stock Vendu Session - Période:', {
      start: sessionStart ? new Date(sessionStart).toLocaleString('fr-FR') : 'Début',
      end: sessionEnd ? new Date(sessionEnd).toLocaleString('fr-FR') : 'Maintenant'
    });

    // Compter les produits des ventes locales (dans la période de session)
    const sessionSales = localSales.filter(sale => {
      // 🔧 Exclure ancien personnel (Billy, Johan)
      const excludedVendors = ['Billy', 'Johan', 'billy', 'johan'];
      if (excludedVendors.includes(sale.vendorName)) return false;
      
      const saleTime = new Date(sale.date).getTime();
      return saleTime >= sessionStart && saleTime <= sessionEnd;
    });

    sessionSales.forEach(sale => {
      sale.items.forEach(item => {
        const productName = item.name;
        const category = getRealCategory(productName);
        
        // Ignorer produits Test, Divers sans correspondance
        if (category === 'IGNORE') {
          ignoredCount++;
          console.log('⚠️ Produit SESSION ignoré (pas dans catalogue):', productName);
          return;
        }
        
        const key = `${category}::${productName}`;
        
        const existing = productMap.get(key) || {
          productName,
          category,
          quantity: 0
        };
        existing.quantity += item.quantity;
        productMap.set(key, existing);
      });
    });

    // Ajouter UNIQUEMENT les factures Supabase de la SESSION ACTUELLE (non annulées)
    const sessionInvoices = supabaseInvoices.filter(invoice => {
      // 🔧 EXCLURE factures annulées
      if (invoice.status === 'canceled' || invoice.canceled === true) {
        return false;
      }
      
      // Filtrer par dates de session
      const invoiceTime = new Date(invoice.created_at).getTime();
      const isInSession = invoiceTime >= sessionStart && invoiceTime <= sessionEnd;
      
      // Debug pour factures hors session
      if (!isInSession) {
        console.log('📅 Facture hors session:', {
          numero: invoice.numero_facture,
          created_at: new Date(invoice.created_at).toLocaleString('fr-FR'),
          invoiceTime,
          sessionStart: new Date(sessionStart).toLocaleString('fr-FR'),
          sessionEnd: new Date(sessionEnd).toLocaleString('fr-FR'),
          isBefore: invoiceTime < sessionStart,
          isAfter: invoiceTime > sessionEnd
        });
      }
      
      return isInSession;
    });

    console.log('📊 Ventes de la SESSION:', {
      totalSales: localSales.length,
      sessionSales: sessionSales.length,
      totalInvoices: supabaseInvoices.length,
      totalInvoicesNonAnnulees: supabaseInvoices.filter(inv => inv.status !== 'canceled' && inv.canceled !== true).length,
      sessionInvoices: sessionInvoices.length,
      sessionStart: sessionStart ? new Date(sessionStart).toLocaleString('fr-FR') : 'non défini',
      sessionEnd: sessionEnd ? new Date(sessionEnd).toLocaleString('fr-FR') : 'non défini',
      produitsVentesLocales: sessionSales.reduce((sum, sale) => sum + sale.items.length, 0),
      produitsFacturesSupabase: sessionInvoices.reduce((sum, inv) => sum + (Array.isArray(inv.produits) ? inv.produits.length : 0), 0)
    });

    console.log('🔍 ANALYSE FACTURES SESSION - DÉTAIL COMPLET:');
    sessionInvoices.forEach((invoice, idx) => {
      console.log(`\n📄 Facture ${idx + 1}/${sessionInvoices.length}: ${invoice.numero_facture} (${invoice.conseiller || 'Non défini'})`);
      console.log('   Date:', new Date(invoice.created_at).toLocaleString('fr-FR'));
      console.log('   Produits bruts:', invoice.produits);
      console.log('   Type:', typeof invoice.produits, '| Array?', Array.isArray(invoice.produits));
      
      if (invoice.produits && Array.isArray(invoice.produits)) {
        console.log(`   ${invoice.produits.length} produit(s) dans cette facture:`);
        
        invoice.produits.forEach((item: any, itemIdx) => {
          const productName = item.nom || item.name || 'Produit inconnu';
          const category = getRealCategory(productName);
          const qty = item.quantite || item.quantity || 1;
          
          console.log(`   ${itemIdx + 1}. "${productName}" → Catégorie: ${category} | Qté: ${qty}`);
          
          // Ignorer produits Test, Divers sans correspondance
          if (category === 'IGNORE') {
            ignoredCount++;
            console.log(`      ❌ IGNORÉ (pas dans catalogue)`);
            return;
          }
          
          const key = `${category}::${productName}`;
          
          const existing = productMap.get(key) || {
            productName,
            category,
            quantity: 0
          };
          existing.quantity += qty;
          productMap.set(key, existing);
          
          console.log(`      ✅ AJOUTÉ au productMap`);
        });
      } else {
        console.log('   ⚠️ Pas de produits ou format incorrect');
      }
    });
    
    console.log(`⚠️ Total produits SESSION ignorés (catégorie IGNORE): ${ignoredCount}`);

    // Grouper par catégorie
    return groupByCategory(productMap);
  };

  // Fonction helper pour grouper par catégorie
  const groupByCategory = (productMap: Map<string, ProductStat>): CategoryGroup[] => {
    const categoryGroups = new Map<string, CategoryGroup>();
    
    productMap.forEach(product => {
      if (!categoryGroups.has(product.category)) {
        categoryGroups.set(product.category, {
          category: product.category,
          products: [],
          totalQuantity: 0
        });
      }
      const group = categoryGroups.get(product.category)!;
      group.products.push(product);
      group.totalQuantity += product.quantity;
    });

    // Convertir en tableau, trier produits par quantité dans chaque groupe
    const result = Array.from(categoryGroups.values());
    result.forEach(group => {
      group.products.sort((a, b) => b.quantity - a.quantity);
    });
    
    // Trier les catégories par quantité totale
    return result.sort((a, b) => b.totalQuantity - a.totalQuantity);
  };

  const daySales = calculateDaySalesByProduct();
  const sessionSales = calculateSessionSalesByProduct();

  const totalDayQty = daySales.reduce((sum, cat) => sum + cat.totalQuantity, 0);
  const totalSessionQty = sessionSales.reduce((sum, cat) => sum + cat.totalQuantity, 0);

  // Fonction d'export Markdown (format lisible)
  const exportStockVenduCSV = () => {
    try {
      let content = '';
      
      // Header
      content += '# 📊 STOCK VENDU - Détail par Produit\n\n';
      content += `**Session:** ${currentSession?.eventName || 'Session en cours'}\n`;
      if (currentSession?.eventStart && currentSession?.eventEnd && 
          !isNaN(Number(currentSession.eventStart)) && !isNaN(Number(currentSession.eventEnd))) {
        content += `**Période:** du ${new Date(currentSession.eventStart).toLocaleDateString('fr-FR')} au ${new Date(currentSession.eventEnd).toLocaleDateString('fr-FR')}\n`;
      }
      content += `**Export le:** ${new Date().toLocaleString('fr-FR')}\n\n`;
      content += '---\n\n';
      
      // === VENTES DU JOUR ===
      content += '## 📅 VENTES DU JOUR (depuis dernière RAZ)\n\n';
      content += `**Total: ${totalDayQty} produits vendus**\n\n`;
      
      daySales.forEach(categoryGroup => {
        content += `### 📦 ${categoryGroup.category} (${categoryGroup.totalQuantity} produits)\n\n`;
        content += '| Produit | Quantité |\n';
        content += '|---------|----------|\n';
        categoryGroup.products.forEach(product => {
          content += `| ${product.productName} | **${product.quantity}** |\n`;
        });
        content += `| **TOTAL ${categoryGroup.category}** | **${categoryGroup.totalQuantity}** |\n\n`;
      });
      
      content += '---\n\n';
      
      // === VENTES DE LA SESSION ===
      content += '## 📈 VENTES DE LA SESSION (complète)\n\n';
      content += `**Total: ${totalSessionQty} produits vendus**\n\n`;
      
      sessionSales.forEach(categoryGroup => {
        content += `### 📦 ${categoryGroup.category} (${categoryGroup.totalQuantity} produits)\n\n`;
        content += '| Produit | Quantité |\n';
        content += '|---------|----------|\n';
        categoryGroup.products.forEach(product => {
          content += `| ${product.productName} | **${product.quantity}** |\n`;
        });
        content += `| **TOTAL ${categoryGroup.category}** | **${categoryGroup.totalQuantity}** |\n\n`;
      });
      
      // Créer et télécharger le fichier
      const blob = new Blob([content], { type: 'text/markdown;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      const filename = `stock-vendu-${(currentSession?.eventName || 'session').replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.md`;
      link.setAttribute('download', filename);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      console.log('✅ Export Markdown Stock Vendu réussi:', filename);
    } catch (error) {
      console.error('❌ Erreur export:', error);
      alert('Erreur lors de l\'export');
    }
  };

  const toggleCategoryDay = (category: string) => {
    setExpandedCategoriesDay(prev => {
      const newSet = new Set(prev);
      if (newSet.has(category)) {
        newSet.delete(category);
      } else {
        newSet.add(category);
      }
      return newSet;
    });
  };

  const toggleCategorySession = (category: string) => {
    setExpandedCategoriesSession(prev => {
      const newSet = new Set(prev);
      if (newSet.has(category)) {
        newSet.delete(category);
      } else {
        newSet.add(category);
      }
      return newSet;
    });
  };

  return (
    <div className="animate-fadeIn">
      {/* 🔍 Panneau de DEBUG visible */}
      <div style={{ 
        padding: '16px', 
        background: '#EFF6FF', 
        borderRadius: '8px',
        border: '2px solid #3B82F6',
        marginBottom: '16px',
        fontSize: '13px'
      }}>
        <h4 style={{ color: '#1E40AF', marginBottom: '8px', fontSize: '14px', fontWeight: 'bold' }}>
          🔍 DEBUG Stock Vendu
        </h4>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', color: '#1E3A8A' }}>
          <div><strong>Ventes locales:</strong> {localSales.length}</div>
          <div><strong>Factures Supabase:</strong> {supabaseInvoices.length}</div>
          <div><strong>Factures annulées:</strong> {supabaseInvoices.filter(inv => inv.status === 'canceled' || inv.canceled === true).length}</div>
          <div><strong>Produits jour:</strong> {totalDayQty}</div>
          <div><strong>Produits session:</strong> {totalSessionQty}</div>
          <div><strong>Session:</strong> {currentSession?.eventName || 'Aucune'}</div>
          <div style={{ gridColumn: '1 / -1' }}><strong>Période session:</strong> {currentSession?.eventStart && currentSession?.eventEnd ? `${new Date(currentSession.eventStart).toLocaleDateString('fr-FR')} - ${new Date(currentSession.eventEnd).toLocaleDateString('fr-FR')}` : 'Non définie'}</div>
          <div style={{ gridColumn: '1 / -1' }}><strong>RAZ:</strong> {localStorage.getItem('lastRAZTimestamp') ? new Date(parseInt(localStorage.getItem('lastRAZTimestamp')!)).toLocaleString('fr-FR') : 'Aucune'}</div>
          <div style={{ gridColumn: '1 / -1', marginTop: '8px' }}>
            <strong>Factures Supabase (non annulées) dans session:</strong> {(() => {
              const sessionStart = currentSession?.eventStart || 0;
              const sessionEnd = currentSession?.eventEnd || Date.now();
              return supabaseInvoices.filter(inv => {
                if (inv.status === 'canceled' || inv.canceled === true) return false;
                const t = new Date(inv.created_at).getTime();
                return t >= sessionStart && t <= sessionEnd;
              }).length;
            })()} / {supabaseInvoices.filter(inv => inv.status !== 'canceled' && inv.canceled !== true).length} (total non annulées)
          </div>
        </div>
        
        {/* 🔍 ANALYSE DÉTAILLÉE DES PRODUITS SUPABASE */}
        <details style={{ marginTop: '12px' }}>
          <summary style={{ cursor: 'pointer', fontWeight: 'bold', color: '#DC2626', fontSize: '14px' }}>
            🔍 DÉTAIL PRODUITS des factures Supabase de la session ({(() => {
              const sessionStart = currentSession?.eventStart || 0;
              const sessionEnd = currentSession?.eventEnd || Date.now();
              return supabaseInvoices.filter(inv => {
                if (inv.status === 'canceled' || inv.canceled === true) return false;
                const t = new Date(inv.created_at).getTime();
                return t >= sessionStart && t <= sessionEnd;
              }).length;
            })()})
          </summary>
          <div style={{ marginTop: '8px', maxHeight: '400px', overflowY: 'auto', fontSize: '11px', background: '#FEF2F2', padding: '12px', borderRadius: '6px' }}>
            {(() => {
              const sessionStart = currentSession?.eventStart || 0;
              const sessionEnd = currentSession?.eventEnd || Date.now();
              const sessionInvs = supabaseInvoices.filter(inv => {
                if (inv.status === 'canceled' || inv.canceled === true) return false;
                const t = new Date(inv.created_at).getTime();
                return t >= sessionStart && t <= sessionEnd;
              });
              
              if (sessionInvs.length === 0) {
                return <div style={{ color: '#6B7280' }}>Aucune facture Supabase dans la session</div>;
              }
              
              return sessionInvs.map((inv, idx) => (
                <div key={idx} style={{ marginBottom: '16px', padding: '8px', background: 'white', borderRadius: '4px', border: '1px solid #FECACA' }}>
                  <div style={{ fontWeight: 'bold', color: '#991B1B', marginBottom: '4px' }}>
                    📄 Facture {inv.numero_facture} - {inv.conseiller || 'Non défini'} - {new Date(inv.created_at).toLocaleString('fr-FR')}
                  </div>
                  <div style={{ color: '#6B7280', fontSize: '10px' }}>
                    <strong>Produits bruts:</strong> {JSON.stringify(inv.produits)}
                  </div>
                  <div style={{ marginTop: '4px' }}>
                    <strong>Type:</strong> {typeof inv.produits} | <strong>Array?</strong> {Array.isArray(inv.produits) ? 'OUI ✅' : 'NON ❌'}
                  </div>
                  {inv.produits && Array.isArray(inv.produits) && inv.produits.length > 0 ? (
                    <div style={{ marginTop: '6px' }}>
                      <strong>{inv.produits.length} produit(s):</strong>
                      <ul style={{ marginTop: '4px', paddingLeft: '20px' }}>
                        {inv.produits.map((item: any, itemIdx: number) => {
                          const productName = item.nom || item.name || 'Produit inconnu';
                          const category = getRealCategory(productName);
                          const qty = item.quantite || item.quantity || 1;
                          return (
                            <li key={itemIdx} style={{ marginTop: '2px', color: category === 'IGNORE' ? '#DC2626' : '#059669' }}>
                              "{productName}" → <strong>{category}</strong> | Qté: {qty} {category === 'IGNORE' ? '❌ IGNORÉ' : '✅ AJOUTÉ'}
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  ) : (
                    <div style={{ marginTop: '6px', color: '#DC2626', fontWeight: 'bold' }}>
                      ⚠️ Aucun produit ou format incorrect !
                    </div>
                  )}
                </div>
              ));
            })()}
          </div>
        </details>
        
        {/* 📋 Liste détaillée des ventes de la session */}
        <details style={{ marginTop: '12px' }}>
          <summary style={{ cursor: 'pointer', fontWeight: 'bold', color: '#1E40AF', fontSize: '14px' }}>
            📋 Voir la liste complète des ventes/factures de la session ({(() => {
              const sessionStart = currentSession?.eventStart || 0;
              const sessionEnd = currentSession?.eventEnd || Date.now();
              const excludedVendors = ['Billy', 'Johan', 'billy', 'johan'];
              const sessionSalesCount = localSales.filter(s => {
                if (excludedVendors.includes(s.vendorName)) return false;
                const t = new Date(s.date).getTime();
                return t >= sessionStart && t <= sessionEnd;
              }).length;
              const sessionInvoicesCount = supabaseInvoices.filter(inv => {
                const t = new Date(inv.created_at).getTime();
                return t >= sessionStart && t <= sessionEnd && inv.status !== 'canceled';
              }).length;
              return sessionSalesCount + sessionInvoicesCount;
            })()})
          </summary>
          <div style={{ marginTop: '8px', maxHeight: '300px', overflowY: 'auto', fontSize: '12px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead style={{ position: 'sticky', top: 0, background: '#EFF6FF' }}>
                <tr>
                  <th style={{ padding: '6px', textAlign: 'left', borderBottom: '2px solid #3B82F6' }}>Date/Heure</th>
                  <th style={{ padding: '6px', textAlign: 'left', borderBottom: '2px solid #3B82F6' }}>Vendeuse</th>
                  <th style={{ padding: '6px', textAlign: 'center', borderBottom: '2px solid #3B82F6' }}>Articles</th>
                  <th style={{ padding: '6px', textAlign: 'right', borderBottom: '2px solid #3B82F6' }}>Montant</th>
                  <th style={{ padding: '6px', textAlign: 'center', borderBottom: '2px solid #3B82F6' }}>Source</th>
                </tr>
              </thead>
              <tbody>
                {(() => {
                  const sessionStart = currentSession?.eventStart || 0;
                  const sessionEnd = currentSession?.eventEnd || Date.now();
                  
                  // Ventes locales de la session (exclure Billy, Johan)
                  const excludedVendors = ['Billy', 'Johan', 'billy', 'johan'];
                  const sessionLocalSales = localSales
                    .filter(s => {
                      // Exclure ancien personnel
                      if (excludedVendors.includes(s.vendorName)) return false;
                      
                      const t = new Date(s.date).getTime();
                      return t >= sessionStart && t <= sessionEnd;
                    })
                    .map(sale => ({
                      date: new Date(sale.date),
                      vendor: sale.vendorName,
                      items: sale.items.length,
                      amount: sale.totalAmount,
                      source: 'Caisse'
                    }));
                  
                  // Factures Supabase de la session
                  const sessionSupabaseInvoices = supabaseInvoices
                    .filter(inv => {
                      const t = new Date(inv.created_at).getTime();
                      return t >= sessionStart && t <= sessionEnd && inv.status !== 'canceled';
                    })
                    .map(inv => ({
                      date: new Date(inv.created_at),
                      vendor: inv.conseiller || 'Non défini',
                      items: Array.isArray(inv.produits) ? inv.produits.length : 0,
                      amount: inv.montant_ttc,
                      source: 'App Facturation',
                      numero: inv.numero_facture
                    }));
                  
                  // Fusionner et trier par date décroissante
                  const allTransactions = [...sessionLocalSales, ...sessionSupabaseInvoices]
                    .sort((a, b) => b.date.getTime() - a.date.getTime());
                  
                  if (allTransactions.length === 0) {
                    return (
                      <tr>
                        <td colSpan={5} style={{ padding: '20px', textAlign: 'center', color: '#6B7280' }}>
                          Aucune vente dans la période de session
                        </td>
                      </tr>
                    );
                  }
                  
                  return allTransactions.map((t, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid #E5E7EB' }}>
                      <td style={{ padding: '6px' }}>{t.date.toLocaleString('fr-FR')}</td>
                      <td style={{ padding: '6px' }}>{t.vendor}</td>
                      <td style={{ padding: '6px', textAlign: 'center' }}>{t.items}</td>
                      <td style={{ padding: '6px', textAlign: 'right', fontWeight: 'bold' }}>{Math.round(t.amount)} €</td>
                      <td style={{ padding: '6px', textAlign: 'center' }}>
                        <span style={{ 
                          padding: '2px 8px', 
                          borderRadius: '4px', 
                          fontSize: '11px',
                          background: t.source === 'Caisse' ? '#D1FAE5' : '#DBEAFE',
                          color: t.source === 'Caisse' ? '#065F46' : '#1E40AF'
                        }}>
                          {t.source}
                        </span>
                      </td>
                    </tr>
                  ));
                })()}
              </tbody>
            </table>
          </div>
        </details>
      </div>
      
      {/* Header */}
      <div className="card mb-6" style={{ backgroundColor: '#FFF3E0', borderLeft: '4px solid #F55D3E' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <TrendingUp size={28} style={{ color: '#F55D3E' }} />
            <div>
              <h2 className="text-2xl font-bold" style={{ color: '#333' }}>
                📊 Stock Vendu - Détail par Produit
              </h2>
              <p className="text-sm" style={{ color: '#666' }}>
                Analyse détaillée des ventes (produits, tailles, modèles)
              </p>
            </div>
          </div>
          <button
            onClick={exportStockVenduCSV}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '12px 20px',
              backgroundColor: '#477A0C',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: 'bold',
              fontSize: '14px',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#5a9610'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#477A0C'}
          >
            <Download size={18} />
            📥 Export CSV
          </button>
        </div>
      </div>

      {/* Ventes du Jour */}
      <div className="card mb-6">
        <h3 className="text-xl font-bold mb-4" style={{ 
          color: '#333',
          borderBottom: '3px solid #F55D3E',
          paddingBottom: '12px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          <Calendar size={24} style={{ color: '#F55D3E' }} />
          📅 Ventes du Jour
          <span style={{ fontSize: '14px', fontWeight: 'normal', color: '#666' }}>
            (depuis dernière RAZ)
          </span>
          <span style={{ 
            marginLeft: 'auto', 
            fontSize: '16px', 
            fontWeight: 'bold',
            color: '#F55D3E' 
          }}>
            Total: {totalDayQty} produits
          </span>
        </h3>

        {daySales.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
            Aucun produit vendu aujourd'hui
          </div>
        ) : (
          <div>
            {daySales.map((categoryGroup) => {
              const isExpanded = expandedCategoriesDay.has(categoryGroup.category);
              return (
                <div key={categoryGroup.category} style={{ marginBottom: '12px' }}>
                  {/* En-tête catégorie cliquable */}
                  <button
                    onClick={() => toggleCategoryDay(categoryGroup.category)}
                    style={{
                      width: '100%',
                      padding: '14px 18px',
                      backgroundColor: isExpanded ? '#F55D3E' : '#fff3e0',
                      color: isExpanded ? 'white' : '#333',
                      border: `2px solid #F55D3E`,
                      borderRadius: '8px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      fontWeight: 'bold',
                      fontSize: '16px',
                      transition: 'all 0.2s'
                    }}
                  >
                    <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {isExpanded ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                      📦 {categoryGroup.category}
                    </span>
                    <span>{categoryGroup.totalQuantity} produits ({((categoryGroup.totalQuantity / totalDayQty) * 100).toFixed(1)}%)</span>
                  </button>

                  {/* Liste des produits (affichée si déplié) */}
                  {isExpanded && (
                    <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '8px', marginBottom: '8px' }}>
                      <thead>
                        <tr style={{ backgroundColor: '#fff8f0', borderBottom: '2px solid #F55D3E' }}>
                          <th style={{ padding: '10px', textAlign: 'left', fontWeight: 'bold', color: '#333', fontSize: '14px' }}>
                            Produit (taille, modèle)
                          </th>
                          <th style={{ padding: '10px', textAlign: 'right', fontWeight: 'bold', color: '#333', fontSize: '14px' }}>
                            Quantité
                          </th>
                          <th style={{ padding: '10px', textAlign: 'right', fontWeight: 'bold', color: '#333', fontSize: '14px' }}>
                            % catégorie
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {categoryGroup.products.map((product, index) => (
                          <tr key={product.productName} style={{ 
                            borderBottom: '1px solid #f0f0f0',
                            backgroundColor: index % 2 === 0 ? 'white' : '#fafafa'
                          }}>
                            <td style={{ padding: '10px', color: '#333', fontSize: '14px' }}>
                              {product.productName}
                            </td>
                            <td style={{ padding: '10px', textAlign: 'right', fontWeight: 'bold', color: '#F55D3E', fontSize: '15px' }}>
                              {product.quantity}
                            </td>
                            <td style={{ padding: '10px', textAlign: 'right', color: '#666', fontSize: '13px' }}>
                              {((product.quantity / categoryGroup.totalQuantity) * 100).toFixed(1)}%
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Ventes de la Session */}
      <div className="card">
        <h3 className="text-xl font-bold mb-4" style={{ 
          color: '#333',
          borderBottom: '3px solid #477A0C',
          paddingBottom: '12px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          <Package size={24} style={{ color: '#477A0C' }} />
          📈 Ventes de la Session
          <span style={{ fontSize: '14px', fontWeight: 'normal', color: '#666' }}>
            ({currentSession?.eventName || 'Session en cours'})
          </span>
          {currentSession?.eventStart && currentSession?.eventEnd && 
           !isNaN(Number(currentSession.eventStart)) && !isNaN(Number(currentSession.eventEnd)) && (
            <span style={{ fontSize: '13px', fontWeight: 'normal', color: '#666' }}>
              du {new Date(currentSession.eventStart).toLocaleDateString('fr-FR')} au {new Date(currentSession.eventEnd).toLocaleDateString('fr-FR')}
            </span>
          )}
          <span style={{ 
            marginLeft: 'auto', 
            fontSize: '16px', 
            fontWeight: 'bold',
            color: '#477A0C' 
          }}>
            Total: {totalSessionQty} produits
          </span>
        </h3>

        {sessionSales.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
            Aucun produit vendu dans cette session
          </div>
        ) : (
          <div>
            {sessionSales.map((categoryGroup) => {
              const isExpanded = expandedCategoriesSession.has(categoryGroup.category);
              return (
                <div key={categoryGroup.category} style={{ marginBottom: '12px' }}>
                  {/* En-tête catégorie cliquable */}
                  <button
                    onClick={() => toggleCategorySession(categoryGroup.category)}
                    style={{
                      width: '100%',
                      padding: '14px 18px',
                      backgroundColor: isExpanded ? '#477A0C' : '#f0f8f0',
                      color: isExpanded ? 'white' : '#333',
                      border: `2px solid #477A0C`,
                      borderRadius: '8px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      fontWeight: 'bold',
                      fontSize: '16px',
                      transition: 'all 0.2s'
                    }}
                  >
                    <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {isExpanded ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                      📦 {categoryGroup.category}
                    </span>
                    <span>{categoryGroup.totalQuantity} produits ({((categoryGroup.totalQuantity / totalSessionQty) * 100).toFixed(1)}%)</span>
                  </button>

                  {/* Liste des produits (affichée si déplié) */}
                  {isExpanded && (
                    <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '8px', marginBottom: '8px' }}>
                      <thead>
                        <tr style={{ backgroundColor: '#f8fff0', borderBottom: '2px solid #477A0C' }}>
                          <th style={{ padding: '10px', textAlign: 'left', fontWeight: 'bold', color: '#333', fontSize: '14px' }}>
                            Produit (taille, modèle)
                          </th>
                          <th style={{ padding: '10px', textAlign: 'right', fontWeight: 'bold', color: '#333', fontSize: '14px' }}>
                            Quantité
                          </th>
                          <th style={{ padding: '10px', textAlign: 'right', fontWeight: 'bold', color: '#333', fontSize: '14px' }}>
                            % catégorie
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {categoryGroup.products.map((product, index) => (
                          <tr key={product.productName} style={{ 
                            borderBottom: '1px solid #f0f0f0',
                            backgroundColor: index % 2 === 0 ? 'white' : '#fafafa'
                          }}>
                            <td style={{ padding: '10px', color: '#333', fontSize: '14px' }}>
                              {product.productName}
                            </td>
                            <td style={{ padding: '10px', textAlign: 'right', fontWeight: 'bold', color: '#477A0C', fontSize: '15px' }}>
                              {product.quantity}
                            </td>
                            <td style={{ padding: '10px', textAlign: 'right', color: '#666', fontSize: '13px' }}>
                              {((product.quantity / categoryGroup.totalQuantity) * 100).toFixed(1)}%
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
