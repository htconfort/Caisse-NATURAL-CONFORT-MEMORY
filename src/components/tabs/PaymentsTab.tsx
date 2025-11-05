import { Calendar, CheckCircle, Clock, Plus, Save, Store, X, Download, Trash2 } from 'lucide-react';
import React, { useMemo, useState } from 'react';
import { vendors } from '../../data';
import { useSupabaseInvoices } from '../../hooks/useSupabaseInvoices';
import '../../styles/payments-tab.css';

// Type Invoice pour compatibilité
type Invoice = {
  id: string | number;
  number: string;
  invoiceNumber?: string;
  clientName: string;
  vendorId?: string;
  vendorName?: string;
  totalTTC: number;
  createdAt: string | Date;
  items: Array<{
    id: string;
    productName: string;
    category?: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
  }>;
  paymentDetails?: {
    method?: string;
    status?: string;
    checkDetails?: {
      totalChecks: number;
      checkAmounts?: number[];
      characteristics?: string;
    };
    paymentNotes?: string;
  };
};

// Type Sale pour compatibilité
type Sale = {
  id: string;
  vendorId: string;
  vendorName: string;
  totalAmount: number;
  paymentMethod: string;
  date: Date | string;
  canceled: boolean;
  checkDetails?: {
    count: number;
    amount: number;
    totalAmount: number;
    notes?: string;
  };
  paymentDetails?: {
    downPayment?: number;
  };
  manualInvoiceData?: {
    clientName: string;
    invoiceNumber: string;
  };
};

interface PaymentsTabProps {
  sales: Sale[];
  invoices: Invoice[];
}

// Interface pour unifier les règlements à venir
interface PendingPayment {
  id: string;
  source: 'sale' | 'invoice' | 'supabase'; // 🆕 Ajouter 'supabase' pour factures App Facturation
  sourceId: string;
  clientName: string;
  vendorName: string;
  vendorId: string;
  date: Date;
  checkDetails: {
    count: number;
    amount: number;
    totalAmount: number;
    notes?: string;
  };
  saleTotal?: number;
  invoiceNumber?: string;
  depositAmount?: number; // Acompte versé
  remainingBalance?: number; // Solde restant
}

// Interface pour les règlements perçus sur Stand
interface ReceivedPayment {
  id: string;
  clientName: string;
  invoiceNumber: string;
  checkReceived: number;
  numberOfChecks: number;
  vendorName: string;
  vendorId: string;
  date: Date;
}

// Type pour les sous-onglets
type PaymentSubTab = 'pending' | 'received' | 'export';

// Format € solide
const fmtEUR = (n: number) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n);

export function PaymentsTab({ sales, invoices }: PaymentsTabProps) {
  const [expandedPayments, setExpandedPayments] = useState<Set<string>>(new Set());
  const [activeSubTab, setActiveSubTab] = useState<PaymentSubTab>('pending');
  const [_editingPayment, _setEditingPayment] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [receivedPayments, setReceivedPayments] = useState<ReceivedPayment[]>([]);
  
  // 🆕 État pour la sélection des règlements à supprimer
  const [selectedPayments, setSelectedPayments] = useState<Set<string>>(new Set());
  
  // 🆕 Charger les factures Supabase pour les chèques à venir
  const { invoices: supabaseInvoices, refreshInvoices } = useSupabaseInvoices();

  // Fonction pour basculer l'expansion d'un paiement
  const togglePaymentExpansion = (paymentId: string) => {
    const newExpanded = new Set(expandedPayments);
    if (newExpanded.has(paymentId)) {
      newExpanded.delete(paymentId);
    } else {
      newExpanded.add(paymentId);
    }
    setExpandedPayments(newExpanded);
  };

  // 🆕 Basculer la sélection d'un règlement
  const togglePaymentSelection = (paymentId: string) => {
    const newSelected = new Set(selectedPayments);
    if (newSelected.has(paymentId)) {
      newSelected.delete(paymentId);
    } else {
      newSelected.add(paymentId);
    }
    setSelectedPayments(newSelected);
  };

  // 🆕 Tout sélectionner / Tout désélectionner
  const toggleSelectAll = () => {
    if (selectedPayments.size === pendingPayments.length) {
      // Tout est sélectionné → Tout désélectionner
      setSelectedPayments(new Set());
    } else {
      // Sélectionner tout
      setSelectedPayments(new Set(pendingPayments.map(p => p.id)));
    }
  };

  // Couleur vendeuse depuis le data store
  const getVendorColor = (vendorId: string): string => {
    const vendor = vendors.find(v => v.id === vendorId);
    return vendor?.color || '#6B7280';
  };

  // Extraire tous les règlements à venir des ventes et factures
  const pendingPayments = useMemo<PendingPayment[]>(() => {
    const payments: PendingPayment[] = [];

    // Règlements à venir des ventes caisse
    sales.forEach(sale => {
      if (sale.checkDetails && sale.paymentMethod === 'check' && !sale.canceled) {
        const saleTotal = sale.totalAmount;
        
        // Chercher l'acompte dans différents endroits possibles
        let depositAmount = 0;
        if (sale.paymentDetails?.downPayment) {
          depositAmount = sale.paymentDetails.downPayment;
        } else if ((sale as any).depositAmount) {
          depositAmount = (sale as any).depositAmount;
        } else if (sale.checkDetails.notes?.includes('Acompte')) {
          // Extraire l'acompte des notes si mentionné
          const match = sale.checkDetails.notes.match(/Acompte[:\s]+(\d+(?:[.,]\d+)?)/i);
          if (match) {
            depositAmount = parseFloat(match[1].replace(',', '.'));
          }
        }
        
        const checksTotal = sale.checkDetails.totalAmount;
        // Solde = Total - Acompte - Chèques (le solde à percevoir est le montant des chèques)
        const remainingBalance = checksTotal;
        
        // Récupérer le nom du client et numéro de facture
        const clientName = sale.manualInvoiceData?.clientName || 'Client';
        const invoiceNumber = sale.manualInvoiceData?.invoiceNumber || null;
        
        
        payments.push({
          id: `sale-${sale.id}`,
          source: 'sale',
          sourceId: sale.id,
          clientName: clientName,
          vendorName: sale.vendorName,
          vendorId: sale.vendorId,
          date: new Date(sale.date),
          checkDetails: sale.checkDetails,
          saleTotal: saleTotal,
          depositAmount: depositAmount,
          remainingBalance: remainingBalance,
          invoiceNumber: invoiceNumber || undefined
        });
      }
    });

    // Règlements à venir des factures N8N
    invoices.forEach(invoice => {
      if (invoice.paymentDetails?.checkDetails &&
        invoice.paymentDetails.method === 'check' &&
        invoice.paymentDetails.status !== 'completed') {

        const checkDetails = invoice.paymentDetails.checkDetails;
        const invoiceTotal = invoice.totalTTC;
        const depositAmount = (invoice.paymentDetails as any).downPayment || 0;
        
        // Calculer le montant total des chèques
        const checksTotal = checkDetails.totalChecks * (checkDetails.checkAmounts?.[0] || 0);
        
        // Solde = Total facture - Acompte - Montant total des chèques
        const remainingBalance = Math.max(0, invoiceTotal - depositAmount - checksTotal);
        
        payments.push({
          id: `invoice-${invoice.id}`,
          source: 'invoice',
          sourceId: String(invoice.id),
          clientName: invoice.clientName,
          vendorName: invoice.vendorName || 'N8N',
          vendorId: invoice.vendorId || '1',
          date: new Date(invoice.createdAt),
          checkDetails: {
            count: checkDetails.totalChecks,
            amount: checkDetails.checkAmounts?.[0] || 0,
            totalAmount: checksTotal,
            notes: checkDetails.characteristics || invoice.paymentDetails.paymentNotes
          },
          invoiceNumber: invoice.number,
          depositAmount: depositAmount,
          remainingBalance: remainingBalance,
          saleTotal: invoiceTotal
        });
      }
    });

    // 🆕 Règlements à venir des factures Supabase (chèques avec montant_restant > 0)
    supabaseInvoices.forEach(invoice => {
      // Vérifier si c'est un paiement par chèque avec montant restant
      const isCheck = invoice.payment_method && 
                     (invoice.payment_method.toLowerCase().includes('chèque') || 
                      invoice.payment_method.toLowerCase().includes('cheque'));
      
      if (isCheck && invoice.montant_restant > 0) {
        // Calculer le nombre de chèques estimé (si > 500€, probablement plusieurs chèques)
        const estimatedChecks = invoice.montant_restant > 500 ? 
          Math.ceil(invoice.montant_restant / 300) : 1;
        
        payments.push({
          id: `supabase-${invoice.id}`,
          source: 'supabase', // 🆕 Source = 'supabase' (factures App Facturation)
          sourceId: String(invoice.id),
          clientName: invoice.nom_client,
          vendorName: invoice.conseiller || 'Non assigné',
          vendorId: '1', // Sera mappé via getVendorIdByName si nécessaire
          date: new Date(invoice.created_at),
          checkDetails: {
            count: estimatedChecks,
            amount: invoice.montant_restant / estimatedChecks,
            totalAmount: invoice.montant_restant,
            notes: `${invoice.payment_method} - Solde restant`
          },
          invoiceNumber: invoice.numero_facture,
          depositAmount: invoice.acompte,
          remainingBalance: invoice.montant_restant,
          saleTotal: invoice.montant_ttc
        });
      }
    });

    // Trier par date décroissante
    return payments.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [sales, invoices, supabaseInvoices]);


  // Initialisation des données des règlements perçus
  React.useEffect(() => {
    if (receivedPayments.length === 0) {
      // Charger depuis localStorage si disponible
      const stored = localStorage.getItem('receivedPayments');
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          const payments = parsed.map((p: ReceivedPayment) => ({
            ...p,
            date: new Date(p.date)
          }));
          setReceivedPayments(payments);
        } catch (e) {
          console.error('Erreur chargement règlements perçus:', e);
        }
      }
    }
  }, [receivedPayments.length]);

  // Fonctions pour l'édition des règlements perçus (non utilisées pour le moment)
  const _handleEditPayment = (paymentId: string) => {
    _setEditingPayment(paymentId);
  };

  const _handleSavePayment = (paymentId: string, updatedPayment: Partial<ReceivedPayment>) => {
    setReceivedPayments(prev => {
      const updated = prev.map(payment =>
        payment.id === paymentId
          ? { ...payment, ...updatedPayment }
          : payment
      ).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      localStorage.setItem('receivedPayments', JSON.stringify(updated));
      return updated;
    });
    _setEditingPayment(null);
  };

  const _handleCancelEdit = () => {
    _setEditingPayment(null);
  };

  const handleAddPayment = (newPayment: Omit<ReceivedPayment, 'id'>) => {
    const id = `rec-${Date.now()}`;
    const paymentWithId: ReceivedPayment = { ...newPayment, id };
    setReceivedPayments(prev => {
      const updated = [...prev, paymentWithId].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      localStorage.setItem('receivedPayments', JSON.stringify(updated));
      return updated;
    });
    setShowAddModal(false);
  };

  const _handleDeletePayment = (paymentId: string) => {
    setReceivedPayments(prev => {
      const updated = prev.filter(payment => payment.id !== paymentId);
      localStorage.setItem('receivedPayments', JSON.stringify(updated));
      return updated;
    });
  };

  // Fonction d'export CSV
  const exportToCSV = () => {
    if (pendingPayments.length === 0) {
      alert('Aucun règlement à exporter');
      return;
    }

    // En-têtes CSV
    const headers = [
      'N° Facture',
      'Client',
      'Vendeuse',
      'Date',
      'Acompte versé (€)',
      'Nombre de chèques',
      'Montant par chèque (€)',
      'Total chèques (€)',
      'Total TTC (€)',
      'Source'
    ];

    // Données CSV
    const csvData = pendingPayments.map(payment => [
      payment.invoiceNumber || '-',
      payment.clientName,
      payment.vendorName,
      payment.date.toLocaleDateString('fr-FR'),
      payment.depositAmount?.toFixed(2) || '0.00',
      payment.checkDetails.count,
      payment.checkDetails.amount.toFixed(2),
      payment.checkDetails.totalAmount.toFixed(2),
      payment.saleTotal?.toFixed(2) || payment.checkDetails.totalAmount.toFixed(2),
      payment.source === 'sale' ? 'Vente Caisse' : 'Facture N8N'
    ]);

    // Créer le contenu CSV
    const csvContent = [
      headers.join(','),
      ...csvData.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    // Créer et télécharger le fichier
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `reglements-avenir-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    console.log(`✅ Export CSV: ${pendingPayments.length} règlements exportés`);
  };

  return (
    <div className="payments-container">
      {/* En-tête */}
      <div className="payments-header">
        <div className="payments-header-content">
          <div>
            <h2 className="payments-header-title">
              💳 Règlements
            </h2>
            <p className="payments-header-subtitle">
              Suivi complet des règlements et paiements
            </p>
          </div>
          <div className="payments-header-count">
            <div className="payments-header-count-value">
              {activeSubTab === 'pending' ? pendingPayments.length : receivedPayments.length}
            </div>
            <div className="payments-header-count-label">
              {activeSubTab === 'pending' ? 'en attente' : 'perçus'}
            </div>
          </div>
        </div>
      </div>

      {/* Navigation des sous-onglets */}
      <div className="payments-subnav">
        <button
          onClick={() => setActiveSubTab('pending')}
          className={`payments-subnav-btn ${activeSubTab === 'pending' ? 'active pending' : ''}`}
        >
          <Clock size={18} />
          Règlements à venir
        </button>
        <button
          onClick={() => setActiveSubTab('received')}
          className={`payments-subnav-btn ${activeSubTab === 'received' ? 'active received' : ''}`}
        >
          <Store size={18} />
          Règlement perçu sur Stand
        </button>
        <button
          onClick={() => setActiveSubTab('export')}
          className={`payments-subnav-btn ${activeSubTab === 'export' ? 'active export' : ''}`}
        >
          <Download size={18} />
          Export CSV
        </button>
      </div>

      {/* Contenu conditionnel selon l'onglet actif */}
      {activeSubTab === 'pending' ? (
        <>

          {/* Liste des règlements à venir */}
          <div className="payments-section">
            <div className="payments-section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 className="payments-section-title">
                📋 Règlements en attente de chèque à venir
              </h3>
              {pendingPayments.length > 0 && (
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  {/* Bouton Tout sélectionner */}
                  <button
                    onClick={toggleSelectAll}
                    style={{
                      backgroundColor: selectedPayments.size === pendingPayments.length ? '#10B981' : '#6B7280',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      padding: '10px 16px',
                      fontSize: '13px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      transition: 'all 0.2s ease'
                    }}
                    title={selectedPayments.size === pendingPayments.length ? 'Tout désélectionner' : 'Tout sélectionner'}
                  >
                    <CheckCircle size={16} />
                    {selectedPayments.size === pendingPayments.length ? 'Désélectionner' : 'Tout sélectionner'}
                  </button>

                  {/* Bouton Supprimer sélection */}
                  <button
                    onClick={async () => {
                      if (selectedPayments.size === 0) {
                        alert('⚠️ Aucun règlement sélectionné\n\nCochez les règlements que vous avez perçus avant de cliquer sur Supprimer.');
                        return;
                      }

                      // 🔐 Demander mot de passe
                      const password = prompt(
                        `🔐 SUPPRIMER LES RÈGLEMENTS SÉLECTIONNÉS\n\n` +
                        `Cette action va supprimer ${selectedPayments.size} règlement(s) sélectionné(s).\n` +
                        `(Les chèques reçus dans votre boîte aux lettres)\n\n` +
                        `Entrez le mot de passe pour confirmer :`
                      );
                      
                      if (!password) {
                        console.log('❌ Suppression annulée - Pas de mot de passe');
                        return;
                      }
                      
                      if (password !== '1234') {
                        alert('🚫 MOT DE PASSE INCORRECT\n\nSuppression refusée.');
                        console.log('❌ Suppression annulée - Mot de passe incorrect');
                        return;
                      }
                      
                      // ✅ Mot de passe correct
                      const confirmation = confirm(
                        `⚠️ CONFIRMATION FINALE\n\n` +
                        `Vous êtes sur le point de supprimer ${selectedPayments.size} règlement(s) sélectionné(s).\n\n` +
                        `Cette action est IRRÉVERSIBLE.\n\n` +
                        `Confirmer la suppression ?`
                      );
                      
                      if (!confirmation) {
                        console.log('❌ Suppression annulée par l\'utilisateur');
                        return;
                      }
                      
                      try {
                        // 🗑️ Marquer les règlements sélectionnés comme réglés dans Supabase
                        const selectedPaymentsList = Array.from(selectedPayments);
                        const paymentsToMark = pendingPayments.filter(p => selectedPaymentsList.includes(p.id));
                        
                        // Extraire les numéros de factures Supabase uniquement
                        const supabaseInvoiceNumbers = paymentsToMark
                          .filter(p => p.source === 'supabase' && p.invoiceNumber)
                          .map(p => p.invoiceNumber!);
                        
                        console.log('💰 Factures Supabase à marquer comme réglées:', supabaseInvoiceNumbers);
                        
                        // Marquer comme réglées dans Supabase
                        if (supabaseInvoiceNumbers.length > 0) {
                          try {
                            const { supabaseInvoicesService } = await import('@/services/supabaseInvoicesService');
                            const markedCount = await supabaseInvoicesService.markInvoicesAsPaid(supabaseInvoiceNumbers);
                            
                            console.log(`✅ ${markedCount} facture(s) Supabase marquée(s) comme réglée(s)`);
                            
                            // Rafraîchir les factures Supabase
                            await refreshInvoices();
                            
                            alert(
                              `✅ RÈGLEMENTS MARQUÉS COMME PERÇUS\n\n` +
                              `${markedCount} facture(s) Supabase marquée(s) comme réglée(s).\n\n` +
                              `Le badge rouge sera mis à jour.`
                            );
                          } catch (supabaseError) {
                            console.error('❌ Erreur Supabase:', supabaseError);
                            const errorMsg = supabaseError instanceof Error ? supabaseError.message : String(supabaseError);
                            
                            alert(
                              `❌ ERREUR SUPABASE\n\n` +
                              `Impossible de marquer les factures comme réglées.\n\n` +
                              `Erreur: ${errorMsg}\n\n` +
                              `SOLUTION:\n` +
                              `1. Vérifiez votre connexion internet\n` +
                              `2. Ou utilisez le fichier SQL fourni:\n` +
                              `   NETTOYAGE-FACTURES-TEST-SIMPLE.sql\n` +
                              `   (À exécuter dans Supabase Dashboard)`
                            );
                            return; // Arrêter ici en cas d'erreur Supabase
                          }
                        }
                        
                        // TODO: Gérer les règlements locaux (ventes caisse et factures N8N)
                        const localPayments = paymentsToMark.filter(p => p.source !== 'supabase');
                        if (localPayments.length > 0) {
                          console.log('⚠️ Règlements locaux à traiter:', localPayments.length);
                          alert(
                            `⚠️ RÈGLEMENTS LOCAUX\n\n` +
                            `${localPayments.length} règlement(s) local/locaux ne peuvent pas être marqués automatiquement.\n\n` +
                            `Ces règlements proviennent de la Caisse locale et nécessitent une gestion manuelle.`
                          );
                        }
                        
                        // Réinitialiser la sélection
                        setSelectedPayments(new Set());
                        
                      } catch (error) {
                        console.error('❌ Erreur suppression règlements:', error);
                        const errorMsg = error instanceof Error ? error.message : String(error);
                        alert(`❌ Erreur lors de la suppression des règlements:\n\n${errorMsg}`);
                      }
                    }}
                    disabled={selectedPayments.size === 0}
                    style={{
                      backgroundColor: selectedPayments.size > 0 ? '#DC2626' : '#9CA3AF',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      padding: '10px 20px',
                      fontSize: '14px',
                      fontWeight: '600',
                      cursor: selectedPayments.size > 0 ? 'pointer' : 'not-allowed',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      transition: 'all 0.2s ease',
                      opacity: selectedPayments.size > 0 ? 1 : 0.6
                    }}
                    onMouseOver={(e) => {
                      if (selectedPayments.size > 0) {
                        e.currentTarget.style.backgroundColor = '#B91C1C';
                      }
                    }}
                    onMouseOut={(e) => {
                      if (selectedPayments.size > 0) {
                        e.currentTarget.style.backgroundColor = '#DC2626';
                      }
                    }}
                    title={selectedPayments.size > 0 ? `Supprimer ${selectedPayments.size} règlement(s) perçu(s)` : 'Sélectionnez des règlements à supprimer'}
                  >
                    <Trash2 size={18} />
                    {selectedPayments.size > 0 ? `Supprimer sélection (${selectedPayments.size})` : 'Supprimer sélection'}
                  </button>
                </div>
              )}
            </div>

            {pendingPayments.length === 0 ? (
              <div className="payments-empty-state">
                <CheckCircle size={64} className="payments-empty-icon" style={{ color: '#10B981' }} />
                <p className="payments-empty-title">Aucun règlement en attente</p>
                <p className="payments-empty-subtitle">Tous les paiements sont à jour !</p>
              </div>
            ) : (
              <div className="payments-table-container">
                <table className="payments-table">
                  <thead>
                    <tr>
                      <th style={{ width: '50px', textAlign: 'center' }}>☑</th>
                      <th>N° Facture</th>
                      <th>Client</th>
                      <th>Vendeuse</th>
                      <th>Date</th>
                      <th style={{ textAlign: 'right' }}>Acompte versé</th>
                      <th style={{ textAlign: 'center' }}>Nb chèques</th>
                      <th style={{ textAlign: 'right' }}>Solde à percevoir</th>
                      <th style={{ textAlign: 'right' }}>Total TTC</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pendingPayments.map((payment) => {
                      const isExpanded = expandedPayments.has(payment.id);
                      const isSelected = selectedPayments.has(payment.id);
                      const vendorColor = getVendorColor(payment.vendorId);

                      return (
                        <React.Fragment key={payment.id}>
                          <tr
                            className="clickable"
                            data-vendor-color={vendorColor}
                            style={{
                              '--vendor-color': vendorColor,
                              '--vendor-color-light': `${vendorColor}15`,
                              backgroundColor: isSelected ? '#FEF3CD' : undefined
                            } as React.CSSProperties}
                            onClick={() => togglePaymentExpansion(payment.id)}
                            title="Cliquer pour voir les détails"
                          >
                            {/* Checkbox de sélection */}
                            <td style={{ textAlign: 'center', padding: '12px' }} onClick={(e) => e.stopPropagation()}>
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => togglePaymentSelection(payment.id)}
                                style={{
                                  width: '20px',
                                  height: '20px',
                                  cursor: 'pointer',
                                  accentColor: '#DC2626'
                                }}
                                title="Cocher si chèque reçu"
                              />
                            </td>
                            <td style={{ fontWeight: 600, color: '#374151', fontSize: '0.8125rem' }}>
                              {payment.invoiceNumber || '-'}
                            </td>
                            <td style={{ fontWeight: 600, color: '#111827', fontSize: '0.8125rem' }} title={payment.clientName}>
                              {payment.clientName}
                            </td>
                            <td>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <span
                                  style={{ 
                                    width: '8px', 
                                    height: '8px', 
                                    borderRadius: '50%', 
                                    background: vendorColor,
                                    border: '1px solid white',
                                    boxShadow: '0 0 0 1px rgba(0,0,0,0.1)'
                                  }}
                                />
                                <span style={{ fontWeight: 600, color: '#374151', fontSize: '0.8125rem' }}>
                                  {payment.vendorName}
                                </span>
                              </div>
                            </td>
                            <td style={{ color: '#6B7280', fontSize: '0.75rem' }}>
                              {payment.date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit' })}
                            </td>
                            <td style={{ 
                              textAlign: 'right', 
                              color: payment.depositAmount && payment.depositAmount > 0 ? '#10B981' : '#9CA3AF', 
                              fontWeight: payment.depositAmount && payment.depositAmount > 0 ? 700 : 400, 
                              fontSize: '0.8125rem' 
                            }}>
                              {payment.depositAmount && payment.depositAmount > 0 ? fmtEUR(payment.depositAmount) : '0 €'}
                            </td>
                            <td style={{ textAlign: 'center', fontSize: '0.75rem' }}>
                              <span style={{ 
                                background: '#FEF3C7', 
                                color: '#92400E', 
                                padding: '3px 8px', 
                                borderRadius: '6px',
                                fontWeight: 600,
                                whiteSpace: 'nowrap'
                              }}>
                                {payment.checkDetails.count} × {fmtEUR(payment.checkDetails.amount)}
                              </span>
                            </td>
                            <td style={{ 
                              textAlign: 'right', 
                              color: '#F59E0B',
                              fontWeight: 700,
                              fontSize: '0.875rem'
                            }}>
                              {fmtEUR(payment.checkDetails.totalAmount)}
                            </td>
                            <td style={{ 
                              textAlign: 'right', 
                              fontWeight: 800, 
                              color: '#111827', 
                              fontSize: '0.9375rem',
                              background: 'linear-gradient(90deg, transparent 0%, #F9FAFB 100%)',
                              borderLeft: '1px solid #E5E7EB'
                            }}>
                              {fmtEUR(payment.saleTotal || payment.checkDetails.totalAmount)}
                            </td>
                          </tr>

                          {/* Ligne de détails expansible */}
                          {isExpanded && (
                            <tr>
                              <td colSpan={8}>
                                <div className="payments-details-panel">
                                  <h4 className="payments-details-title">
                                    📄 Détail des chèques à venir
                                  </h4>

                                  <div className="payments-details-grid">
                                    <div className="payments-detail-box" style={{ background: 'linear-gradient(135deg, #ECFDF5 0%, #D1FAE5 100%)', borderLeft: '3px solid #10B981' }}>
                                      <div className="payments-detail-label" style={{ color: '#065F46' }}>Acompte versé</div>
                                      <div className="payments-detail-value green">
                                        {fmtEUR(payment.depositAmount || 0)}
                                      </div>
                                    </div>

                                    <div className="payments-detail-box" style={{ background: 'linear-gradient(135deg, #FEF3C7 0%, #FDE68A 100%)', borderLeft: '3px solid #F59E0B' }}>
                                      <div className="payments-detail-label" style={{ color: '#92400E' }}>Chèques ({payment.checkDetails.count}×{fmtEUR(payment.checkDetails.amount)})</div>
                                      <div className="payments-detail-value amber">
                                        {fmtEUR(payment.checkDetails.totalAmount)}
                                      </div>
                                    </div>

                                    <div className="payments-detail-box" style={{ 
                                      background: payment.remainingBalance && payment.remainingBalance > 0 
                                        ? 'linear-gradient(135deg, #FEE2E2 0%, #FECACA 100%)' 
                                        : 'linear-gradient(135deg, #F3F4F6 0%, #E5E7EB 100%)', 
                                      borderLeft: payment.remainingBalance && payment.remainingBalance > 0 ? '3px solid #EF4444' : '3px solid #9CA3AF'
                                    }}>
                                      <div className="payments-detail-label" style={{ 
                                        color: payment.remainingBalance && payment.remainingBalance > 0 ? '#991B1B' : '#6B7280' 
                                      }}>Solde à percevoir</div>
                                      <div className="payments-detail-value" style={{ 
                                        color: payment.remainingBalance && payment.remainingBalance > 0 ? '#EF4444' : '#6B7280' 
                                      }}>
                                        {fmtEUR(payment.remainingBalance || 0)}
                                      </div>
                                    </div>

                                    <div className="payments-detail-box" style={{ background: 'linear-gradient(135deg, #EFF6FF 0%, #DBEAFE 100%)', borderLeft: '3px solid #3B82F6' }}>
                                      <div className="payments-detail-label" style={{ color: '#1E40AF' }}>Total TTC</div>
                                      <div className="payments-detail-value blue" style={{ fontSize: '1.75rem' }}>
                                        {fmtEUR(payment.saleTotal || payment.checkDetails.totalAmount)}
                                      </div>
                                    </div>
                                  </div>

                                  {payment.checkDetails.notes && (
                                    <div className="payments-notes">
                                      <div className="payments-notes-label">Notes :</div>
                                      <div className="payments-notes-text">{payment.checkDetails.notes}</div>
                                    </div>
                                  )}

                                  <div className="payments-meta">
                                    <div className="payments-meta-item">
                                      <Calendar size={14} />
                                      {payment.date.toLocaleString('fr-FR')}
                                    </div>
                                    <div className="payments-meta-item">
                                      💳 Paiement par chèques
                                    </div>
                                    {payment.saleTotal && (
                                      <div className="payments-meta-item">
                                        💰 Total vente: {fmtEUR(payment.saleTotal)}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      ) : activeSubTab === 'received' ? (
        <>
          {/* Tableau des règlements perçus */}
          <div className="payments-section">
            <div className="payments-section-header">
              <h3 className="payments-section-title">
                💰 Règlements perçus sur Stand
              </h3>
              <button
                onClick={() => setShowAddModal(true)}
                className="payments-add-btn"
              >
                <Plus size={16} />
                Ajouter
              </button>
            </div>

            {receivedPayments.length === 0 ? (
              <div className="payments-empty-state">
                <Store size={64} className="payments-empty-icon" />
                <p className="payments-empty-title">Aucun règlement perçu</p>
                <p className="payments-empty-subtitle">Les règlements reçus apparaîtront ici</p>
              </div>
            ) : (
              <div className="payments-table-container">
                <table className="payments-table">
                  <thead>
                    <tr>
                      <th>N° Facture</th>
                      <th>Client</th>
                      <th>Vendeuse</th>
                      <th>Date</th>
                      <th style={{ textAlign: 'right' }}>Acompte versé</th>
                      <th style={{ textAlign: 'center' }}>Nb chèques</th>
                      <th style={{ textAlign: 'right' }}>Solde à percevoir</th>
                      <th style={{ textAlign: 'right' }}>Total TTC</th>
                    </tr>
                  </thead>
                  <tbody>
                    {receivedPayments.map((payment) => {
                      const vendorColor = getVendorColor(payment.vendorId);

                      return (
                        <tr
                          key={payment.id}
                          data-vendor-color={vendorColor}
                          style={{
                            '--vendor-color': vendorColor,
                            '--vendor-color-light': `${vendorColor}15`
                          } as React.CSSProperties}
                        >
                          <td style={{ fontWeight: 600, color: '#374151', fontSize: '0.8125rem' }}>
                            {payment.invoiceNumber}
                          </td>
                          <td style={{ fontWeight: 600, color: '#111827', fontSize: '0.8125rem' }} title={payment.clientName}>
                            {payment.clientName}
                          </td>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <span
                                style={{ 
                                  width: '8px', 
                                  height: '8px', 
                                  borderRadius: '50%', 
                                  background: vendorColor,
                                  border: '1px solid white',
                                  boxShadow: '0 0 0 1px rgba(0,0,0,0.1)'
                                }}
                              />
                              <span style={{ fontWeight: 600, color: '#374151', fontSize: '0.8125rem' }}>
                                {payment.vendorName}
                              </span>
                            </div>
                          </td>
                          <td style={{ color: '#6B7280', fontSize: '0.75rem' }}>
                            {payment.date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit' })}
                          </td>
                          <td style={{ 
                            textAlign: 'right', 
                            color: '#10B981', 
                            fontWeight: 700, 
                            fontSize: '0.8125rem' 
                          }}>
                            - {/* Pas d'acompte pour les règlements perçus */}
                          </td>
                          <td style={{ textAlign: 'center', fontSize: '0.75rem' }}>
                            <span style={{ 
                              background: '#FEF3C7', 
                              color: '#92400E', 
                              padding: '3px 8px', 
                              borderRadius: '6px',
                              fontWeight: 600,
                              whiteSpace: 'nowrap'
                            }}>
                              {payment.numberOfChecks} chèque{payment.numberOfChecks > 1 ? 's' : ''}
                            </span>
                          </td>
                          <td style={{ 
                            textAlign: 'right', 
                            color: '#F59E0B',
                            fontWeight: 700,
                            fontSize: '0.875rem'
                          }}>
                            {fmtEUR(payment.checkReceived)}
                          </td>
                          <td style={{ 
                            textAlign: 'right', 
                            fontWeight: 800, 
                            color: '#111827', 
                            fontSize: '0.9375rem',
                            background: 'linear-gradient(90deg, transparent 0%, #F9FAFB 100%)',
                            borderLeft: '1px solid #E5E7EB'
                          }}>
                            {fmtEUR(payment.checkReceived)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      ) : (
        <>
          {/* Onglet Export CSV */}
          <div className="payments-section">
            <div className="payments-section-header">
              <h3 className="payments-section-title">
                📊 Export des règlements à venir
              </h3>
            </div>

            <div style={{
              background: 'white',
              borderRadius: '12px',
              padding: '32px',
              border: '1px solid #E5E7EB',
              textAlign: 'center'
            }}>
              <div style={{
                fontSize: '48px',
                marginBottom: '16px'
              }}>
                📋
              </div>
              
              <h4 style={{
                fontSize: '20px',
                fontWeight: '600',
                color: '#111827',
                marginBottom: '8px'
              }}>
                Règlements à exporter
              </h4>
              
              <p style={{
                fontSize: '16px',
                color: '#6B7280',
                marginBottom: '24px'
              }}>
                {pendingPayments.length > 0 
                  ? `${pendingPayments.length} règlement${pendingPayments.length > 1 ? 's' : ''} en attente de chèque à venir`
                  : 'Aucun règlement à exporter'
                }
              </p>

              {pendingPayments.length > 0 && (
                <div style={{
                  background: '#F9FAFB',
                  borderRadius: '8px',
                  padding: '16px',
                  marginBottom: '24px',
                  textAlign: 'left'
                }}>
                  <h5 style={{
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#374151',
                    marginBottom: '8px'
                  }}>
                    Résumé des données à exporter :
                  </h5>
                  <ul style={{
                    fontSize: '14px',
                    color: '#6B7280',
                    margin: 0,
                    paddingLeft: '20px'
                  }}>
                    <li>N° Facture et nom du client</li>
                    <li>Vendeuse et date de la vente</li>
                    <li>Acompte versé et nombre de chèques</li>
                    <li>Montant par chèque et total TTC</li>
                    <li>Source (Vente Caisse ou Facture N8N)</li>
                  </ul>
                </div>
              )}

              <button
                onClick={exportToCSV}
                disabled={pendingPayments.length === 0}
                style={{
                  backgroundColor: pendingPayments.length > 0 ? '#10B981' : '#9CA3AF',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '16px 32px',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: pendingPayments.length > 0 ? 'pointer' : 'not-allowed',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  margin: '0 auto',
                  opacity: pendingPayments.length > 0 ? 1 : 0.6,
                  transition: 'all 0.2s ease'
                }}
              >
                <Download size={20} />
                Exporter en CSV
                {pendingPayments.length > 0 && ` (${pendingPayments.length} règlements)`}
              </button>

              {pendingPayments.length > 0 && (
                <p style={{
                  fontSize: '12px',
                  color: '#9CA3AF',
                  marginTop: '16px',
                  marginBottom: 0
                }}>
                  Le fichier sera téléchargé avec le nom : reglements-avenir-{new Date().toISOString().split('T')[0]}.csv
                </p>
              )}
            </div>
          </div>
        </>
      )}

      {/* Modale d'ajout de règlement */}
      {showAddModal && (
        <div className="payments-modal-overlay">
          <div className="payments-modal">
            <div className="payments-modal-header">
              <Plus size={24} style={{ color: '#10B981' }} />
              <h3 className="payments-modal-title">
                Nouveau règlement perçu
              </h3>
            </div>

            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              const newPayment: Omit<ReceivedPayment, 'id'> = {
                clientName: formData.get('clientName') as string,
                invoiceNumber: formData.get('invoiceNumber') as string,
                checkReceived: parseFloat(formData.get('checkReceived') as string),
                numberOfChecks: parseInt(formData.get('numberOfChecks') as string),
                vendorId: formData.get('vendorId') as string,
                vendorName: vendors.find(v => v.id === formData.get('vendorId'))?.name || '',
                date: new Date(formData.get('date') as string)
              };
              handleAddPayment(newPayment);
            }}>
              <div className="payments-form-group">
                <label className="payments-form-label required">
                  Nom du client
                </label>
                <input
                  type="text"
                  name="clientName"
                  required
                  className="payments-form-input"
                  placeholder="Nom complet du client"
                />
              </div>

              <div className="payments-form-group">
                <label className="payments-form-label required">
                  Numéro de facture
                </label>
                <input
                  type="text"
                  name="invoiceNumber"
                  required
                  className="payments-form-input"
                  placeholder="Ex: FAC-2024-001"
                />
              </div>

              <div className="payments-form-group">
                <label className="payments-form-label required">
                  Montant du chèque reçu
                </label>
                <input
                  type="number"
                  name="checkReceived"
                  step="0.01"
                  required
                  className="payments-form-input"
                  placeholder="0.00"
                />
              </div>

              <div className="payments-form-group">
                <label className="payments-form-label required">
                  Nombre de chèques
                </label>
                <input
                  type="number"
                  name="numberOfChecks"
                  min="1"
                  required
                  defaultValue="1"
                  className="payments-form-input"
                  placeholder="1"
                />
              </div>

              <div className="payments-form-group">
                <label className="payments-form-label required">
                  Vendeuse
                </label>
                <select
                  name="vendorId"
                  required
                  className="payments-form-select"
                >
                  <option value="">Sélectionner une vendeuse</option>
                  {vendors.map(vendor => (
                    <option key={vendor.id} value={vendor.id}>
                      {vendor.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="payments-form-group">
                <label className="payments-form-label required">
                  Date du règlement
                </label>
                <input
                  type="date"
                  name="date"
                  required
                  defaultValue={new Date().toISOString().split('T')[0]}
                  className="payments-form-input"
                />
              </div>

              <div className="payments-form-actions">
                <button
                  type="submit"
                  className="payments-form-btn submit"
                >
                  <Save size={16} />
                  Ajouter
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="payments-form-btn cancel"
                >
                  <X size={16} />
                  Annuler
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
