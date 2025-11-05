import React, { useState } from 'react';
// import { useSyncInvoices } from '../hooks/useSyncInvoices'; // Temporairement désactivé
import { useStockManagement } from '../hooks/useStockManagement';
import { useNotifications } from '../hooks/useNotifications';
import { InvoiceCard } from './InvoiceCard';
import { StockOverview } from './StockOverview';
import { SyncStatus } from './SyncStatus';
import { NotificationCenter } from './NotificationCenter';
import type { Invoice } from '@/services/syncService';
import '../styles/invoices-tab.css';

export const InvoicesTab: React.FC = () => {
  const [activeView, setActiveView] = useState<'invoices' | 'stock'>('invoices');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<Invoice['status'] | 'all'>('all');
  
  const {
    invoices,
    stats,
    loading,
    error,
    syncInvoices,
    filterInvoicesByStatus,
    searchInvoices
  } = useSyncInvoices();

  const {
    stockItems,
    loading: stockLoading,
    getStockStats
  } = useStockManagement();

  const {
    notifications,
    removeNotification
  } = useNotifications();

  // Filtrage des factures
  const getFilteredInvoices = () => {
    let filtered = invoices;
    
    if (statusFilter !== 'all') {
      filtered = filterInvoicesByStatus(statusFilter);
    }
    
    if (searchQuery.trim()) {
      filtered = searchInvoices(searchQuery);
    }
    
    return filtered;
  };

  const filteredInvoices = getFilteredInvoices();
  const stockStats = getStockStats();

  if (loading && invoices.length === 0) {
    return (
      <div className="max-w-6xl mx-auto animate-fadeIn">
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-4 border-black mb-4"></div>
          <p style={{ fontSize: '24px', fontWeight: 'bold', color: '#000000' }}>
            Chargement des factures...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto animate-fadeIn">
      <NotificationCenter 
        notifications={notifications}
        onRemove={removeNotification}
      />

      {/* Header avec statistiques */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-5xl font-bold" style={{ color: '#000000' }}>
            📄 Factures & Stock
          </h2>
          <SyncStatus 
            stats={stats}
            onSync={syncInvoices}
            loading={loading}
          />
        </div>

        {/* Navigation vue */}
        <div className="flex gap-3 mb-4">
          <button
            onClick={() => setActiveView('invoices')}
            className={`px-6 py-3 rounded-lg font-bold text-xl transition-all ${
              activeView === 'invoices'
                ? 'bg-black text-white shadow-md'
                : 'bg-gray-100 text-black hover:bg-gray-200'
            }`}
            style={{ fontSize: '22px', fontWeight: 'bold' }}
          >
            📄 Factures ({stats.totalInvoices})
          </button>
          <button
            onClick={() => setActiveView('stock')}
            className={`px-6 py-3 rounded-lg font-bold text-xl transition-all ${
              activeView === 'stock'
                ? 'bg-black text-white shadow-md'
                : 'bg-gray-100 text-black hover:bg-gray-200'
            }`}
            style={{ fontSize: '22px', fontWeight: 'bold' }}
          >
            📦 Stock ({stockStats.totalProducts})
          </button>
        </div>

        {/* Statistiques rapides */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="card p-4 text-center" style={{ border: '3px solid #000000' }}>
            <div className="text-3xl font-bold" style={{ color: '#000000' }}>{stats.pendingInvoices}</div>
            <div className="text-lg font-bold" style={{ color: '#000000' }}>En cours</div>
          </div>
          <div className="card p-4 text-center" style={{ border: '3px solid #000000' }}>
            <div className="text-3xl font-bold" style={{ color: '#000000' }}>{stats.partialInvoices}</div>
            <div className="text-lg font-bold" style={{ color: '#000000' }}>Partielles</div>
          </div>
          <div className="card p-4 text-center" style={{ border: '3px solid #000000' }}>
            <div className="text-3xl font-bold" style={{ color: '#000000' }}>{stockStats.totalAvailable}</div>
            <div className="text-lg font-bold" style={{ color: '#000000' }}>Disponibles</div>
          </div>
          <div className="card p-4 text-center" style={{ border: '3px solid #000000' }}>
            <div className="text-3xl font-bold" style={{ color: '#000000' }}>{stockStats.lowStockItems}</div>
            <div className="text-lg font-bold" style={{ color: '#000000' }}>Stock bas</div>
          </div>
        </div>
      </div>

      {/* Vue des factures */}
      {activeView === 'invoices' && (
        <div>
          {/* Filtres et recherche */}
          <div className="card p-4 mb-6" style={{ border: '3px solid #000000' }}>
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <input
                  type="text"
                  placeholder="Rechercher par client, numéro ou produit..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-black rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-black"
                  style={{ fontSize: '18px', fontWeight: 'bold', color: '#000000' }}
                />
              </div>
              <div className="md:w-48">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as Invoice['status'] | 'all')}
                  className="w-full px-4 py-3 border-2 border-black rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-black"
                  style={{ fontSize: '18px', fontWeight: 'bold', color: '#000000' }}
                >
                  <option value="all">Tous les statuts</option>
                  <option value="draft">Brouillon</option>
                  <option value="sent">Envoyée</option>
                  <option value="partial">Partielle</option>
                  <option value="paid">Payée</option>
                  <option value="cancelled">Annulée</option>
                </select>
              </div>
            </div>
          </div>

          {/* Liste des factures */}
          {error && (
            <div className="card p-4 mb-6 border-l-4" style={{ borderColor: '#000000', backgroundColor: 'rgba(255,255,255,0.95)', border: '3px solid #000000' }}>
              <p style={{ color: '#000000', fontSize: '20px', fontWeight: 'bold' }}>
                ⚠️ Erreur: {error}
              </p>
              <button
                onClick={syncInvoices}
                className="mt-2 underline"
                style={{ color: '#000000', fontSize: '18px', fontWeight: 'bold' }}
              >
                Réessayer
              </button>
            </div>
          )}

          {filteredInvoices.length === 0 ? (
            <div className="card text-center py-12" style={{ border: '3px solid #000000' }}>
              <p style={{ fontSize: '24px', color: '#000000', fontWeight: 'bold', marginBottom: '16px' }}>
                {invoices.length === 0 ? 'Aucune facture trouvée' : 'Aucune facture ne correspond aux filtres'}
              </p>
              {invoices.length === 0 && (
                <button
                  onClick={syncInvoices}
                  className="btn-primary"
                  disabled={loading}
                  style={{ fontSize: '20px', fontWeight: 'bold', padding: '12px 24px', backgroundColor: '#000000', color: '#ffffff', border: 'none', borderRadius: '8px' }}
                >
                  🔄 Synchroniser
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {filteredInvoices.map((invoice) => (
                <InvoiceCard
                  key={invoice.id}
                  invoice={invoice}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Vue des stocks */}
      {activeView === 'stock' && (
        <StockOverview
          stockItems={stockItems}
          loading={stockLoading}
          stats={stockStats}
        />
      )}
    </div>
  );
};
