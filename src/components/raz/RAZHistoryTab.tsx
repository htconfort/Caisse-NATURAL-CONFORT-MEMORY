import { getDB, type RAZHistoryEntry } from '@/db/index';
import { useSupabaseInvoices } from '@/hooks/useSupabaseInvoices';
import { getCurrentSession } from '@/services/sessionService';
import type { Sale, SessionDB, Vendor } from '@/types';
import { clearRAZHistory, populateRAZHistoryWithTestData } from '@/utils/populateRAZHistory';
import { printHtmlA4 } from '@/utils/printA4';
import { Calendar, Download, Eye, Printer, Sparkles, Table, Trash2 } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { RAZPasswordProtection } from './RAZPasswordProtection';
import { VendorCommissionTables } from './VendorCommissionTables';

export const RAZHistoryTab: React.FC = () => {
  const [history, setHistory] = useState<RAZHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEntry, setSelectedEntry] = useState<RAZHistoryEntry | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [showCommissionTables, setShowCommissionTables] = useState(false);
  
  // Données pour les tableaux de commission
  const [currentSession, setCurrentSession] = useState<SessionDB | null>(null);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const { invoices: allSupabaseInvoices } = useSupabaseInvoices();
  
  // 🔧 FIX: Filtrer les factures Supabase par dates de session ET exclure annulées
  const supabaseInvoices = React.useMemo(() => {
    // 🔧 TOUJOURS exclure les factures annulées
    const nonCanceled = allSupabaseInvoices.filter(invoice => 
      invoice.status !== 'canceled' && invoice.canceled !== true
    );
    
    if (!currentSession?.eventStart || !currentSession?.eventEnd) {
      return nonCanceled;
    }
    
    const sessionStart = currentSession.eventStart;
    const sessionEnd = currentSession.eventEnd;
    
    const filtered = nonCanceled.filter(invoice => {
      const invDate = new Date(invoice.created_at).getTime();
      return invDate >= sessionStart && invDate <= sessionEnd;
    });
    
    console.log(`🔍 Filtrage factures Supabase: ${filtered.length}/${allSupabaseInvoices.length} (${allSupabaseInvoices.length - nonCanceled.length} annulées) entre ${new Date(sessionStart).toLocaleDateString('fr-FR')} et ${new Date(sessionEnd).toLocaleDateString('fr-FR')}`);
    
    return filtered;
  }, [allSupabaseInvoices, currentSession]);

  // Vérifier si déjà déverrouillé dans cette session
  useEffect(() => {
    const unlocked = sessionStorage.getItem('raz_history_unlocked');
    if (unlocked === 'true') {
      setIsUnlocked(true);
    }
  }, []);

  // Charger l'historique depuis IndexedDB (quand déverrouillé)
  useEffect(() => {
    if (isUnlocked) {
      loadHistory();
    }
  }, [isUnlocked]);

  // Charger les données pour les tableaux de commission dès le déverrouillage
  useEffect(() => {
    if (isUnlocked) {
      loadCommissionData();
    }
  }, [isUnlocked, allSupabaseInvoices.length]);

  const loadCommissionData = async () => {
    try {
      const db = await getDB();
      
      // Charger la session actuelle
      const session = await getCurrentSession();
      console.log('🔍 RAZHistoryTab - Session chargée:', {
        id: session?.id,
        eventName: session?.eventName,
        eventStart: session?.eventStart ? new Date(session.eventStart).toLocaleDateString('fr-FR') : 'non défini',
        eventEnd: session?.eventEnd ? new Date(session.eventEnd).toLocaleDateString('fr-FR') : 'non défini',
        status: session?.status,
        openedAt: session?.openedAt ? new Date(session.openedAt).toLocaleDateString('fr-FR') : 'non défini'
      });
      
      setCurrentSession(session || null);
      
      // Charger les vendeuses ACTIVES uniquement (filtrage automatique)
      const vendorsData = await db.table('vendors').toArray();
      
      // 🔧 FILTRAGE DYNAMIQUE avec rétrocompatibilité
      // Si 'active' n'est pas défini (anciennes données), on utilise la liste des IDs actifs
      const activeVendorIds = ['1', '2', '3', '6', '8']; // Sylvie, Babette, Lucia, Sabrina, Karima
      const activeVendors = vendorsData.filter(v => {
        // Si le champ active existe, l'utiliser
        if (v.active !== undefined) {
          return v.active === true;
        }
        // Sinon, utiliser la liste en dur (rétrocompatibilité)
        return activeVendorIds.includes(v.id);
      });
      
      setVendors(activeVendors);
      
      // 🔧 FIX: Charger UNIQUEMENT les ventes de la session en cours
      let salesData = await db.table('sales').toArray();
      
      // Filtrer par dates de session si définies
      if (session?.eventStart && session?.eventEnd) {
        const sessionStart = session.eventStart;
        const sessionEnd = session.eventEnd;
        
        salesData = salesData.filter(sale => {
          const saleTimestamp = sale.date instanceof Date ? sale.date.getTime() : Number(sale.date);
          return saleTimestamp >= sessionStart && saleTimestamp <= sessionEnd;
        });
        
        console.log(`🔍 Filtrage des ventes: ${salesData.length} ventes entre ${new Date(sessionStart).toLocaleDateString('fr-FR')} et ${new Date(sessionEnd).toLocaleDateString('fr-FR')}`);
      }
      
      setSales(salesData);
      
      // 🆕 Vérifier si des tableaux ont été générés à l'ouverture
      try {
        const allArchives = await db.table('vendorCommissionArchives').toArray();
        console.log(`📊 Total archives dans IndexedDB: ${allArchives.length}`);
        
        if (session?.id) {
          const currentSessionArchive = allArchives.find(
            archive => archive.sessionId === session.id && archive.type === 'opening'
          );
          
          if (currentSessionArchive) {
            console.log('✅ Tableaux d\'ouverture trouvés pour cette session:', {
              archiveId: currentSessionArchive.id,
              sessionId: currentSessionArchive.sessionId,
              sessionName: currentSessionArchive.sessionName,
              type: currentSessionArchive.type,
              archivedAt: currentSessionArchive.archivedAt ? new Date(currentSessionArchive.archivedAt).toLocaleString('fr-FR') : 'non défini',
              tablesCount: typeof currentSessionArchive.tables === 'string' 
                ? JSON.parse(currentSessionArchive.tables).length 
                : Array.isArray(currentSessionArchive.tables) 
                  ? currentSessionArchive.tables.length 
                  : 0
            });
          } else {
            console.warn('⚠️ Aucun tableau d\'ouverture trouvé pour cette session:', {
              sessionId: session.id,
              sessionName: session.eventName,
              totalArchives: allArchives.length,
              archivesPourSession: allArchives.filter(a => a.sessionId === session.id).length,
              toutesLesArchives: allArchives.map(a => ({
                id: a.id,
                sessionId: a.sessionId,
                sessionName: a.sessionName,
                type: a.type
              }))
            });
            
            if (session.eventStart && session.eventEnd) {
              console.warn('💡 Génération recommandée: la session a des dates mais pas de tableaux archivés');
            }
          }
        } else {
          console.warn('⚠️ Pas de session active, impossible de vérifier les tableaux');
        }
      } catch (archiveError) {
        console.error('❌ Erreur vérification tableaux archivés:', archiveError);
      }
      
      console.log('📊 Données commission chargées:', {
        session,
        sessionId: session?.id,
        sessionName: session?.eventName,
        eventStart: session?.eventStart ? new Date(session.eventStart).toLocaleDateString('fr-FR') : 'non défini',
        eventEnd: session?.eventEnd ? new Date(session.eventEnd).toLocaleDateString('fr-FR') : 'non défini',
        openedAt: session?.openedAt ? new Date(session.openedAt).toLocaleDateString('fr-FR') : 'non défini',
        vendorsTotal: vendorsData.length,
        vendorsActifs: activeVendors.length,
        vendorsList: activeVendors.map(v => `${v.name} (${v.id})`).join(', '),
        sales: salesData.length,
        supabaseInvoices: supabaseInvoices.length
      });
    } catch (error) {
      console.error('❌ Erreur chargement données commission:', error);
    }
  };

  const loadHistory = async () => {
    // Ne charger que si déverrouillé
    if (!isUnlocked) {
      setLoading(false);
      return;
    }
    
    try {
      setLoading(true);
      const db = await getDB();
      
      // Essayer de charger depuis la table razHistory
      // Si elle n'existe pas encore, on la créera
      try {
        const entries = await db.table('razHistory').reverse().toArray();
        console.log(`📊 RAZHistoryTab - Historique chargé: ${entries.length} entrée(s)`);
        if (entries.length === 0) {
          console.log('💡 Aucun RAZ archivé. L\'historique sera créé automatiquement lors du premier RAZ.');
        }
        setHistory(entries);
      } catch (error) {
        console.log('📊 Table razHistory pas encore créée, elle sera créée au premier RAZ');
        setHistory([]);
      }
    } catch (error) {
      console.error('❌ Erreur chargement historique RAZ:', error);
      setHistory([]);
    } finally {
      setLoading(false);
    }
  };

  const deleteEntry = async (id: string) => {
    if (!confirm('Supprimer cette entrée de l\'historique ?')) return;
    
    try {
      const db = await getDB();
      await db.table('razHistory').delete(id);
      await loadHistory();
    } catch (error) {
      console.error('❌ Erreur suppression:', error);
      alert('Erreur lors de la suppression');
    }
  };

  const loadTestData = async () => {
    if (!confirm('Charger des données de test pour la démonstration ?\n\n5 RAZ fictifs seront créés avec des foires et événements de test.')) {
      return;
    }
    
    try {
      setLoading(true);
      await populateRAZHistoryWithTestData();
      await loadHistory();
      alert('✅ Données de test chargées !\n\n5 RAZ de démonstration ont été créés.\nVous pouvez maintenant tester l\'impression et la consultation.');
    } catch (error) {
      console.error('❌ Erreur chargement données test:', error);
      alert('Erreur lors du chargement des données de test');
    } finally {
      setLoading(false);
    }
  };

  const clearAllHistory = async () => {
    if (!confirm('Supprimer TOUT l\'historique ?\n\nCette action est irréversible.')) {
      return;
    }
    
    try {
      await clearRAZHistory();
      await loadHistory();
      alert('✅ Historique RAZ vidé');
    } catch (error) {
      console.error('❌ Erreur nettoyage:', error);
      alert('Erreur lors du nettoyage');
    }
  };

  const viewDetails = (entry: RAZHistoryEntry) => {
    setSelectedEntry(entry);
    setShowDetailModal(true);
  };

  const printCashSheet = (entry: RAZHistoryEntry) => {
    // Si on a le HTML sauvegardé, l'utiliser directement
    if (entry.cashSheetHtml) {
      const fullHtml = `
        <div style="padding: 32px; font-family: 'Manrope', sans-serif;">
          <h1 style="text-align: center; font-size: 20px; margin-bottom: 20px;">
            📍 Feuille de Caisse — ${entry.sessionName}
          </h1>
          ${entry.cashSheetHtml}
        </div>
      `;
      printHtmlA4(fullHtml);
      console.log('✅ Impression depuis HTML sauvegardé (feuille identique)');
    } else {
      // Fallback : générer depuis les données si pas de HTML
      const html = generateCashSheetHTML(entry);
      printHtmlA4(html);
      console.log('⚠️ Impression depuis données regénérées (ancien RAZ)');
    }
  };

  const downloadAsPDF = (entry: RAZHistoryEntry) => {
    // TODO: Générer un PDF de la feuille de caisse
    alert('Export PDF en cours de développement');
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount);
  };

  const generateCashSheetHTML = (entry: RAZHistoryEntry): string => {
    const formatDate = (timestamp: number) => {
      return new Date(timestamp).toLocaleDateString('fr-FR', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      });
    };

    const formatDateTime = (timestamp: number) => {
      return new Date(timestamp).toLocaleString('fr-FR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    };

    return `
      <!DOCTYPE html>
      <html lang="fr">
      <head>
        <meta charset="UTF-8">
        <style>
          @page { margin: 2cm; }
          body {
            font-family: 'Arial', sans-serif;
            color: #333;
            line-height: 1.6;
          }
          .header {
            text-align: center;
            margin-bottom: 30px;
            padding-bottom: 20px;
            border-bottom: 3px solid #477A0C;
          }
          .header h1 {
            color: #477A0C;
            font-size: 28px;
            margin: 0 0 10px 0;
          }
          .section {
            margin: 25px 0;
            page-break-inside: avoid;
          }
          .section-title {
            background: #477A0C;
            color: white;
            padding: 10px 15px;
            font-size: 18px;
            font-weight: bold;
            margin-bottom: 15px;
          }
          .stats-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 15px;
            margin: 15px 0;
          }
          .stat-box {
            background: #f8f9fa;
            padding: 15px;
            border-radius: 8px;
            border-left: 4px solid #477A0C;
          }
          .stat-label {
            font-size: 14px;
            color: #666;
            margin-bottom: 5px;
          }
          .stat-value {
            font-size: 24px;
            font-weight: bold;
            color: #477A0C;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin: 15px 0;
          }
          th, td {
            border: 1px solid #ddd;
            padding: 10px;
            text-align: left;
          }
          th {
            background-color: #477A0C;
            color: white;
            font-weight: bold;
          }
          tr:nth-child(even) {
            background-color: #f8f9fa;
          }
          .total-row {
            background-color: #e8f5e9;
            font-weight: bold;
          }
          .footer {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 2px solid #ddd;
            text-align: center;
            font-size: 12px;
            color: #666;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>📋 FEUILLE DE CAISSE MYCONFORT</h1>
          <p><strong>${entry.sessionName}</strong></p>
          <p>RAZ effectué le ${formatDateTime(entry.date)}</p>
          ${entry.sessionStart && entry.sessionEnd ? 
            `<p>Période: ${formatDate(entry.sessionStart)} - ${formatDate(entry.sessionEnd)}</p>` 
            : ''}
        </div>

        <div class="section">
          <div class="section-title">💰 RÉSUMÉ FINANCIER</div>
          <div class="stats-grid">
            <div class="stat-box">
              <div class="stat-label">CA Total</div>
              <div class="stat-value">${formatCurrency(entry.totalSales)}</div>
            </div>
            <div class="stat-box">
              <div class="stat-label">Nombre de ventes</div>
              <div class="stat-value">${entry.salesCount}</div>
            </div>
            <div class="stat-box">
              <div class="stat-label">Ticket moyen</div>
              <div class="stat-value">${formatCurrency(entry.salesCount > 0 ? entry.totalSales / entry.salesCount : 0)}</div>
            </div>
          </div>

          <div class="stats-grid">
            <div class="stat-box">
              <div class="stat-label">💵 Espèces</div>
              <div class="stat-value">${formatCurrency(entry.totalCash)}</div>
            </div>
            <div class="stat-box">
              <div class="stat-label">💳 Carte Bancaire</div>
              <div class="stat-value">${formatCurrency(entry.totalCard)}</div>
            </div>
            <div class="stat-box">
              <div class="stat-label">📄 Chèques</div>
              <div class="stat-value">${formatCurrency(entry.totalChecks)}</div>
            </div>
          </div>
        </div>

        <div class="section">
          <div class="section-title">👥 DÉTAIL PAR VENDEUSE</div>
          <table>
            <thead>
              <tr>
                <th>Rang</th>
                <th>Vendeuse</th>
                <th>CA du jour</th>
                <th>CA total</th>
                <th>% du CA</th>
              </tr>
            </thead>
            <tbody>
              ${entry.vendorStats
                .sort((a, b) => b.dailySales - a.dailySales)
                .map((vendor, idx) => `
                  <tr>
                    <td>${idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : (idx + 1)}</td>
                    <td><strong>${vendor.name}</strong></td>
                    <td>${formatCurrency(vendor.dailySales)}</td>
                    <td>${formatCurrency(vendor.totalSales)}</td>
                    <td>${entry.totalSales > 0 ? ((vendor.dailySales / entry.totalSales) * 100).toFixed(1) : '0.0'}%</td>
                  </tr>
                `).join('')}
              <tr class="total-row">
                <td colspan="2">TOTAL</td>
                <td>${formatCurrency(entry.vendorStats.reduce((sum, v) => sum + v.dailySales, 0))}</td>
                <td>${formatCurrency(entry.vendorStats.reduce((sum, v) => sum + v.totalSales, 0))}</td>
                <td>100%</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="section">
          <div class="section-title">📊 RÉCAPITULATIF</div>
          <table>
            <tr>
              <th>Indicateur</th>
              <th>Valeur</th>
            </tr>
            <tr>
              <td>Nombre de vendeuses actives</td>
              <td>${entry.vendorStats.length}</td>
            </tr>
            <tr>
              <td>Nombre total de ventes</td>
              <td>${entry.salesCount}</td>
            </tr>
            <tr>
              <td>Chiffre d'affaires total</td>
              <td><strong>${formatCurrency(entry.totalSales)}</strong></td>
            </tr>
            <tr>
              <td>Panier moyen</td>
              <td>${formatCurrency(entry.salesCount > 0 ? entry.totalSales / entry.salesCount : 0)}</td>
            </tr>
          </table>
        </div>

        <div class="footer">
          <p>📋 Feuille de caisse archivée - Caisse MyConfort</p>
          <p>Document généré le ${formatDateTime(entry.date)}</p>
          <p>Session: ${entry.sessionName}</p>
        </div>
      </body>
      </html>
    `;
  };

  // Afficher le formulaire de mot de passe si pas déverrouillé
  if (!isUnlocked) {
    return <RAZPasswordProtection onUnlock={() => {
      setIsUnlocked(true);
    }} />;
  }

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <div style={{ fontSize: '20px', color: '#666' }}>
          Chargement de l'historique...
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px', backgroundColor: '#f5f5f5', minHeight: '100vh' }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        {/* En-tête */}
        <div style={{
          background: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 50%, #60a5fa 100%)',
          color: 'white',
          padding: '30px',
          borderRadius: '12px',
          marginBottom: '30px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '20px' }}>
            <div>
              <h1 style={{ 
                margin: 0, 
                fontSize: '2.5em', 
                fontWeight: 'bold',
                display: 'flex',
                alignItems: 'center',
                gap: '15px'
              }}>
                📚 Historique des RAZ
              </h1>
              <p style={{ margin: '10px 0 0 0', fontSize: '1.2em', opacity: 0.9 }}>
                Consultez toutes vos feuilles de caisse et résumés de journée
              </p>
            </div>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              {history.length === 0 && (
                <button
                  onClick={loadTestData}
                  style={{
                    padding: '12px 20px',
                    background: 'rgba(255,255,255,0.2)',
                    color: 'white',
                    border: '2px solid rgba(255,255,255,0.5)',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontWeight: '600',
                    fontSize: '14px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                  title="Charger des données de démonstration"
                >
                  <Sparkles size={16} />
                  Charger données de test
                </button>
              )}
              {history.length > 0 && (
                <button
                  onClick={clearAllHistory}
                  style={{
                    padding: '12px 20px',
                    background: 'rgba(239,68,68,0.9)',
                    color: 'white',
                    border: '2px solid rgba(255,255,255,0.5)',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontWeight: '600',
                    fontSize: '14px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                  title="Supprimer tout l'historique"
                >
                  <Trash2 size={16} />
                  Tout supprimer
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Bouton Tableau Vendeuses */}
        <div style={{ marginBottom: '30px', textAlign: 'center' }}>
          <button
            onClick={() => setShowCommissionTables(!showCommissionTables)}
            style={{
              padding: '15px 30px',
              background: showCommissionTables 
                ? 'linear-gradient(135deg, #059669 0%, #047857 100%)'
                : 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
              color: 'white',
              border: 'none',
              borderRadius: '10px',
              cursor: 'pointer',
              fontWeight: 'bold',
              fontSize: '1.1em',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '12px',
              boxShadow: '0 4px 15px rgba(0,0,0,0.15)',
              transition: 'all 0.3s ease'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 6px 20px rgba(0,0,0,0.2)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 4px 15px rgba(0,0,0,0.15)';
            }}
          >
            <Table size={24} />
            {showCommissionTables ? '📊 Masquer Tableaux Commissions' : '📊 Tableau Vendeuses'}
          </button>
        </div>

        {/* Tableaux de commission (si activés) */}
        {showCommissionTables && (
          <div style={{ marginBottom: '30px' }}>
            {/* 🔧 Affichage des dates de session pour debugging */}
            <div style={{ 
              padding: '16px', 
              background: '#EFF6FF', 
              borderRadius: '8px',
              border: '2px solid #3B82F6',
              marginBottom: '16px'
            }}>
              <h4 style={{ color: '#1E40AF', marginBottom: '8px', fontSize: '16px' }}>
                📅 Dates de la session actuelle
              </h4>
              <p style={{ color: '#1E3A8A', fontSize: '14px', margin: '4px 0' }}>
                <strong>Session ID:</strong> {currentSession?.id || '❌ Non défini'}
              </p>
              <p style={{ color: '#1E3A8A', fontSize: '14px', margin: '4px 0' }}>
                <strong>Nom:</strong> {currentSession?.eventName || '❌ Non défini'}
              </p>
              <p style={{ color: '#1E3A8A', fontSize: '14px', margin: '4px 0' }}>
                <strong>Début :</strong> {currentSession?.eventStart ? new Date(currentSession.eventStart).toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : '❌ Non défini'}
              </p>
              <p style={{ color: '#1E3A8A', fontSize: '14px', margin: '4px 0' }}>
                <strong>Fin :</strong> {currentSession?.eventEnd ? new Date(currentSession.eventEnd).toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : '❌ Non défini'}
              </p>
              {currentSession?.eventStart && currentSession?.eventEnd && (
                <p style={{ color: '#059669', fontSize: '12px', marginTop: '8px', fontWeight: 'bold' }}>
                  ✅ Le tableau affiche {Math.ceil((currentSession.eventEnd - currentSession.eventStart) / (1000 * 60 * 60 * 24)) + 1} jours
                </p>
              )}
              {!currentSession && (
                <div style={{ marginTop: '12px', padding: '12px', background: '#FEF3C7', borderRadius: '6px', border: '1px solid #F59E0B' }}>
                  <p style={{ color: '#92400E', fontSize: '13px', margin: 0, fontWeight: 'bold' }}>
                    ⚠️ Aucune session active trouvée
                  </p>
                  <p style={{ color: '#92400E', fontSize: '12px', margin: '8px 0 0 0' }}>
                    💡 Allez dans l'onglet RAZ → "Gestion Session" pour ouvrir une session, ou utilisez la console :
                  </p>
                  <code style={{ display: 'block', marginTop: '8px', padding: '8px', background: '#FFF', borderRadius: '4px', fontSize: '11px', color: '#1E40AF' }}>
                    await window.initFoireDijonSession()
                  </code>
                </div>
              )}
            </div>
            
            {/* 🔧 FIX CRITIQUE: N'afficher les tableaux QUE si eventStart et eventEnd sont définis */}
            {!currentSession?.eventStart || !currentSession?.eventEnd ? (
              <div style={{ 
                padding: '40px', 
                textAlign: 'center', 
                background: '#FEF3C7', 
                borderRadius: '12px',
                border: '2px solid #F59E0B'
              }}>
                <h3 style={{ color: '#D97706', marginBottom: '16px' }}>
                  ⚠️ Session sans dates d'événement
                </h3>
                <p style={{ color: '#92400E', marginBottom: '12px' }}>
                  Les tableaux de commission nécessitent des dates de session précises.
                </p>
                <p style={{ color: '#92400E', fontSize: '14px', marginTop: '12px', fontWeight: 'bold' }}>
                  💡 Astuce : Allez dans l'onglet RAZ et définissez les dates dans "Gestion Session".
                </p>
              </div>
            ) : (
              <VendorCommissionTables
                vendors={vendors}
                sales={sales}
                supabaseInvoices={supabaseInvoices}
                sessionStart={currentSession.eventStart}
                sessionEnd={currentSession.eventEnd}
                sessionName={currentSession?.eventName || 'Session en cours'}
                sessionId={currentSession.id}
              />
            )}
          </div>
        )}

        {/* Stats globales */}
        {!showCommissionTables && (<>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '20px',
            marginBottom: '30px'
          }}>
          <div style={{
            background: 'white',
            padding: '20px',
            borderRadius: '12px',
            boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
            borderLeft: '4px solid #3b82f6'
          }}>
            <div style={{ fontSize: '14px', color: '#666', marginBottom: '5px' }}>
              Total RAZ effectués
            </div>
            <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#1e40af' }}>
              {history.length}
            </div>
          </div>

          <div style={{
            background: 'white',
            padding: '20px',
            borderRadius: '12px',
            boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
            borderLeft: '4px solid #10b981'
          }}>
            <div style={{ fontSize: '14px', color: '#666', marginBottom: '5px' }}>
              CA Total archivé
            </div>
            <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#059669' }}>
              {formatCurrency(history.reduce((sum, h) => sum + h.totalSales, 0))}
            </div>
          </div>

          <div style={{
            background: 'white',
            padding: '20px',
            borderRadius: '12px',
            boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
            borderLeft: '4px solid #f59e0b'
          }}>
            <div style={{ fontSize: '14px', color: '#666', marginBottom: '5px' }}>
              Ventes archivées
            </div>
            <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#d97706' }}>
              {history.reduce((sum, h) => sum + h.salesCount, 0)}
            </div>
          </div>
        </div>

          {/* Liste de l'historique */}
          {history.length === 0 ? (
          <div style={{
            background: 'white',
            padding: '60px 40px',
            borderRadius: '12px',
            textAlign: 'center',
            boxShadow: '0 2px 10px rgba(0,0,0,0.05)'
          }}>
            <div style={{ fontSize: '48px', marginBottom: '20px' }}>📋</div>
            <h2 style={{ fontSize: '24px', color: '#333', marginBottom: '10px' }}>
              Aucun RAZ archivé
            </h2>
            <p style={{ fontSize: '16px', color: '#666', marginBottom: '30px' }}>
              Les feuilles de caisse seront automatiquement sauvegardées ici après chaque RAZ
            </p>
            
            <div style={{
              background: '#f0f9ff',
              border: '2px dashed #3b82f6',
              borderRadius: '10px',
              padding: '25px',
              marginTop: '20px',
              maxWidth: '600px',
              margin: '30px auto'
            }}>
              <div style={{ fontSize: '20px', marginBottom: '15px', color: '#1e40af', fontWeight: 'bold' }}>
                ✨ Mode Démonstration
              </div>
              <p style={{ fontSize: '15px', color: '#666', marginBottom: '20px' }}>
                Pour voir l'interface en action sans faire de vraies ventes, vous pouvez charger des données de test.
              </p>
              <button
                onClick={loadTestData}
                style={{
                  padding: '15px 30px',
                  background: '#3b82f6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: '600',
                  fontSize: '16px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '10px',
                  boxShadow: '0 4px 12px rgba(59,130,246,0.3)'
                }}
              >
                <Sparkles size={20} />
                Charger 5 RAZ de démonstration
              </button>
              <p style={{ fontSize: '13px', color: '#999', marginTop: '15px' }}>
                (Ceci créera 5 feuilles de caisse fictives pour tester l'impression et la consultation)
              </p>
            </div>
          </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              {history.map((entry) => (
              <div
                key={entry.id}
                style={{
                  background: 'white',
                  borderRadius: '12px',
                  boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
                  overflow: 'hidden',
                  transition: 'all 0.2s ease'
                }}
              >
                <div style={{ padding: '25px' }}>
                  {/* En-tête de l'entrée */}
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    marginBottom: '20px'
                  }}>
                    <div style={{ flex: 1 }}>
                      <div style={{
                        fontSize: '20px',
                        fontWeight: 'bold',
                        color: '#1e40af',
                        marginBottom: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px'
                      }}>
                        <Calendar size={20} />
                        {entry.sessionName}
                      </div>
                      <div style={{ fontSize: '14px', color: '#666' }}>
                        RAZ effectué le {new Date(entry.date).toLocaleDateString('fr-FR', {
                          weekday: 'long',
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </div>
                      {entry.sessionStart && entry.sessionEnd && (
                        <div style={{ fontSize: '14px', color: '#666', marginTop: '4px' }}>
                          Période: {new Date(entry.sessionStart).toLocaleDateString('fr-FR')} - {new Date(entry.sessionEnd).toLocaleDateString('fr-FR')}
                        </div>
                      )}
                    </div>

                    {/* Boutons d'action */}
                    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                      <button
                        onClick={() => viewDetails(entry)}
                        style={{
                          padding: '10px 16px',
                          background: '#3b82f6',
                          color: 'white',
                          border: 'none',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          fontWeight: '600',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px'
                        }}
                        title="Voir les détails"
                      >
                        <Eye size={16} />
                        Voir
                      </button>
                      <button
                        onClick={() => printCashSheet(entry)}
                        style={{
                          padding: '10px 16px',
                          background: '#477A0C',
                          color: 'white',
                          border: 'none',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          fontWeight: '600',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px'
                        }}
                        title="Imprimer la feuille de caisse"
                      >
                        <Printer size={16} />
                        Imprimer
                      </button>
                      <button
                        onClick={() => downloadAsPDF(entry)}
                        style={{
                          padding: '10px 16px',
                          background: '#10b981',
                          color: 'white',
                          border: 'none',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          fontWeight: '600',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px'
                        }}
                        title="Télécharger PDF"
                      >
                        <Download size={16} />
                        PDF
                      </button>
                      <button
                        onClick={() => deleteEntry(entry.id)}
                        style={{
                          padding: '10px 16px',
                          background: '#ef4444',
                          color: 'white',
                          border: 'none',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          fontWeight: '600',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px'
                        }}
                        title="Supprimer"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>

                  {/* Statistiques de l'entrée */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                    gap: '15px',
                    padding: '20px',
                    background: '#f9fafb',
                    borderRadius: '8px'
                  }}>
                    <div>
                      <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>
                        CA Total
                      </div>
                      <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#059669' }}>
                        {formatCurrency(entry.totalSales)}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>
                        Espèces
                      </div>
                      <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#0891b2' }}>
                        {formatCurrency(entry.totalCash)}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>
                        Carte
                      </div>
                      <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#7c3aed' }}>
                        {formatCurrency(entry.totalCard)}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>
                        Chèques
                      </div>
                      <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#f59e0b' }}>
                        {formatCurrency(entry.totalChecks)}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>
                        Ventes
                      </div>
                      <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#1e40af' }}>
                        {entry.salesCount}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>
                        Vendeuses
                      </div>
                      <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#db2777' }}>
                        {entry.vendorStats.length}
                      </div>
                    </div>
                  </div>

                  {/* Top vendeuses */}
                  {entry.vendorStats.length > 0 && (
                    <div style={{ marginTop: '15px' }}>
                      <div style={{ fontSize: '14px', fontWeight: '600', color: '#666', marginBottom: '10px' }}>
                        Top Vendeuses:
                      </div>
                      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                        {entry.vendorStats
                          .sort((a, b) => b.dailySales - a.dailySales)
                          .slice(0, 3)
                          .map((vendor, idx) => (
                            <div
                              key={idx}
                              style={{
                                padding: '8px 12px',
                                background: idx === 0 ? '#fef3c7' : idx === 1 ? '#e0e7ff' : '#f3e8ff',
                                borderRadius: '6px',
                                fontSize: '14px',
                                fontWeight: '600',
                                color: idx === 0 ? '#92400e' : idx === 1 ? '#3730a3' : '#581c87'
                              }}
                            >
                              {idx === 0 ? '🥇' : idx === 1 ? '🥈' : '🥉'} {vendor.name}: {formatCurrency(vendor.dailySales)}
                            </div>
                          ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
              ))}
            </div>
          )}
        </>)}
      </div>

      {/* Modal de détails */}
      {showDetailModal && selectedEntry && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '20px'
          }}
          onClick={() => setShowDetailModal(false)}
        >
          <div
            style={{
              background: 'white',
              borderRadius: '12px',
              maxWidth: '900px',
              width: '100%',
              maxHeight: '90vh',
              overflow: 'auto',
              boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{
              padding: '30px',
              borderBottom: '2px solid #e5e7eb',
              background: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)',
              color: 'white',
              borderTopLeftRadius: '12px',
              borderTopRightRadius: '12px'
            }}>
              <h2 style={{ margin: 0, fontSize: '24px', fontWeight: 'bold' }}>
                📋 {selectedEntry.sessionName}
              </h2>
              <p style={{ margin: '8px 0 0 0', opacity: 0.9 }}>
                RAZ du {new Date(selectedEntry.date).toLocaleDateString('fr-FR', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </p>
            </div>

            <div style={{ padding: '30px' }}>
              {/* Afficher la feuille de caisse sauvegardée si disponible */}
              {selectedEntry.cashSheetHtml ? (
                <div dangerouslySetInnerHTML={{ __html: selectedEntry.cashSheetHtml }} />
              ) : (
                <>
                  {/* Fallback : affichage basique si pas de HTML sauvegardé (anciens RAZ) */}
                  <div style={{ marginBottom: '30px' }}>
                    <h3 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '15px', color: '#1e40af' }}>
                      💰 Résumé Financier
                    </h3>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, 1fr)',
                  gap: '15px'
                }}>
                  <div style={{ padding: '15px', background: '#f9fafb', borderRadius: '8px' }}>
                    <div style={{ fontSize: '14px', color: '#666' }}>CA Total</div>
                    <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#059669' }}>
                      {formatCurrency(selectedEntry.totalSales)}
                    </div>
                  </div>
                  <div style={{ padding: '15px', background: '#f9fafb', borderRadius: '8px' }}>
                    <div style={{ fontSize: '14px', color: '#666' }}>Nombre de ventes</div>
                    <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#1e40af' }}>
                      {selectedEntry.salesCount}
                    </div>
                  </div>
                  <div style={{ padding: '15px', background: '#f9fafb', borderRadius: '8px' }}>
                    <div style={{ fontSize: '14px', color: '#666' }}>Espèces</div>
                    <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#0891b2' }}>
                      {formatCurrency(selectedEntry.totalCash)}
                    </div>
                  </div>
                  <div style={{ padding: '15px', background: '#f9fafb', borderRadius: '8px' }}>
                    <div style={{ fontSize: '14px', color: '#666' }}>Carte</div>
                    <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#7c3aed' }}>
                      {formatCurrency(selectedEntry.totalCard)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Détail vendeuses */}
              <div style={{ marginBottom: '30px' }}>
                <h3 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '15px', color: '#1e40af' }}>
                  👥 Détail par Vendeuse
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {selectedEntry.vendorStats
                    .sort((a, b) => b.dailySales - a.dailySales)
                    .map((vendor, idx) => (
                      <div
                        key={idx}
                        style={{
                          padding: '15px',
                          background: '#f9fafb',
                          borderRadius: '8px',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center'
                        }}
                      >
                        <div style={{ fontWeight: '600', fontSize: '16px' }}>
                          {idx + 1}. {vendor.name}
                        </div>
                        <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#059669' }}>
                          {formatCurrency(vendor.dailySales)}
                        </div>
                      </div>
                    ))}
                </div>
              </div>
                </>
              )}

              {/* Boutons d'action modal */}
              <div style={{ 
                display: 'flex', 
                gap: '15px', 
                justifyContent: 'center',
                flexWrap: 'wrap'
              }}>
                <button
                  onClick={() => {
                    printCashSheet(selectedEntry);
                  }}
                  style={{
                    padding: '12px 32px',
                    background: '#477A0C',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '16px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px'
                  }}
                >
                  <Printer size={20} />
                  Imprimer la feuille
                </button>
                <button
                  onClick={() => setShowDetailModal(false)}
                  style={{
                    padding: '12px 32px',
                    background: '#6b7280',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '16px',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                >
                  Fermer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

