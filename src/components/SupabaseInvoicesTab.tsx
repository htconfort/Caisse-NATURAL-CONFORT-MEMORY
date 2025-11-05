/**
 * Onglet Factures Supabase
 * Affiche les factures créées dans l'App Facturation
 * Synchronisation temps réel via Supabase
 * Version: 1.0.0 - 2025-01-24
 */

import React, { useState } from 'react';
import { useSupabaseInvoices } from '../hooks/useSupabaseInvoices';
import { FileText, Calendar, User, Euro, RefreshCw, AlertCircle, CheckCircle, Wifi, WifiOff } from 'lucide-react';

export const SupabaseInvoicesTab: React.FC = () => {
  const {
    invoices,
    stats,
    isLoading,
    error,
    isConnected,
    loadInvoices,
    loadTodayInvoices,
    hasInvoices
  } = useSupabaseInvoices();

  const [filterDate, setFilterDate] = useState<'all' | 'today'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Filtrer les factures
  const filteredInvoices = invoices.filter(invoice => {
    // Filtre par date
    if (filterDate === 'today') {
      const today = new Date().toISOString().split('T')[0];
      if (!invoice.date_facture.startsWith(today)) {
        return false;
      }
    }

    // Filtre par recherche
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      return (
        invoice.numero_facture.toLowerCase().includes(query) ||
        invoice.nom_client.toLowerCase().includes(query) ||
        invoice.email_client?.toLowerCase().includes(query) ||
        invoice.telephone_client?.toLowerCase().includes(query)
      );
    }

    return true;
  });

  return (
    <div style={{
      padding: '20px',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      backgroundColor: '#f5f5f5',
      minHeight: '100vh'
    }}>
      {/* Header */}
      <div style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        padding: '24px',
        marginBottom: '20px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '28px', color: '#333', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <FileText size={32} />
              Factures App Facturation
            </h1>
            <p style={{ margin: '8px 0 0', color: '#666' }}>
              Synchronisées en temps réel depuis Supabase
            </p>
          </div>

          {/* Indicateur de connexion */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '12px 20px',
            backgroundColor: isConnected ? '#e8f5e9' : '#ffebee',
            borderRadius: '8px',
            border: `2px solid ${isConnected ? '#4caf50' : '#f44336'}`
          }}>
            {isConnected ? (
              <>
                <Wifi size={20} color="#4caf50" />
                <span style={{ fontWeight: 'bold', color: '#4caf50' }}>Connecté</span>
              </>
            ) : (
              <>
                <WifiOff size={20} color="#f44336" />
                <span style={{ fontWeight: 'bold', color: '#f44336' }}>Déconnecté</span>
              </>
            )}
          </div>
        </div>

        {/* Barre de recherche et filtres */}
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <input
            type="text"
            placeholder="Rechercher par numéro, client, email, téléphone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              flex: 1,
              padding: '12px',
              borderRadius: '8px',
              border: '1px solid #ddd',
              fontSize: '14px'
            }}
          />

          <button
            onClick={() => setFilterDate('all')}
            style={{
              padding: '12px 20px',
              backgroundColor: filterDate === 'all' ? '#2196f3' : '#e0e0e0',
              color: filterDate === 'all' ? 'white' : '#666',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: 'bold'
            }}
          >
            Toutes
          </button>

          <button
            onClick={() => {
              setFilterDate('today');
              loadTodayInvoices();
            }}
            style={{
              padding: '12px 20px',
              backgroundColor: filterDate === 'today' ? '#2196f3' : '#e0e0e0',
              color: filterDate === 'today' ? 'white' : '#666',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: 'bold'
            }}
          >
            Aujourd'hui
          </button>

          <button
            onClick={loadInvoices}
            disabled={isLoading}
            style={{
              padding: '12px 20px',
              backgroundColor: '#4caf50',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              fontWeight: 'bold',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              opacity: isLoading ? 0.6 : 1
            }}
          >
            <RefreshCw size={16} className={isLoading ? 'spin' : ''} />
            Actualiser
          </button>
        </div>
      </div>

      {/* Statistiques */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '20px',
        marginBottom: '20px'
      }}>
        <div style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          padding: '20px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          borderLeft: '4px solid #2196f3'
        }}>
          <div style={{ color: '#666', fontSize: '14px', marginBottom: '8px' }}>Total Factures</div>
          <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#333' }}>{stats.total}</div>
        </div>

        <div style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          padding: '20px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          borderLeft: '4px solid #4caf50'
        }}>
          <div style={{ color: '#666', fontSize: '14px', marginBottom: '8px' }}>Aujourd'hui</div>
          <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#333' }}>{stats.today}</div>
        </div>

        <div style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          padding: '20px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          borderLeft: '4px solid #ff9800'
        }}>
          <div style={{ color: '#666', fontSize: '14px', marginBottom: '8px' }}>CA Total</div>
          <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#333' }}>
            {stats.totalAmount.toFixed(2)}€
          </div>
        </div>

        <div style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          padding: '20px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          borderLeft: '4px solid #9c27b0'
        }}>
          <div style={{ color: '#666', fontSize: '14px', marginBottom: '8px' }}>CA Aujourd'hui</div>
          <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#333' }}>
            {stats.todayAmount.toFixed(2)}€
          </div>
        </div>
      </div>

      {/* Message d'erreur */}
      {error && (
        <div style={{
          backgroundColor: '#ffebee',
          borderRadius: '8px',
          padding: '16px',
          marginBottom: '20px',
          color: '#c62828',
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          <AlertCircle size={24} />
          <div>
            <strong>Erreur de chargement</strong>
            <div style={{ fontSize: '14px', marginTop: '4px' }}>{error}</div>
          </div>
        </div>
      )}

      {/* Liste des factures */}
      <div style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        padding: '24px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
      }}>
        <h2 style={{ margin: '0 0 20px', fontSize: '20px', color: '#333' }}>
          {filterDate === 'today' ? 'Factures du jour' : 'Toutes les factures'} ({filteredInvoices.length})
        </h2>

        {isLoading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
            <RefreshCw size={32} className="spin" />
            <div style={{ marginTop: '12px' }}>Chargement des factures...</div>
          </div>
        ) : !hasInvoices ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
            <FileText size={48} style={{ opacity: 0.3, marginBottom: '12px' }} />
            <div>Aucune facture pour le moment</div>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: '#f5f5f5', borderBottom: '2px solid #ddd' }}>
                  <th style={{ padding: '12px', textAlign: 'left' }}>Numéro</th>
                  <th style={{ padding: '12px', textAlign: 'left' }}>Date</th>
                  <th style={{ padding: '12px', textAlign: 'left' }}>Client</th>
                  <th style={{ padding: '12px', textAlign: 'left' }}>Contact</th>
                  <th style={{ padding: '12px', textAlign: 'right' }}>Sous-total HT</th>
                  <th style={{ padding: '12px', textAlign: 'right' }}>TVA</th>
                  <th style={{ padding: '12px', textAlign: 'right' }}>Total TTC</th>
                  <th style={{ padding: '12px', textAlign: 'center' }}>Statut</th>
                </tr>
              </thead>
              <tbody>
                {filteredInvoices.map((invoice) => (
                  <tr key={invoice.id} style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: '12px', fontWeight: 'bold', fontFamily: 'monospace' }}>
                      {invoice.numero_facture}
                    </td>
                    <td style={{ padding: '12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Calendar size={16} color="#666" />
                        {new Date(invoice.date_facture).toLocaleDateString('fr-FR')}
                      </div>
                    </td>
                    <td style={{ padding: '12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <User size={16} color="#666" />
                        {invoice.nom_client}
                      </div>
                    </td>
                    <td style={{ padding: '12px', fontSize: '12px', color: '#666' }}>
                      <div>{invoice.email_client || '-'}</div>
                      <div>{invoice.telephone_client || '-'}</div>
                    </td>
                    <td style={{ padding: '12px', textAlign: 'right' }}>
                      {(invoice.montant_ht || 0).toFixed(2)}€
                    </td>
                    <td style={{ padding: '12px', textAlign: 'right' }}>
                      {(invoice.montant_tva || 0).toFixed(2)}€
                    </td>
                    <td style={{ padding: '12px', textAlign: 'right', fontWeight: 'bold', fontSize: '16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '4px' }}>
                        <Euro size={16} color="#4caf50" />
                        {(invoice.montant_ttc || 0).toFixed(2)}
                      </div>
                    </td>
                    <td style={{ padding: '12px', textAlign: 'center' }}>
                      {invoice.status === 'completed' ? (
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          backgroundColor: '#e8f5e9',
                          color: '#4caf50',
                          padding: '4px 12px',
                          borderRadius: '12px',
                          fontSize: '12px',
                          fontWeight: 'bold'
                        }}>
                          <CheckCircle size={14} />
                          Validée
                        </span>
                      ) : (
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          backgroundColor: '#fff3e0',
                          color: '#ff9800',
                          padding: '4px 12px',
                          borderRadius: '12px',
                          fontSize: '12px',
                          fontWeight: 'bold'
                        }}>
                          <AlertCircle size={14} />
                          En cours
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* CSS pour l'animation de rotation */}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .spin {
          animation: spin 1s linear infinite;
        }
      `}</style>
    </div>
  );
};

export default SupabaseInvoicesTab;

