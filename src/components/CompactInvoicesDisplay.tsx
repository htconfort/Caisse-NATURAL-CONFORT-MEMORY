/**
 * Composant d'affichage compact des factures (externes + internes)
 * Design optimisé tablette avec lignes compactes
 * Version: 3.8.1 - MyConfort
 */

import React, { useState, useMemo } from 'react';
import { useExternalInvoices } from '../hooks/useExternalInvoices';
import { Sale, InvoicePayload } from '../types';
import '../styles/invoices-compact.css';

// Garde global de prod (déclarations)
declare global {
  interface Window {
    PRODUCTION_MODE?: boolean;
    DISABLE_ALL_DEMO_DATA?: boolean;
    FORCE_EMPTY_INVOICES?: boolean;
  }
}

interface CompactInvoicesDisplayProps {
  internalInvoices?: Sale[];  // Factures internes de l'app
  showExternalOnly?: boolean;
  showInternalOnly?: boolean;
  onInvoiceClick?: (invoice: UnifiedInvoice) => void;
  className?: string;
}

interface UnifiedInvoice {
  id: string;
  number: string;
  client: {
    name: string;
    email?: string;
    phone?: string;
  };
  date: string;
  products: {
    count: number;
    firstProduct: string;
  };
  status: 'paid' | 'unpaid' | 'pending' | 'sent' | 'delivered' | 'external';
  amount: number;
  type: 'internal' | 'external';
  originalData: Sale | InvoicePayload;
}

// Normalisation sûre des dates venant de sources hétérogènes
function toSafeDate(input: unknown): Date {
  if (input instanceof Date) return input;
  if (typeof input === 'number') return new Date(input);
  if (typeof input === 'string') {
    const d = new Date(input);
    return isNaN(d.getTime()) ? new Date() : d;
  }
  return new Date();
}

const CompactInvoicesDisplay: React.FC<CompactInvoicesDisplayProps> = ({
  internalInvoices = [],
  showExternalOnly = false,
  showInternalOnly = false,
  onInvoiceClick,
  className = ''
}) => {
  const {
    invoices: externalInvoices,
    isLoading,
    error,
    syncWithAPI
  } = useExternalInvoices();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [periodFilter, setPeriodFilter] = useState('');

  // Ne pas masquer les factures externes en production
  const productionGuard = false;

  // Unification des factures internes et externes
  const unifiedInvoices: UnifiedInvoice[] = useMemo(() => {
    const unified: UnifiedInvoice[] = [];

    // productionGuard désactivé: on affiche externes + internes suivant les options

    // Ajouter les factures externes
    if (!showInternalOnly) {
      externalInvoices.forEach(invoice => {
        unified.push({
          id: invoice.idempotencyKey,
          number: invoice.invoiceNumber,
          client: {
            name: invoice.client.name,
            email: invoice.client.email,
            phone: invoice.client.phone
          },
          date: invoice.invoiceDate,
          products: {
            count: invoice.items.length,
            firstProduct: invoice.items[0]?.name || 'Aucun produit'
          },
          status: invoice.payment?.paid ? 'paid' : 'external',
          amount: invoice.totals.ttc,
          type: 'external',
          originalData: invoice
        });
      });
    }

    // Ajouter les factures internes
    if (!showExternalOnly) {
      internalInvoices.forEach(sale => {
        const d = toSafeDate(sale.date);
        unified.push({
          id: sale.id,
          number: sale.id.substring(0, 8), // Tronquer l'ID pour affichage
          client: {
            name: sale.vendorName || 'Client interne',
            email: '',
            phone: ''
          },
          date: d.toISOString(),
          products: {
            count: sale.items.length,
            firstProduct: sale.items[0]?.name || 'Aucun produit'
          },
          status: sale.canceled ? 'unpaid' : 'paid',
          amount: sale.totalAmount,
          type: 'internal',
          originalData: sale
        });
      });
    }

    return unified.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [externalInvoices, internalInvoices, showExternalOnly, showInternalOnly, productionGuard]);

  // Filtrage
  const filteredInvoices = useMemo(() => {
    return unifiedInvoices.filter(invoice => {
      // Filtre de recherche
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        const matchesNumber = invoice.number.toLowerCase().includes(searchLower);
        const matchesClient = invoice.client.name.toLowerCase().includes(searchLower);
        const matchesEmail = invoice.client.email?.toLowerCase().includes(searchLower);
        
        if (!matchesNumber && !matchesClient && !matchesEmail) {
          return false;
        }
      }

      // Filtre de statut
      if (statusFilter && invoice.status !== statusFilter) {
        return false;
      }

      // Filtre de période
      if (periodFilter) {
        const invoiceDate = new Date(invoice.date);
        const now = new Date();
        
        if (periodFilter === '30days') {
          const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          if (invoiceDate < thirtyDaysAgo) return false;
        } else if (periodFilter === 'thismonth') {
          if (invoiceDate.getMonth() !== now.getMonth() || 
              invoiceDate.getFullYear() !== now.getFullYear()) {
            return false;
          }
        }
      }

      return true;
    });
  }, [unifiedInvoices, searchTerm, statusFilter, periodFilter]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount);
  };

  const getStatusBadge = (status: string, type: string) => {
    if (type === 'external') {
      return <span className="badge external">Externe</span>;
    }
    
    const badges = {
      paid: <span className="badge paid">Payée</span>,
      unpaid: <span className="badge unpaid">Non payée</span>,
      pending: <span className="badge pending">En attente</span>,
      sent: <span className="badge sent">Envoyée</span>,
      delivered: <span className="badge delivered">Livrée</span>
    };
    
    return badges[status as keyof typeof badges] || <span className="badge pending">Inconnue</span>;
  };

  const handleInvoiceClick = (invoice: UnifiedInvoice) => {
    if (onInvoiceClick) {
      onInvoiceClick(invoice);
    }
  };

  // Calcul des statistiques globales
  const globalStats = useMemo(() => {
    const total = filteredInvoices.length;
    const totalAmount = filteredInvoices.reduce((sum, inv) => sum + inv.amount, 0);
    const paidCount = filteredInvoices.filter(inv => inv.status === 'paid').length;
    const externalCount = filteredInvoices.filter(inv => inv.type === 'external').length;
    
    return { total, totalAmount, paidCount, externalCount };
  }, [filteredInvoices]);

  if (error) {
    return (
      <div className={`invoices-wrap ${className}`}>
        <div style={{
          padding: '2rem',
          background: '#fee',
          border: '1px solid #f88',
          borderRadius: '8px',
          color: '#c33',
          textAlign: 'center'
        }}>
          <strong>❌ Erreur:</strong> {error}
        </div>
      </div>
    );
  }

  return (
    <div className={`invoices-wrap ${className}`}>
      {/* Statistiques rapides */}
      <div className="invoices-stats">
        <div className="stat-card">
          <span className="value">{globalStats.total}</span>
          <span className="label">Total factures</span>
        </div>
        <div className="stat-card">
          <span className="value">{formatCurrency(globalStats.totalAmount)}</span>
          <span className="label">Montant total</span>
        </div>
        <div className="stat-card">
          <span className="value">{globalStats.paidCount}</span>
          <span className="label">Payées</span>
        </div>
        <div className="stat-card">
          <span className="value">{globalStats.externalCount}</span>
          <span className="label">Externes</span>
        </div>
      </div>

      {/* Barre d'outils */}
      <div className="invoices-toolbar">
        <div className="filters">
          <input
            className="input"
            placeholder="Rechercher (client / N°)"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <select
            className="select"
            value={periodFilter}
            onChange={(e) => setPeriodFilter(e.target.value)}
          >
            <option value="">Période</option>
            <option value="30days">30 jours</option>
            <option value="thismonth">Ce mois</option>
          </select>
          <select
            className="select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">Statut</option>
            <option value="paid">Payée</option>
            <option value="unpaid">Non payée</option>
            <option value="pending">En attente</option>
            <option value="external">Externe</option>
          </select>
        </div>
        
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <button
            onClick={syncWithAPI}
            disabled={isLoading || productionGuard}
            style={{
              padding: '6px 12px',
              border: 'none',
              borderRadius: '8px',
              background: isLoading || productionGuard ? '#ccc' : 'var(--brand)',
              color: 'white',
              cursor: isLoading || productionGuard ? 'not-allowed' : 'pointer',
              fontSize: '12px'
            }}
          >
            {isLoading ? '🔄 Sync...' : (productionGuard ? '🔒 Sync désactivée' : '🔄 Sync')}
          </button>
          
          <span className="counter">
            Factures: {filteredInvoices.length}
          </span>
        </div>
      </div>

      {/* Liste des factures */}
      <div className="invoices">
        <div className="invoices-head">
          <div>N°</div>
          <div>Client</div>
          <div>Date</div>
          <div>Produits</div>
          <div>Statut / Montant</div>
          <div></div>
        </div>

        {filteredInvoices.length === 0 ? (
          <div className="empty">
            <span className="emoji">📭</span>
            <div className="title">Aucune facture</div>
            <div className="description">
              {searchTerm || statusFilter || periodFilter
                ? 'Aucune facture ne correspond aux filtres sélectionnés'
                : 'Aucune facture disponible pour le moment'
              }
            </div>
          </div>
        ) : (
          filteredInvoices.map((invoice) => (
            <div
              key={invoice.id}
              className="invoice-row"
              onClick={() => handleInvoiceClick(invoice)}
            >
              <div className="inv-id">{invoice.number}</div>

              <div className="inv-client">
                <div className="name">{invoice.client.name}</div>
                <div className="sub">
                  {[invoice.client.email, invoice.client.phone]
                    .filter(Boolean)
                    .join(' · ') || 'Pas de contact'
                  }
                </div>
              </div>

              <div className="inv-date">
                {formatDate(invoice.date)}
                <span className="sub">
                  {invoice.type === 'external' ? 'Externe' : 'Interne'}
                </span>
              </div>

              <div className="inv-products">
                {invoice.products.count} article{invoice.products.count > 1 ? 's' : ''}
                <span className="sub">{invoice.products.firstProduct}</span>
              </div>

              <div className="inv-status">
                {getStatusBadge(invoice.status, invoice.type)}
                <div className="inv-amount">
                  <span className="ttc">{formatCurrency(invoice.amount)}</span>
                  <span className="label">TTC</span>
                </div>
              </div>

              <div className="inv-open">›</div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default CompactInvoicesDisplay;
