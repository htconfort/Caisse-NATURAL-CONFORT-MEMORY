import React, { useState } from 'react';
// import { useSyncInvoices } from '../hooks/useSyncInvoices'; // Temporairement désactivé
import { useNotifications } from '../hooks/useNotifications';
import { SyncStatus } from './SyncStatus';
import { NotificationCenter } from './NotificationCenter';
import type { Invoice, PaymentDetails } from '@/services/syncService';
import { getVendorColorInfo } from '../utils/vendorColors';
import { getVendorThemeColors } from '../utils/colorUtils';
import '../styles/invoices-elegant.css';

export const InvoicesTabElegant: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<Invoice['status'] | 'all'>('all');
  const [testInvoices, setTestInvoices] = useState<Invoice[]>([]);
  
  const {
    invoices,
    stats,
    loading,
    error,
    syncInvoices
  } = useSyncInvoices();

  const {
    notifications,
    removeNotification
  } = useNotifications();

  // Fonction pour créer des factures de test
  const createTestInvoices = () => {
    console.log('🧪 Début création factures de test...');
    
    try {
      // Créer une facture simple pour tester
      const simpleTestInvoice: Invoice = {
        id: 'test-simple-1',
        number: 'TEST-001',
        vendorName: 'Billy',
        clientName: 'Client Test',
        clientEmail: 'test@email.com',
        status: 'paid',
        items: [{
          id: 'item-1',
          productName: 'Matelas Test',
          category: 'Literie',
          quantity: 1,
          unitPrice: 1000,
          totalPrice: 1000,
          status: 'available'
        }],
        totalHT: 833.33,
        totalTTC: 1000,
        dueDate: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
        paymentDetails: {
          method: 'cash',
          status: 'completed',
          totalAmount: 1000,
          paidAmount: 1000,
          remainingAmount: 0
        }
      };
      
      console.log('� Facture simple créée:', simpleTestInvoice);
      setTestInvoices([simpleTestInvoice]);
      console.log('✅ State mis à jour');
      
    } catch (error) {
      console.error('❌ Erreur lors de la création:', error);
    }
  };

  // Filtrage des factures (inclut les factures de test)
  const getFilteredInvoices = () => {
    let filtered = [...invoices, ...testInvoices];
    
    if (statusFilter !== 'all') {
      filtered = filtered.filter(invoice => invoice.status === statusFilter);
    }
    
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(invoice => 
        invoice.clientName.toLowerCase().includes(query) ||
        invoice.number.toLowerCase().includes(query) ||
        (invoice.vendorName && invoice.vendorName.toLowerCase().includes(query))
      );
    }
    
    return filtered;
  };

  // Calculer le thème de couleur predominant basé sur les factures visibles
  const getThemeColors = () => {
    const filteredInvoices = getFilteredInvoices();
    
    // Compter les vendeurs dans les factures filtrées
    const vendorCounts: { [key: string]: number } = {};
    filteredInvoices.forEach(invoice => {
      if (invoice.vendorName) {
        vendorCounts[invoice.vendorName] = (vendorCounts[invoice.vendorName] || 0) + 1;
      }
    });

    // Trouver le vendeur le plus fréquent
    const predominantVendor = Object.keys(vendorCounts).length > 0 
      ? Object.keys(vendorCounts).reduce((a, b) => vendorCounts[a] > vendorCounts[b] ? a : b)
      : 'Billy'; // Fallback par défaut

    const vendorColors = getVendorColorInfo(predominantVendor);
    return getVendorThemeColors(vendorColors.backgroundColor);
  };

  const filteredInvoices = getFilteredInvoices();
  const themeColors = getThemeColors();

  // Helper pour convertir une couleur hex en rgb pour les variables CSS
  const hexToRgb = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : { r: 59, g: 130, b: 246 }; // Fallback
  };

  const rgbColors = hexToRgb(themeColors.primary);

  // CSS variables pour appliquer le thème dynamiquement
  const themeStyle = {
    '--vendor-primary-color': themeColors.primary,
    '--vendor-secondary-color': themeColors.dark,
    '--vendor-accent-color': themeColors.light,
    '--vendor-text-color': themeColors.text,
    '--vendor-light-color': themeColors.light,
    '--vendor-text-on-light': themeColors.textOnLight,
    '--vendor-text-on-dark': themeColors.textOnDark,
    '--vendor-primary-color-rgb': `${rgbColors.r}, ${rgbColors.g}, ${rgbColors.b}`,
  } as React.CSSProperties;

  // Fonction pour obtenir le badge de statut
  const getStatusBadge = (status: Invoice['status']) => {
    const statusConfig = {
      draft: { color: 'bg-gray-500', label: '📝 Brouillon' },
      sent: { color: 'bg-blue-500', label: '📤 Envoyée' },
      partial: { color: 'bg-orange-500', label: '🔄 Partielle' },
      paid: { color: 'bg-green-500', label: '✅ Payée' },
      cancelled: { color: 'bg-red-500', label: '❌ Annulée' }
    };
    
    const config = statusConfig[status] || statusConfig.draft;
    return (
      <span className={`px-4 py-2 rounded-full text-lg font-bold text-white ${config.color}`}>
        {config.label}
      </span>
    );
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const formatPrice = (price: number | null | undefined) => {
    const validPrice = price && !isNaN(price) ? price : 0;
    return `${validPrice.toFixed(2)}€`;
  };

  // Fonction pour traduire les statuts des items en français
  const translateItemStatus = (status: string) => {
    const translations: { [key: string]: string } = {
      'pending': '⏳ En attente',
      'available': '✅ Disponible', 
      'delivered': '🚚 Livré',
      'cancelled': '❌ Annulé'
    };
    
    return translations[status] || status;
  };

  // Fonction pour traduire les modes de paiement en français
  const translatePaymentMethod = (method: string) => {
    const translations: { [key: string]: string } = {
      'cash': '💵 Espèces',
      'card': '💳 Carte bancaire',
      'check': '📄 Chèque',
      'transfer': '🏦 Virement',
      'multi': '🔄 Paiement multiple',
      'installments': '📅 Échelonné'
    };
    
    return translations[method] || method;
  };

  // Nouvelle fonction pour afficher les détails du règlement
  const renderPaymentDetails = (paymentDetails: PaymentDetails) => {
    const methodName = translatePaymentMethod(paymentDetails.method);
    
    return (
      <div className="payment-details-elegant">
        <div className="payment-method-header-elegant">
          <span className="payment-method-name-elegant">{methodName}</span>
          <span className={`payment-status-badge-elegant ${paymentDetails.status}`}>
            {translatePaymentStatus(paymentDetails.status)}
          </span>
        </div>

        {/* Détails des montants */}
        <div className="payment-amounts-elegant">
          <div className="payment-amount-row-elegant">
            <span className="payment-label-elegant">Montant total :</span>
            <span className="payment-value-elegant">{formatPrice(paymentDetails.totalAmount)}</span>
          </div>
          <div className="payment-amount-row-elegant">
            <span className="payment-label-elegant">Montant payé :</span>
            <span className="payment-value-elegant paid">{formatPrice(paymentDetails.paidAmount)}</span>
          </div>
          {paymentDetails.remainingAmount > 0 && (
            <div className="payment-amount-row-elegant">
              <span className="payment-label-elegant">Reste à payer :</span>
              <span className="payment-value-elegant remaining">{formatPrice(paymentDetails.remainingAmount)}</span>
            </div>
          )}
        </div>

        {/* Détails spécifiques selon le type de paiement */}
        {paymentDetails.method === 'check' && paymentDetails.checkDetails && (
          <div className="check-details-elegant">
            {/* Caractéristiques simplifiées des chèques */}
            {paymentDetails.checkDetails.characteristics && (
              <div className="check-characteristics-elegant">
                <span className="check-characteristics-label-elegant">�</span>
                <span className="check-characteristics-text-elegant">{paymentDetails.checkDetails.characteristics}</span>
              </div>
            )}
          </div>
        )}

        {/* Détails pour les virements/CB - simplifiés */}
        {(paymentDetails.method === 'transfer' || paymentDetails.method === 'card') && paymentDetails.transactionDetails && (
          <div className="transaction-details-elegant">
            {paymentDetails.transactionDetails.reference && (
              <div className="transaction-info-simple">
                <span className="transaction-label-elegant">📋 Réf:</span>
                <span className="transaction-value-elegant">{paymentDetails.transactionDetails.reference}</span>
              </div>
            )}
          </div>
        )}

        {/* Détails pour les paiements échelonnés - simplifiés */}
        {paymentDetails.method === 'installments' && paymentDetails.installments && (
          <div className="installments-details-elegant">
            <div className="installment-info-simple">
              <span className="installment-label-elegant">📅</span>
              <span className="installment-value-elegant">
                {paymentDetails.installments.totalInstallments} échéances de {formatPrice(paymentDetails.installments.installmentAmount)}
              </span>
            </div>
          </div>
        )}

        {/* Notes sur le règlement */}
        {paymentDetails.paymentNotes && (
          <div className="payment-notes-elegant">
            <span className="payment-notes-label-elegant">📝 Notes :</span>
            <span className="payment-notes-text-elegant">{paymentDetails.paymentNotes}</span>
          </div>
        )}
      </div>
    );
  };

  // Fonction pour traduire le statut de paiement
  const translatePaymentStatus = (status: string) => {
    const translations: { [key: string]: string } = {
      'pending': '⏳ En attente',
      'partial': '🔄 Partiel',
      'completed': '✅ Terminé',
      'overdue': '⚠️ En retard'
    };
    
    return translations[status] || status;
  };

  if (loading && invoices.length === 0) {
    return (
      <div className="invoices-tab-elegant" style={themeStyle}>
        <div className="loading-state-elegant">
          <div className="loading-spinner-elegant"></div>
          <p className="loading-text-elegant">
            Chargement des factures...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="invoices-tab-elegant" style={themeStyle}>
      <NotificationCenter 
        notifications={notifications}
        onRemove={removeNotification}
      />        {/* Header avec statistiques */}
        <div className="header-section-elegant">
          <div className="header-top-elegant">
            <h2 className="elegant-title">
              📄 Factures
            </h2>
            <SyncStatus 
              stats={stats}
              onSync={syncInvoices}
              loading={loading}
            />
          </div>

          {/* Statistiques rapides */}
          <div className="stats-grid-elegant">
            <div className="stat-card-elegant pending">
              <div className="stat-value-elegant">{stats.pendingInvoices}</div>
              <div className="stat-label-elegant">En cours</div>
            </div>
            <div className="stat-card-elegant partial">
              <div className="stat-value-elegant">{stats.partialInvoices}</div>
              <div className="stat-label-elegant">Partielles</div>
            </div>
            <div className="stat-card-elegant paid">
              <div className="stat-value-elegant">{stats.totalInvoices - stats.pendingInvoices - stats.partialInvoices}</div>
              <div className="stat-label-elegant">Terminées</div>
            </div>
          </div>
        </div>

        {/* Section des factures */}
        <div className="invoices-section-elegant">
          {/* Filtres et recherche */}
          <div className="invoices-filters-elegant">
            <div className="filter-group-elegant">
              <label className="filter-label-elegant">Recherche</label>
              <input
                type="text"
                placeholder="Rechercher par client, numéro ou produit..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="filter-input-elegant"
              />
            </div>
            <div className="filter-group-elegant">
              <label className="filter-label-elegant">Statut</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as Invoice['status'] | 'all')}
                className="filter-select-elegant"
              >
                <option value="all">Tous les statuts</option>
                <option value="draft">Brouillon</option>
                <option value="sent">Envoyée</option>
                <option value="partial">Partielle</option>
                <option value="paid">Payée</option>
                <option value="cancelled">Annulée</option>
              </select>
            </div>
            
            {/* Bouton pour créer des factures de test */}
            <div className="filter-group-elegant">
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  console.log('🔥 BOUTON CLIQUÉ !');
                  
                  // Créer une facture ultra simple directement
                  const newTestInvoice = {
                    id: `test-${Date.now()}`,
                    number: `TEST-${Date.now()}`,
                    vendorName: 'Billy',
                    clientName: 'Client Test',
                    status: 'paid' as const,
                    items: [],
                    totalHT: 1000,
                    totalTTC: 1200,
                    dueDate: new Date(),
                    createdAt: new Date(),
                    updatedAt: new Date()
                  };
                  
                  console.log('📊 Ajout facture:', newTestInvoice);
                  setTestInvoices(prev => [...prev, newTestInvoice]);
                  console.log('✅ Facture ajoutée !');
                }}
                type="button"
                className="btn-test-elegant"
                style={{
                  background: 'linear-gradient(135deg, #10b981, #059669)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '0.75rem 1rem',
                  fontWeight: '600',
                  cursor: 'pointer',
                  fontSize: '0.9rem',
                  transition: 'all 0.3s ease',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                  zIndex: 1000,
                  position: 'relative'
                }}
              >
                🧪 Ajouter facture test
              </button>
            </div>
          </div>

          {/* Liste des factures */}
          {error && (
            <div className="error-card-elegant">
              <p className="error-message-elegant">
                ⚠️ Erreur: {error}
              </p>
              <button
                onClick={syncInvoices}
                className="btn-link-elegant"
              >
                Réessayer
              </button>
            </div>
          )}

          {filteredInvoices.length === 0 ? (
            <div className="empty-state-elegant">
              <p className="empty-message-elegant">
                {invoices.length === 0 ? 'Aucune facture trouvée' : 'Aucune facture ne correspond aux filtres'}
              </p>
              {invoices.length === 0 && (
                <button
                  onClick={syncInvoices}
                  className="btn-primary-elegant"
                  disabled={loading}
                >
                  🔄 Synchroniser
                </button>
              )}
            </div>
          ) : (
            <div className="invoices-list-elegant">
              {filteredInvoices.map((invoice) => {
                // Récupérer les couleurs de la vendeuse
                const vendorColors = getVendorColorInfo(invoice.vendorName);
                const themeColors = getVendorThemeColors(vendorColors.backgroundColor);
                
                return (
                  <div key={invoice.id} className="invoice-card-elegant">
                    {/* Header coloré PLEIN avec la couleur de la vendeuse */}
                    {invoice.vendorName && (
                      <div 
                        className="vendor-header-elegant"
                        style={{
                          backgroundColor: themeColors.primary,
                          color: themeColors.text,
                          border: 'none'
                        }}
                      >
                        <div className="vendor-info-elegant">
                          <span className="vendor-icon-elegant">👤</span>
                          <span className="vendor-name-elegant">{invoice.vendorName}</span>
                        </div>
                        <span className="invoice-number-elegant">
                          {invoice.number}
                        </span>
                      </div>
                    )}

                    <div className="invoice-content-elegant">
                      {/* Informations client */}
                      <div className="client-info-elegant">
                        <div className="client-details-elegant">
                          <h3 className="client-name-elegant">
                            {invoice.clientName}
                          </h3>
                          {invoice.clientEmail && (
                            <p className="client-contact-elegant">
                              📧 {invoice.clientEmail}
                            </p>
                          )}
                          {invoice.clientPhone && (
                            <p className="client-contact-elegant">
                              📞 {invoice.clientPhone}
                            </p>
                          )}
                        </div>
                        <div className="invoice-summary-elegant">
                          {getStatusBadge(invoice.status)}
                          <p className="invoice-date-elegant">
                            Créée le {formatDate(invoice.createdAt)}
                          </p>
                          <p className="invoice-total-elegant">
                            {formatPrice(invoice.totalTTC)}
                          </p>
                        </div>
                      </div>

                      {/* Tableau des produits avec couleur du vendeur */}
                      <div className="products-section-elegant">
                        <h4 
                          className="products-title-elegant"
                          style={{ color: themeColors.primary }}
                        >
                          📦 Produits ({invoice.items.length})
                        </h4>
                        <div className="products-table-container-elegant">
                          <table className="products-table-elegant">
                            <thead>
                              <tr>
                                <th 
                                  className="product-col-elegant"
                                  style={{ 
                                    borderLeftColor: themeColors.primary,
                                    color: '#000000' // Force le noir pour la lisibilité
                                  }}
                                >
                                  Produit
                                </th>
                                <th 
                                  className="quantity-col-elegant"
                                  style={{ color: '#000000' }} // Force le noir
                                >
                                  Quantité
                                </th>
                                <th 
                                  className="price-col-elegant"
                                  style={{ color: '#000000' }} // Force le noir
                                >
                                  Prix
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              {invoice.items.map((item) => (
                                <tr key={item.id} className="product-row-elegant">
                                  <td className="product-cell-elegant">
                                    <div className="product-name-wrapper-elegant">
                                      <span className="product-name-elegant">
                                        {item.productName}
                                      </span>
                                      <div className="product-badges-elegant">
                                        <span 
                                          className="status-badge-small-elegant"
                                          style={{ 
                                            backgroundColor: themeColors.primary, 
                                            color: themeColors.text 
                                          }}
                                        >
                                          {translateItemStatus(item.status)}
                                        </span>
                                        {item.discountPercentage && item.discountPercentage > 0 && (
                                          <span 
                                            className="discount-badge-small-elegant"
                                            style={{ 
                                              backgroundColor: themeColors.dark, 
                                              color: themeColors.textOnDark 
                                            }}
                                          >
                                            -{item.discountPercentage}%
                                          </span>
                                        )}
                                      </div>
                                      <span className="product-category-elegant">
                                        📂 {item.category}
                                      </span>
                                    </div>
                                  </td>
                                  <td className="quantity-cell-elegant">
                                    <span className="quantity-value-elegant">
                                      {item.quantity}
                                    </span>
                                  </td>
                                  <td className="price-cell-elegant">
                                    {item.originalPrice && item.originalPrice !== item.unitPrice ? (
                                      <div className="price-wrapper-elegant">
                                        <span className="original-price-elegant">
                                          {formatPrice(item.originalPrice)}
                                        </span>
                                        <span className="current-price-elegant">
                                          {formatPrice(item.unitPrice)}
                                        </span>
                                      </div>
                                    ) : (
                                      <span className="current-price-elegant">
                                        {formatPrice(item.unitPrice)}
                                      </span>
                                    )}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {/* Mode de règlement détaillé avec couleur du vendeur */}
                      {invoice.paymentDetails?.method && (
                        <div className="payment-section-elegant">
                          <h4 
                            className="payment-title-elegant"
                            style={{ color: themeColors.primary }}
                          >
                            💳 Mode de règlement
                          </h4>
                          <div 
                            className="payment-details-vendor-themed"
                            style={{ 
                              '--vendor-color': themeColors.primary, 
                              '--vendor-text-color': themeColors.text,
                              '--vendor-light-color': themeColors.light,
                              '--vendor-text-on-light': themeColors.textOnLight
                            } as React.CSSProperties}
                          >
                            {renderPaymentDetails(invoice.paymentDetails)}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
    </div>
  );
};
