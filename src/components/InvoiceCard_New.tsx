import React from 'react';
import type { Invoice, InvoiceItem, PaymentDetails } from '@/services/syncService';
import { getVendorInvoiceStyles, getVendorHeaderStyles, getVendorNameStyles, getVendorColorInfo } from '../utils/vendorColors';

interface InvoiceCardProps {
  invoice: Invoice;
  onStatusChange: (invoiceId: string, itemId: string, newStatus: InvoiceItem['status']) => void;
}

export const InvoiceCard: React.FC<InvoiceCardProps> = ({ invoice, onStatusChange: _onStatusChange }) => {
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

  const getItemStatusColor = (status: InvoiceItem['status']) => {
    const colors = {
      pending: 'text-gray-600 bg-gray-100',
      available: 'text-green-600 bg-green-100',
      delivered: 'text-blue-600 bg-blue-100',
      cancelled: 'text-red-600 bg-red-100'
    };
    return colors[status] || colors.pending;
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

  const formatPrice = (price: number) => {
    return `${price.toFixed(2)}€`;
  };

  // Obtenir les styles de couleur pour la vendeuse (couleurs franches)
  const vendorColors = getVendorColorInfo(invoice.vendorName);
  const vendorStyles = getVendorInvoiceStyles(invoice.vendorName);

  return (
    <div 
      className="rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 mb-6 overflow-hidden"
      style={vendorStyles}
    >
      {/* En-tête coloré avec nom de la vendeuse */}
      {invoice.vendorName && (
        <div style={getVendorHeaderStyles(invoice.vendorName)}>
          <div className="flex items-center justify-between">
            <span style={{ fontSize: '20px', fontWeight: 'bold' }}>
              👤 {invoice.vendorName}
            </span>
            <span style={{ fontSize: '18px', opacity: 0.9 }}>
              {invoice.number}
            </span>
          </div>
        </div>
      )}

      <div className="p-6" style={{ backgroundColor: 'rgba(255,255,255,0.95)' }}>
        {/* Informations client */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <h3 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '8px', color: vendorColors.textColor }}>
              {invoice.clientName}
            </h3>
            {invoice.clientEmail && (
              <p style={{ fontSize: '16px', color: vendorColors.accentColor, marginBottom: '4px' }}>
                📧 {invoice.clientEmail}
              </p>
            )}
            {invoice.clientPhone && (
              <p style={{ fontSize: '16px', color: vendorColors.accentColor }}>
                📞 {invoice.clientPhone}
              </p>
            )}
          </div>
          <div className="text-right">
            {getStatusBadge(invoice.status)}
            <p style={{ fontSize: '14px', marginTop: '8px', opacity: 0.8 }}>
              Créée le {formatDate(invoice.createdAt)}
            </p>
            <p style={{ fontSize: '28px', fontWeight: 'bold', color: '#16a34a', marginTop: '8px' }}>
              {formatPrice(invoice.totalTTC)}
            </p>
          </div>
        </div>

        {/* Liste des produits */}
        <div className="mb-6">
          <h4 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '16px', color: vendorColors.textColor }}>
            📦 Produits ({invoice.items.length})
          </h4>
          <div className="space-y-3">
            {invoice.items.map((item) => (
              <div key={item.id} className="flex items-center justify-between p-4 rounded-lg border-2" 
                   style={{ borderColor: vendorColors.borderColor, backgroundColor: 'rgba(255,255,255,0.8)' }}>
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span style={{ fontSize: '18px' }}>
                      {getItemStatusIcon(item.status)}
                    </span>
                    <span style={{ fontSize: '18px', fontWeight: '600', color: vendorColors.textColor }}>
                      {item.productName}
                    </span>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${getItemStatusColor(item.status)}`}>
                      {item.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-4" style={{ fontSize: '16px', color: vendorColors.accentColor }}>
                    <span>📂 {item.category}</span>
                    <span>📊 Qté: {item.quantity}</span>
                    <span>💰 {formatPrice(item.unitPrice)}</span>
                  </div>
                </div>
                <div className="text-right">
                  <p style={{ fontSize: '20px', fontWeight: 'bold', color: vendorColors.textColor }}>
                    {formatPrice(item.totalPrice)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Détails du règlement */}
        {invoice.paymentDetails && (
          <div className="p-4 rounded-lg border-2" 
               style={{ backgroundColor: 'rgba(59, 130, 246, 0.1)', borderColor: '#3b82f6' }}>
            <h4 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '16px', color: '#1e40af' }}>
              💳 Détails du règlement
            </h4>

            {/* Informations de base */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <p style={{ fontSize: '16px', marginBottom: '8px' }}>
                  <strong>Mode de paiement:</strong> {getPaymentMethodIcon(invoice.paymentDetails.method)} {getPaymentMethodLabel(invoice.paymentDetails.method)}
                </p>
                <p style={{ fontSize: '16px', marginBottom: '8px' }}>
                  <strong>Statut:</strong> {getPaymentStatusBadge(invoice.paymentDetails.status)}
                </p>
              </div>
              <div>
                <p style={{ fontSize: '16px', marginBottom: '8px' }}>
                  <strong>Total:</strong> <span style={{ fontSize: '18px', fontWeight: 'bold' }}>{formatPrice(invoice.paymentDetails.totalAmount)}</span>
                </p>
                <p style={{ fontSize: '16px', marginBottom: '8px' }}>
                  <strong>Payé:</strong> <span style={{ fontSize: '18px', fontWeight: 'bold', color: '#16a34a' }}>{formatPrice(invoice.paymentDetails.paidAmount)}</span>
                </p>
                <p style={{ fontSize: '16px', marginBottom: '8px' }}>
                  <strong>Restant:</strong> <span style={{ fontSize: '18px', fontWeight: 'bold', color: '#dc2626' }}>{formatPrice(invoice.paymentDetails.remainingAmount)}</span>
                </p>
              </div>
            </div>

            {/* Détails spécifiques aux chèques */}
            {invoice.paymentDetails.checkDetails && (
              <div className="p-3 rounded-lg border-2 mb-4" 
                   style={{ backgroundColor: 'rgba(59, 130, 246, 0.05)', borderColor: '#60a5fa' }}>
                <h5 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '12px', color: '#1e40af' }}>
                  📝 Détails des chèques
                </h5>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p style={{ fontSize: '16px', marginBottom: '4px' }}>
                      <strong>Total chèques:</strong> {invoice.paymentDetails.checkDetails.totalChecks}
                    </p>
                    <p style={{ fontSize: '16px', marginBottom: '4px' }}>
                      <strong>Reçus:</strong> {invoice.paymentDetails.checkDetails.checksReceived}
                    </p>
                    <p style={{ fontSize: '16px', marginBottom: '4px' }}>
                      <strong>À venir:</strong> {invoice.paymentDetails.checkDetails.checksRemaining}
                    </p>
                  </div>
                  <div>
                    {invoice.paymentDetails.checkDetails.nextCheckDate && (
                      <p style={{ fontSize: '16px', marginBottom: '4px' }}>
                        <strong>Prochain chèque:</strong> {formatDate(invoice.paymentDetails.checkDetails.nextCheckDate)}
                      </p>
                    )}
                  </div>
                </div>
                {invoice.paymentDetails.checkDetails.characteristics && (
                  <p style={{ fontSize: '16px', marginTop: '8px', fontStyle: 'italic', color: '#4338ca' }}>
                    <strong>Caractéristiques:</strong> {invoice.paymentDetails.checkDetails.characteristics}
                  </p>
                )}
              </div>
            )}

            {/* Détails des transactions électroniques */}
            {invoice.paymentDetails.transactionDetails && (
              <div className="p-3 rounded-lg border-2 mb-4" 
                   style={{ backgroundColor: 'rgba(16, 185, 129, 0.05)', borderColor: '#34d399' }}>
                <h5 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '12px', color: '#047857' }}>
                  💳 Détails de la transaction
                </h5>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    {invoice.paymentDetails.transactionDetails.reference && (
                      <p style={{ fontSize: '16px', marginBottom: '4px' }}>
                        <strong>Référence:</strong> {invoice.paymentDetails.transactionDetails.reference}
                      </p>
                    )}
                    {invoice.paymentDetails.transactionDetails.bankName && (
                      <p style={{ fontSize: '16px', marginBottom: '4px' }}>
                        <strong>Banque:</strong> {invoice.paymentDetails.transactionDetails.bankName}
                      </p>
                    )}
                  </div>
                  <div>
                    {invoice.paymentDetails.transactionDetails.accountLast4 && (
                      <p style={{ fontSize: '16px', marginBottom: '4px' }}>
                        <strong>Carte:</strong> **** {invoice.paymentDetails.transactionDetails.accountLast4}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Détails des paiements échelonnés */}
            {invoice.paymentDetails.installments && (
              <div className="p-3 rounded-lg border-2 mb-4" 
                   style={{ backgroundColor: 'rgba(139, 92, 246, 0.05)', borderColor: '#a78bfa' }}>
                <h5 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '12px', color: '#7c3aed' }}>
                  📅 Paiement échelonné
                </h5>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p style={{ fontSize: '16px', marginBottom: '4px' }}>
                      <strong>Total échéances:</strong> {invoice.paymentDetails.installments.totalInstallments}
                    </p>
                    <p style={{ fontSize: '16px', marginBottom: '4px' }}>
                      <strong>Payées:</strong> {invoice.paymentDetails.installments.completedInstallments}
                    </p>
                    <p style={{ fontSize: '16px', marginBottom: '4px' }}>
                      <strong>Montant échéance:</strong> {formatPrice(invoice.paymentDetails.installments.installmentAmount)}
                    </p>
                  </div>
                  <div>
                    {invoice.paymentDetails.installments.nextPaymentDate && (
                      <p style={{ fontSize: '16px', marginBottom: '4px' }}>
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
                   style={{ backgroundColor: 'rgba(156, 163, 175, 0.05)', borderColor: '#d1d5db' }}>
                <h5 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '8px', color: '#4b5563' }}>
                  📝 Notes de règlement
                </h5>
                <p style={{ fontSize: '16px', fontStyle: 'italic', color: '#6b7280' }}>
                  {invoice.paymentDetails.paymentNotes}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Informations supplémentaires */}
        <div className="mt-6 pt-4 border-t-2" style={{ borderColor: vendorColors.borderColor }}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4" style={{ fontSize: '14px', color: vendorColors.accentColor }}>
            <div>
              {invoice.vendorName && (
                <p style={getVendorNameStyles(invoice.vendorName)}>
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
