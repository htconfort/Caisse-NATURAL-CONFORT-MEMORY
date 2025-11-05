import { COMPANY_BANK } from '@/config/company';
import type { Invoice, InvoiceItem, PaymentDetails } from '@/services/syncService';
import React from 'react';
import { getVendorColorInfo, getVendorHeaderStyles } from '../utils/vendorColors';

interface InvoiceCardProps {
  invoice: Invoice;
  onStatusChange?: (invoiceId: string, itemId: string, newStatus: InvoiceItem['status']) => void;
}

export const InvoiceCard: React.FC<InvoiceCardProps> = ({ invoice }) => {
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

  const getPaymentMethodIcon = (method: PaymentDetails['method']) => {
    const icons = {
      cash: '💰',
      card: '💳',
      check: '📝',
      transfer: '🏦',
      installments: '📅',
      multi: '🔄'
    };
    return icons[method] || '💰';
  };

  const getPaymentMethodLabel = (method: PaymentDetails['method']) => {
    const labels = {
      cash: 'Espèces',
      card: 'Carte bancaire',
      check: 'Chèque(s)',
      transfer: 'Virement',
      installments: 'Échelonnement',
      multi: 'Paiement multiple'
    };
    return labels[method] || 'Non spécifié';
  };

  const getPaymentStatusBadge = (status: PaymentDetails['status']) => {
    const statusConfig = {
      pending: { color: 'bg-gray-500', label: '⏳ En attente' },
      partial: { color: 'bg-orange-500', label: '🔄 Partiel' },
      completed: { color: 'bg-green-500', label: '✅ Payé' },
      overdue: { color: 'bg-red-500', label: '⚠️ En retard' }
    };
    
    const config = statusConfig[status] || statusConfig.pending;
    return (
      <span className={`px-4 py-2 rounded-full text-lg font-bold text-white ${config.color}`}>
        {config.label}
      </span>
    );
  };

  const getItemStatusIcon = (status: InvoiceItem['status']) => {
    const icons = {
      pending: '⏳',
      available: '✅',
      delivered: '📦',
      cancelled: '❌'
    };
    return icons[status] || '⏳';
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

  // Récupérer les couleurs de la vendeuse pour les bordures
  const vendorColors = getVendorColorInfo(invoice.vendorName);

  return (
    <div 
      className="rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 mb-6 overflow-hidden"
      style={{ 
        backgroundColor: '#ffffff', 
        border: `4px solid ${vendorColors.backgroundColor}` 
      }}
    >
      {/* En-tête coloré avec nom de la vendeuse */}
      {invoice.vendorName && (
        <div 
          className="vendor-header"
          style={{
            ...getVendorHeaderStyles(invoice.vendorName),
            borderBottom: '3px solid #000000'
          }}
        >
          <div className="flex items-center justify-between">
            <span style={{ 
              fontSize: '28px', 
              fontWeight: 'bold', 
              color: vendorColors.textColor,
              textShadow: vendorColors.textColor === '#ffffff' 
                ? '1px 1px 2px rgba(0,0,0,0.8)' 
                : '1px 1px 2px rgba(255,255,255,0.8)'
            }}>
              👤 {invoice.vendorName}
            </span>
            <span style={{ 
              fontSize: '24px', 
              fontWeight: 'bold', 
              color: vendorColors.textColor,
              textShadow: vendorColors.textColor === '#ffffff' 
                ? '1px 1px 2px rgba(0,0,0,0.8)' 
                : '1px 1px 2px rgba(255,255,255,0.8)'
            }}>
              {invoice.number}
            </span>
          </div>
        </div>
      )}

      <div className="p-6" style={{ backgroundColor: 'rgba(255,255,255,0.95)' }}>
        {/* Informations client */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <h3 style={{ fontSize: '32px', fontWeight: 'bold', marginBottom: '8px', color: '#000000' }}>
              {invoice.clientName}
            </h3>
            {invoice.clientEmail && (
              <p style={{ fontSize: '20px', color: '#000000', marginBottom: '4px', fontWeight: 'bold' }}>
                📧 {invoice.clientEmail}
              </p>
            )}
            {invoice.clientPhone && (
              <p style={{ fontSize: '20px', color: '#000000', fontWeight: 'bold' }}>
                📞 {invoice.clientPhone}
              </p>
            )}
          </div>
          <div className="text-right">
            {getStatusBadge(invoice.status)}
            <p style={{ fontSize: '18px', marginTop: '8px', color: '#000000', fontWeight: 'bold' }}>
              Créée le {formatDate(invoice.createdAt)}
            </p>
            <p style={{ fontSize: '36px', fontWeight: 'bold', color: '#000000', marginTop: '8px' }}>
              {formatPrice(invoice.totalTTC)}
            </p>
          </div>
        </div>

        {/* Liste des produits */}
        <div className="products-section">
          <h4 className="products-title">
            📦 Produits ({invoice.items.length})
          </h4>
          <div className="products-list">
            {invoice.items.map((item) => (
              <div key={item.id} className="product-item" 
                   style={{ borderColor: vendorColors.backgroundColor }}>
                <div className="product-details">
                  <div className="product-header">
                    <span className="product-status-icon">
                      {getItemStatusIcon(item.status)}
                    </span>
                    <span className="product-name">
                      {item.productName}
                    </span>
                    <span className="status-badge">
                      {item.status}
                    </span>
                    {/* Badge de remise si applicable */}
                    {item.discountPercentage && item.discountPercentage > 0 && (
                      <span className="discount-badge">
                        -{item.discountPercentage}%
                      </span>
                    )}
                  </div>
                  <div className="product-info">
                    <span>📂 {item.category}</span>
                    <span>📊 Qté: {item.quantity}</span>
                    {/* Affichage du prix avec remise */}
                    {item.originalPrice && item.originalPrice !== item.unitPrice ? (
                      <span>
                        💰 <span className="original-price">
                          {formatPrice(item.originalPrice)}
                        </span> → {formatPrice(item.unitPrice)}
                      </span>
                    ) : (
                      <span>💰 {formatPrice(item.unitPrice)}</span>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  {/* Prix total avec calcul de remise visible */}
                  {item.discountAmount && item.discountAmount > 0 ? (
                    <div>
                      <p style={{ fontSize: '18px', color: '#999999', textDecoration: 'line-through' }}>
                        {formatPrice((item.originalPrice || item.unitPrice) * item.quantity)}
                      </p>
                      <p style={{ fontSize: '16px', color: '#F55D3E', fontWeight: 'bold' }}>
                        Remise: -{formatPrice(item.discountAmount)}
                      </p>
                      <p style={{ fontSize: '26px', fontWeight: 'bold', color: '#000000' }}>
                        {formatPrice(item.totalPrice)}
                      </p>
                    </div>
                  ) : (
                    <p style={{ fontSize: '26px', fontWeight: 'bold', color: '#000000' }}>
                      {formatPrice(item.totalPrice)}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Détails du règlement */}
        {invoice.paymentDetails && (
          <div className="p-4 rounded-lg border-2" 
               style={{ backgroundColor: 'rgba(255, 255, 255, 0.95)', borderColor: '#000000' }}>
            <h4 style={{ fontSize: '28px', fontWeight: 'bold', marginBottom: '16px', color: '#000000' }}>
              💳 Détails du règlement
            </h4>

            {/* Informations de base */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <p style={{ fontSize: '20px', marginBottom: '8px', color: '#000000', fontWeight: 'bold' }}>
                  <strong>Mode de paiement:</strong> {getPaymentMethodIcon(invoice.paymentDetails.method)} {getPaymentMethodLabel(invoice.paymentDetails.method)}
                </p>
                <p style={{ fontSize: '20px', marginBottom: '8px', color: '#000000', fontWeight: 'bold' }}>
                  <strong>Statut:</strong> {getPaymentStatusBadge(invoice.paymentDetails.status)}
                </p>
              </div>
              <div>
                <p style={{ fontSize: '20px', marginBottom: '8px', color: '#000000', fontWeight: 'bold' }}>
                  <strong>Total:</strong> <span style={{ fontSize: '24px', fontWeight: 'bold' }}>
                    {formatPrice(invoice.paymentDetails.totalAmount || invoice.totalTTC)}
                  </span>
                </p>
                <p style={{ fontSize: '20px', marginBottom: '8px', color: '#000000', fontWeight: 'bold' }}>
                  <strong>Payé:</strong> <span style={{ fontSize: '24px', fontWeight: 'bold', color: '#000000' }}>
                    {formatPrice(invoice.paymentDetails.paidAmount || 0)}
                  </span>
                </p>
                <p style={{ fontSize: '20px', marginBottom: '8px', color: '#000000', fontWeight: 'bold' }}>
                  <strong>Restant:</strong> <span style={{ fontSize: '24px', fontWeight: 'bold', color: '#000000' }}>
                    {formatPrice(invoice.paymentDetails.remainingAmount || (invoice.paymentDetails.totalAmount || invoice.totalTTC) - (invoice.paymentDetails.paidAmount || 0))}
                  </span>
                </p>
              </div>
            </div>

            {/* Détails spécifiques aux chèques */}
            {invoice.paymentDetails.checkDetails && (
              <div className="p-3 rounded-lg border-2 mb-4" 
                   style={{ backgroundColor: 'rgba(255, 255, 255, 0.95)', borderColor: '#000000' }}>
                <h5 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '12px', color: '#000000' }}>
                  📝 Détails des chèques
                </h5>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p style={{ fontSize: '20px', marginBottom: '4px', color: '#000000', fontWeight: 'bold' }}>
                      <strong>Total chèques:</strong> {invoice.paymentDetails.checkDetails.totalChecks}
                    </p>
                    <p style={{ fontSize: '20px', marginBottom: '4px', color: '#000000', fontWeight: 'bold' }}>
                      <strong>Reçus:</strong> {invoice.paymentDetails.checkDetails.checksReceived}
                    </p>
                    <p style={{ fontSize: '20px', marginBottom: '4px', color: '#000000', fontWeight: 'bold' }}>
                      <strong>À venir:</strong> {invoice.paymentDetails.checkDetails.checksRemaining}
                    </p>
                  </div>
                  <div>
                    {invoice.paymentDetails.checkDetails.nextCheckDate && (
                      <p style={{ fontSize: '20px', marginBottom: '4px', color: '#000000', fontWeight: 'bold' }}>
                        <strong>Prochain chèque:</strong> {formatDate(invoice.paymentDetails.checkDetails.nextCheckDate)}
                      </p>
                    )}
                  </div>
                </div>
                {invoice.paymentDetails.checkDetails.characteristics && (
                  <p style={{ fontSize: '20px', marginTop: '8px', fontStyle: 'italic', color: '#000000', fontWeight: 'bold' }}>
                    <strong>Caractéristiques:</strong> {invoice.paymentDetails.checkDetails.characteristics}
                  </p>
                )}
              </div>
            )}

            {/* Détails des transactions électroniques / Virement */}
            {invoice.paymentDetails.method === 'transfer' && (
              <div className="p-3 rounded-lg border-2 mb-4" 
                   style={{ backgroundColor: 'rgba(255, 255, 255, 0.95)', borderColor: '#000000' }}>
                <h5 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '12px', color: '#000000' }}>
                  🏦 Coordonnées virement (MyConfort)
                </h5>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p style={{ fontSize: '20px', marginBottom: '4px', color: '#000000', fontWeight: 'bold' }}>
                      <strong>IBAN:</strong> {COMPANY_BANK.iban}
                    </p>
                    <p style={{ fontSize: '20px', marginBottom: '4px', color: '#000000', fontWeight: 'bold' }}>
                      <strong>BIC:</strong> {COMPANY_BANK.bic}
                    </p>
                  </div>
                  <div>
                    <p style={{ fontSize: '20px', marginBottom: '4px', color: '#000000', fontWeight: 'bold' }}>
                      <strong>Banque:</strong> {COMPANY_BANK.bankName}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Détails des paiements échelonnés */}
            {invoice.paymentDetails.installments && (
              <div className="p-3 rounded-lg border-2 mb-4" 
                   style={{ backgroundColor: 'rgba(255, 255, 255, 0.95)', borderColor: '#000000' }}>
                <h5 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '12px', color: '#000000' }}>
                  📅 Paiement échelonné
                </h5>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p style={{ fontSize: '20px', marginBottom: '4px', color: '#000000', fontWeight: 'bold' }}>
                      <strong>Total échéances:</strong> {invoice.paymentDetails.installments.totalInstallments}
                    </p>
                    <p style={{ fontSize: '20px', marginBottom: '4px', color: '#000000', fontWeight: 'bold' }}>
                      <strong>Payées:</strong> {invoice.paymentDetails.installments.completedInstallments}
                    </p>
                    <p style={{ fontSize: '20px', marginBottom: '4px', color: '#000000', fontWeight: 'bold' }}>
                      <strong>Montant échéance:</strong> {formatPrice(invoice.paymentDetails.installments.installmentAmount)}
                    </p>
                  </div>
                  <div>
                    {invoice.paymentDetails.installments.nextPaymentDate && (
                      <p style={{ fontSize: '20px', marginBottom: '4px', color: '#000000', fontWeight: 'bold' }}>
                        <strong>Prochaine échéance:</strong> {formatDate(invoice.paymentDetails.installments.nextPaymentDate)}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Notes de règlement */}
            {invoice.paymentDetails.paymentNotes && (
              <div className="p-3 rounded-lg border-2" 
                   style={{ backgroundColor: 'rgba(255, 255, 255, 0.95)', borderColor: '#000000' }}>
                <h5 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '8px', color: '#000000' }}>
                  📝 Notes de règlement
                </h5>
                <p style={{ fontSize: '20px', fontStyle: 'italic', color: '#000000', fontWeight: 'bold' }}>
                  {invoice.paymentDetails.paymentNotes}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Informations supplémentaires */}
        <div className="mt-6 pt-4 border-t-2" style={{ borderColor: vendorColors.backgroundColor }}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4" style={{ fontSize: '18px', color: '#000000', fontWeight: 'bold' }}>
            <div>
              {invoice.vendorName && (
                <p style={{ fontSize: '20px', fontWeight: 'bold', color: '#000000' }}>
                  👤 Vendeuse: {invoice.vendorName}
                </p>
              )}
              <p>📅 Mise à jour: {formatDate(invoice.updatedAt)}</p>
            </div>
            <div>
              <p>📋 Échéance: {formatDate(invoice.dueDate)}</p>
              {invoice.notes && (
                <p>📝 {invoice.notes}</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
