/**
 * Composant d'affichage des factures externes
 * Intégration élégante dans l'interface MyConfort
 * Version: 3.8.1
 */

import React, { useState } from 'react';
import { useExternalInvoices } from '../hooks/useExternalInvoices';
import type { InvoicePayload } from '../types';

interface ExternalInvoicesDisplayProps {
  showTodayOnly?: boolean;
  showStats?: boolean;
  maxHeight?: string;
  className?: string;
}

const ExternalInvoicesDisplay: React.FC<ExternalInvoicesDisplayProps> = ({
  showTodayOnly = false,
  showStats = true,
  maxHeight = '400px',
  className = ''
}) => {
  const {
    invoices,
    stats,
    isLoading,
    error,
    syncWithAPI,
    removeInvoice,
    getTodayInvoices
  } = useExternalInvoices();

  const [expandedInvoice, setExpandedInvoice] = useState<string | null>(null);

  // Filtrer les factures selon le mode d'affichage
  const displayedInvoices = showTodayOnly ? getTodayInvoices() : invoices;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusIcon = (invoice: InvoicePayload) => {
    const status = invoice.payment?.paid ? 'paid' : 'pending';
    switch (status) {
      case 'paid':
        return '✅';
      case 'pending':
        return '⏳';
      default:
        return '📄';
    }
  };

  const getStatusLabel = (invoice: InvoicePayload) => {
    const status = invoice.payment?.paid ? 'paid' : 'pending';
    switch (status) {
      case 'paid':
        return 'Payée';
      case 'pending':
        return 'En attente';
      default:
        return 'Inconnue';
    }
  };

  const getStatusColor = (invoice: InvoicePayload) => {
    const status = invoice.payment?.paid ? 'paid' : 'pending';
    switch (status) {
      case 'paid':
        return { background: '#d4edda', color: '#155724' };
      case 'pending':
        return { background: '#fff3cd', color: '#856404' };
      default:
        return { background: '#e9ecef', color: '#495057' };
    }
  };

  const handleRemoveInvoice = async (invoiceNumber: string) => {
    if (window.confirm(`Êtes-vous sûr de vouloir supprimer la facture ${invoiceNumber} ?`)) {
      await removeInvoice(invoiceNumber);
    }
  };

  const toggleInvoiceDetails = (invoiceNumber: string) => {
    setExpandedInvoice(expandedInvoice === invoiceNumber ? null : invoiceNumber);
  };

  if (error) {
    return (
      <div className={`external-invoices-error ${className}`}>
        <div style={{
          padding: '1rem',
          background: '#fee',
          border: '1px solid #f88',
          borderRadius: '8px',
          color: '#c33'
        }}>
          <strong>❌ Erreur:</strong> {error}
        </div>
      </div>
    );
  }

  return (
    <div className={`external-invoices-display ${className}`}>
      {/* En-tête avec statistiques */}
      {showStats && (
        <div style={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
          padding: '1rem',
          borderRadius: '8px 8px 0 0',
          marginBottom: '1rem'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '0.5rem'
          }}>
            <h3 style={{ margin: 0, fontSize: '1.2rem' }}>
              📊 Factures Externes {showTodayOnly ? '(Aujourd\'hui)' : ''}
            </h3>
            <button
              onClick={() => syncWithAPI(true)}
              disabled={isLoading}
              style={{
                background: 'rgba(255,255,255,0.2)',
                border: 'none',
                color: 'white',
                padding: '0.5rem 1rem',
                borderRadius: '4px',
                cursor: isLoading ? 'not-allowed' : 'pointer',
                fontSize: '0.9rem'
              }}
            >
              {isLoading ? '🔄 Sync...' : '🔄 Synchroniser'}
            </button>
          </div>
          
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
            gap: '1rem',
            fontSize: '0.9rem'
          }}>
            <div>
              <div>📄 Total: <strong>{showTodayOnly ? stats.today : stats.total}</strong></div>
              <div>💰 Montant: <strong>{formatCurrency(showTodayOnly ? stats.todayAmount : stats.totalAmount)}</strong></div>
            </div>
            {!showTodayOnly && (
              <div>
                <div>🌅 Aujourd'hui: <strong>{stats.today}</strong></div>
                <div>💵 CA Jour: <strong>{formatCurrency(stats.todayAmount)}</strong></div>
              </div>
            )}
            <div>
              <div>✅ Payées: <strong>{stats.paidCount}</strong></div>
              <div>⏳ En attente: <strong>{stats.pendingCount}</strong></div>
            </div>
          </div>
        </div>
      )}

      {/* Liste des factures */}
      <div style={{
        maxHeight,
        overflowY: 'auto',
        border: '1px solid #ddd',
        borderRadius: showStats ? '0 0 8px 8px' : '8px'
      }}>
        {displayedInvoices.length === 0 ? (
          <div style={{
            padding: '2rem',
            textAlign: 'center',
            color: '#666'
          }}>
            {isLoading ? (
              <div>🔄 Chargement des factures...</div>
            ) : (
              <div>
                📭 Aucune facture externe {showTodayOnly ? 'aujourd\'hui' : 'disponible'}
              </div>
            )}
          </div>
        ) : (
          displayedInvoices.map((invoice, idx) => (
            <div
              key={`${invoice.idempotencyKey || invoice.invoiceNumber || 'inv'}-${idx}`}
              style={{
                borderBottom: '1px solid #eee',
                background: expandedInvoice === invoice.invoiceNumber ? '#f9f9f9' : 'white'
              }}
            >
              {/* En-tête de la facture */}
              <div
                onClick={() => toggleInvoiceDetails(invoice.invoiceNumber)}
                style={{
                  padding: '1rem',
                  cursor: 'pointer',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  transition: 'background-color 0.2s'
                }}
              >
                <div style={{ flex: 1 }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    marginBottom: '0.25rem'
                  }}>
                    <span style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>
                      📋 {invoice.invoiceNumber}
                    </span>
                    <span>{getStatusIcon(invoice)}</span>
                    <span style={{
                      fontSize: '0.8rem',
                      padding: '0.2rem 0.5rem',
                      borderRadius: '12px',
                      ...getStatusColor(invoice)
                    }}>
                      {getStatusLabel(invoice)}
                    </span>
                  </div>
                  
                  <div style={{
                    display: 'flex',
                    gap: '1rem',
                    fontSize: '0.9rem',
                    color: '#666'
                  }}>
                    <span>👤 {invoice.client?.name || 'Client'}</span>
                    <span>💰 {formatCurrency(invoice.totals?.ttc || 0)}</span>
                    <span>📅 {formatDate(invoice.invoiceDate || new Date().toISOString())}</span>
                  </div>
                </div>
                
                <div style={{
                  display: 'flex',
                  gap: '0.5rem',
                  alignItems: 'center'
                }}>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveInvoice(invoice.invoiceNumber);
                    }}
                    style={{
                      background: '#dc3545',
                      color: 'white',
                      border: 'none',
                      padding: '0.25rem 0.5rem',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '0.8rem'
                    }}
                  >
                    🗑️
                  </button>
                  <span style={{ fontSize: '0.8rem', color: '#999' }}>
                    {expandedInvoice === invoice.invoiceNumber ? '▼' : '▶'}
                  </span>
                </div>
              </div>

              {/* Détails de la facture */}
              {expandedInvoice === invoice.invoiceNumber && (
                <div style={{
                  padding: '0 1rem 1rem 1rem',
                  background: '#f9f9f9',
                  borderTop: '1px solid #eee'
                }}>
                  {/* Informations client */}
                  <div style={{ marginBottom: '1rem' }}>
                    <h4 style={{ margin: '0 0 0.5rem 0', color: '#333' }}>👤 Client</h4>
                    <div style={{ fontSize: '0.9rem', color: '#666' }}>
                      <div><strong>Nom:</strong> {invoice.client.name}</div>
                      {invoice.client.email && <div><strong>Email:</strong> {invoice.client.email}</div>}
                      {invoice.client.phone && <div><strong>Téléphone:</strong> {invoice.client.phone}</div>}
                      {invoice.client.address && <div><strong>Adresse:</strong> {invoice.client.address}</div>}
                    </div>
                  </div>

                  {/* Articles */}
                  <div style={{ marginBottom: '1rem' }}>
                    <h4 style={{ margin: '0 0 0.5rem 0', color: '#333' }}>🛍️ Articles ({invoice.items?.length || 0})</h4>
                    <div style={{
                      maxHeight: '200px',
                      overflowY: 'auto',
                      border: '1px solid #ddd',
                      borderRadius: '4px'
                    }}>
                      {invoice.items?.map((item, index) => (
                        <div
                          key={index}
                          style={{
                            padding: '0.5rem',
                            borderBottom: index < invoice.items.length - 1 ? '1px solid #eee' : 'none',
                            display: 'flex',
                            justifyContent: 'space-between',
                            fontSize: '0.9rem'
                          }}
                        >
                          <div>
                            <div><strong>{item.name}</strong></div>
                            {item.sku && (
                              <div style={{ color: '#666', fontSize: '0.8rem' }}>
                                SKU: {item.sku}
                              </div>
                            )}
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <div>{item.qty} x {formatCurrency(item.unitPriceHT * (1 + item.tvaRate))}</div>
                            <div style={{ fontWeight: 'bold' }}>
                              {formatCurrency(item.qty * item.unitPriceHT * (1 + item.tvaRate))}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Métadonnées */}
                  <div style={{ fontSize: '0.8rem', color: '#999' }}>
                    <div><strong>Source:</strong> {invoice.channels?.source || 'Non spécifiée'}</div>
                    <div><strong>Via:</strong> {invoice.channels?.via || 'Direct'}</div>
                    <div><strong>Date facture:</strong> {formatDate(invoice.invoiceDate)}</div>
                    <div><strong>Clé idempotence:</strong> {invoice.idempotencyKey}</div>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default ExternalInvoicesDisplay;
