import React from 'react';
import { PendingPayment } from '@/services/pendingPaymentsService';

interface RAZPendingPaymentsProps {
  reglementsData: PendingPayment[];
}

export default function RAZPendingPayments({ reglementsData }: RAZPendingPaymentsProps) {
  const formatEuro = (amount: number) =>
    new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(amount);

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return Number.isNaN(d.getTime()) ? dateStr : d.toLocaleDateString('fr-FR');
  };

  const getStatusBadge = () => (
    <span
      style={{
        backgroundColor: '#FEF3C7',
        color: '#D97706',
        padding: '4px 8px',
        borderRadius: 4,
        fontSize: 12,
        fontWeight: 700,
      }}
    >
      ⏳ En attente
    </span>
  );

  // Pas de champ "method" dans PendingPayment actuellement → on affiche l'icône chèque par défaut
  const getMethodIcon = () => '📝';

  const totalAmount = reglementsData.reduce(
    (sum, r) => sum + r.montantCheque * r.nbCheques,
    0
  );

  return (
    <div style={{
      backgroundColor: '#F9FAFB',
      border: '1px solid #E5E7EB',
      borderRadius: 12,
      padding: 25,
      marginBottom: 25
    }}>
      {/* HEADER */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h3 style={{ margin: 0, color: '#374151', fontWeight: 700, fontSize: 20, display: 'flex', alignItems: 'center', gap: 10 }}>
          📅 Règlements à venir
        </h3>
        {reglementsData.length > 0 ? (
          <div style={{
            backgroundColor: '#EBF8FF',
            color: '#1E40AF',
            padding: '8px 16px',
            borderRadius: 8,
            fontWeight: 600,
            fontSize: '0.9em'
          }}>
            Total: {formatEuro(totalAmount)}
          </div>
        ) : null}
      </div>

      {/* BODY */}
      {reglementsData.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 40, color: '#6B7280', backgroundColor: 'white', borderRadius: 8 }}>
          <div style={{ fontSize: '2em', marginBottom: 10 }}>📭</div>
          <div style={{ fontWeight: 600 }}>Aucun règlement à venir</div>
          <div style={{ fontSize: '0.9em', marginTop: 5 }}>
            Les règlements programmés apparaîtront ici
          </div>
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: 'white', borderRadius: 8, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)' }}>
            <thead>
              <tr style={{ backgroundColor: '#F3F4F6' }}>
                <th style={{ padding: '16px 20px', textAlign: 'left', fontWeight: 600, color: '#374151', borderBottom: '1px solid #E5E7EB' }}>Client / Référence</th>
                <th style={{ padding: '16px 20px', textAlign: 'center', fontWeight: 600, color: '#374151', borderBottom: '1px solid #E5E7EB' }}>Date</th>
                <th style={{ padding: '16px 20px', textAlign: 'center', fontWeight: 600, color: '#374151', borderBottom: '1px solid #E5E7EB' }}>Méthode</th>
                <th style={{ padding: '16px 20px', textAlign: 'right', fontWeight: 600, color: '#374151', borderBottom: '1px solid #E5E7EB' }}>Montant</th>
                <th style={{ padding: '16px 20px', textAlign: 'center', fontWeight: 600, color: '#374151', borderBottom: '1px solid #E5E7EB' }}>Statut</th>
              </tr>
            </thead>
            <tbody>
              {reglementsData
                .sort((a, b) => new Date(a.dateProchain).getTime() - new Date(b.dateProchain).getTime())
                .map((reglement, index) => (
                  <tr 
                    key={`${reglement.vendorId}-${reglement.clientName}-${index}`}
                    style={{ borderBottom: '1px solid #F3F4F6' }}
                  >
                    <td style={{ padding: '16px 20px', color: '#1F2937', fontWeight: 500 }}>
                      <div>{reglement.clientName}</div>
                      <div style={{ fontSize: '0.8em', color: '#6B7280', marginTop: 2 }}>
                        Vendeuse: {reglement.vendorName}
                      </div>
                    </td>
                    <td style={{ padding: '16px 20px', textAlign: 'center', color: '#6B7280', fontWeight: 500 }}>
                      {formatDate(reglement.dateProchain)}
                    </td>
                    <td style={{ padding: '16px 20px', textAlign: 'center', fontSize: '1.2em' }}>{getMethodIcon()}</td>
                    <td style={{ padding: '16px 20px', textAlign: 'right', color: '#059669', fontWeight: 600 }}>
                      <div>{formatEuro(reglement.montantCheque * reglement.nbCheques)}</div>
                      <div style={{ fontSize: '0.8em', color: '#6B7280' }}>
                        ({reglement.nbCheques} × {formatEuro(reglement.montantCheque)})
                      </div>
                    </td>
                    <td style={{ padding: '16px 20px', textAlign: 'center' }}>
                      {getStatusBadge()}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
