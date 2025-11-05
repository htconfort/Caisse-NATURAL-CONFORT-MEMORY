import { useState } from 'react';
import { X, FileText, User } from 'lucide-react';

interface ManualInvoiceData {
  clientName: string;
  invoiceNumber: string;
}

interface ManualInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: ManualInvoiceData) => void;
  cartTotal: number;
  reason: 'matelas-classique' | 'facturier-manual';
}

export function ManualInvoiceModal({
  isOpen,
  onClose,
  onSave,
  cartTotal,
  reason
}: ManualInvoiceModalProps) {
  const [clientName, setClientName] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [errors, setErrors] = useState<{ clientName?: string; invoiceNumber?: string }>({});

  const validateFields = () => {
    const newErrors: { clientName?: string; invoiceNumber?: string } = {};
    
    if (!clientName.trim()) {
      newErrors.clientName = 'Le nom du client est obligatoire';
    }
    
    if (!invoiceNumber.trim()) {
      newErrors.invoiceNumber = 'Le numéro de facture est obligatoire';
    } else if (!/^[0-9A-Za-z-]+$/.test(invoiceNumber.trim())) {
      newErrors.invoiceNumber = 'Format invalide (ex: 2025-123)';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    if (!validateFields()) return;

    onSave({
      clientName: clientName.trim(),
      invoiceNumber: invoiceNumber.trim()
    });

    // Reset form
    setClientName('');
    setInvoiceNumber('');
    setErrors({});
  };

  const handleCancel = () => {
    setClientName('');
    setInvoiceNumber('');
    setErrors({});
    onClose();
  };

  const getModalTitle = () => {
    switch (reason) {
      case 'matelas-classique':
        return '🛏️ Vente Matelas - Informations Client';
      case 'facturier-manual':
        return '⚠️ Facture Manuelle - Mode Secours';
      default:
        return '📝 Informations Facture';
    }
  };

  const getModalDescription = () => {
    switch (reason) {
      case 'matelas-classique':
        return 'Votre panier contient des matelas/sur-matelas. Merci de renseigner les informations client pour la traçabilité.';
      case 'facturier-manual':
        return 'N8N indisponible. Saisissez manuellement les informations de la facture créée sur l\'iPad facturier.';
      default:
        return 'Merci de renseigner les informations client et facture.';
    }
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.6)',
      zIndex: 1300,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px'
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '16px',
        boxShadow: '0 25px 50px rgba(0, 0, 0, 0.25)',
        border: '3px solid #477A0C',
        maxWidth: '500px',
        width: '100%',
        maxHeight: '90vh',
        overflow: 'hidden'
      }}>
        
        {/* Header */}
        <div style={{
          background: 'linear-gradient(135deg, #477A0C 0%, #14281D 100%)',
          color: 'white',
          padding: '24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            <h1 style={{ 
              fontSize: '20px', 
              fontWeight: 'bold',
              margin: 0,
              marginBottom: '4px'
            }}>
              {getModalTitle()}
            </h1>
            <p style={{ 
              fontSize: '14px', 
              opacity: 0.9,
              margin: 0
            }}>
              Total: {cartTotal.toFixed(2)}€ TTC
            </p>
          </div>
          <button
            onClick={handleCancel}
            style={{
              background: 'rgba(255,255,255,0.2)',
              border: 'none',
              color: 'white',
              borderRadius: '8px',
              padding: '8px',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: '24px' }}>
          
          {/* Description */}
          <div style={{
            backgroundColor: '#f0f9ff',
            padding: '16px',
            borderRadius: '12px',
            border: '2px solid #bfdbfe',
            marginBottom: '24px'
          }}>
            <p style={{ 
              fontSize: '14px', 
              color: '#1e40af',
              margin: 0,
              lineHeight: 1.4
            }}>
              {getModalDescription()}
            </p>
          </div>

          {/* Form */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            
            {/* Client Name */}
            <div>
              <label style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '16px',
                fontWeight: '600',
                color: '#14281D',
                marginBottom: '8px'
              }}>
                <User size={18} />
                Nom du client *
              </label>
              <input
                type="text"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                placeholder="Ex: Jean MARTIN"
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  fontSize: '16px',
                  border: errors.clientName ? '2px solid #F55D3E' : '2px solid #d1d5db',
                  borderRadius: '8px',
                  backgroundColor: 'white',
                  outline: 'none',
                  transition: 'border-color 0.2s ease'
                }}
                onFocus={(e) => {
                  if (!errors.clientName) {
                    e.target.style.borderColor = '#477A0C';
                  }
                }}
                onBlur={(e) => {
                  if (!errors.clientName) {
                    e.target.style.borderColor = '#d1d5db';
                  }
                }}
              />
              {errors.clientName && (
                <p style={{ 
                  fontSize: '14px', 
                  color: '#F55D3E', 
                  margin: '4px 0 0 0' 
                }}>
                  {errors.clientName}
                </p>
              )}
            </div>

            {/* Invoice Number */}
            <div>
              <label style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '16px',
                fontWeight: '600',
                color: '#14281D',
                marginBottom: '8px'
              }}>
                <FileText size={18} />
                Numéro de facture *
              </label>
              <input
                type="text"
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
                placeholder="Ex: 2025-123"
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  fontSize: '16px',
                  border: errors.invoiceNumber ? '2px solid #F55D3E' : '2px solid #d1d5db',
                  borderRadius: '8px',
                  backgroundColor: 'white',
                  outline: 'none',
                  transition: 'border-color 0.2s ease'
                }}
                onFocus={(e) => {
                  if (!errors.invoiceNumber) {
                    e.target.style.borderColor = '#477A0C';
                  }
                }}
                onBlur={(e) => {
                  if (!errors.invoiceNumber) {
                    e.target.style.borderColor = '#d1d5db';
                  }
                }}
              />
              {errors.invoiceNumber && (
                <p style={{ 
                  fontSize: '14px', 
                  color: '#F55D3E', 
                  margin: '4px 0 0 0' 
                }}>
                  {errors.invoiceNumber}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{
          padding: '24px',
          borderTop: '1px solid #e5e7eb',
          display: 'flex',
          gap: '12px',
          justifyContent: 'flex-end'
        }}>
          <button
            onClick={handleCancel}
            style={{
              backgroundColor: '#f3f4f6',
              color: '#6B7280',
              border: 'none',
              borderRadius: '8px',
              padding: '12px 24px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#e5e7eb'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#f3f4f6'}
          >
            Annuler
          </button>
          
          <button
            onClick={handleSave}
            style={{
              backgroundColor: '#477A0C',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              padding: '12px 24px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#3d6a0a'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#477A0C'}
          >
            <FileText size={16} />
            Valider et continuer
          </button>
        </div>
      </div>
    </div>
  );
}
