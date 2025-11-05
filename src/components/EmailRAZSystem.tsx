import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Mail, Send, Clock, Settings, CheckCircle, AlertCircle, Download, Bell, FileDown, Eye } from 'lucide-react';
import { EmailService } from '../services/emailService';
import { PrintService } from '../services/printService';
import { formatCurrency, formatDate, formatTime, calculateDailySummary, getTodayData } from '../utils/dateUtils';
import type { Sale, VendorStat, DailySummary, EmailConfig, EmailStatus, ActionStatus } from '../types';

type Tabs = 'manual' | 'automatic' | 'config';
type SendConfig = EmailConfig & { isManual?: boolean; isTest?: boolean };

const STORAGE_KEY = 'myconfort-email-config';

interface Props {
  sales?: Sale[];
  vendorStats?: VendorStat[];
  onRAZComplete?: (() => void) | null;
  className?: string;
}

const EmailRAZSystem: React.FC<Props> = ({
  sales = [],
  vendorStats = [],
  onRAZComplete = null,
  className = '',
}) => {
  // —— États pour la configuration email
  const [emailConfig, setEmailConfig] = useState<EmailConfig>({
    recipientEmail: '',
    ccEmails: '',
    subject: 'Rapport de Caisse MyConfort - [DATE]',
    autoSendEnabled: false,
    autoSendTime: '20:00',
    performRAZ: false,
    attachPDF: true,
    attachData: false,
    includeDetails: true,
  });

  // —— États UI
  const [activeTab, setActiveTab] = useState<Tabs>('manual');
  const [isSending, setIsSending] = useState<boolean>(false);
  const [lastAction, setLastAction] = useState<ActionStatus | null>(null);
  const [emailStatus, setEmailStatus] = useState<EmailStatus | null>(null);
  const [configErrors, setConfigErrors] = useState<string[]>([]);

  // —— États PDF
  const [showPdfPreview, setShowPdfPreview] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const PRINT_ELEMENT_ID = 'email-raz-print-root';

  // —— Données calculées
  const todaySales = useMemo<Sale[]>(() => getTodayData(sales), [sales]);
  const dailySummary = useMemo<DailySummary>(() => calculateDailySummary(todaySales), [todaySales]);

  // —— Charger la configuration sauvegardée
  useEffect(() => {
    const savedConfig = localStorage.getItem(STORAGE_KEY);
    if (savedConfig) {
      try {
        const parsed = JSON.parse(savedConfig) as Partial<EmailConfig>;
        setEmailConfig(prev => ({ ...prev, ...parsed }));
      } catch (error) {
        console.error('Erreur chargement config email:', error);
      }
    }
  }, []);

  // —— Sauvegarder la configuration
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(emailConfig));
  }, [emailConfig]);

  // —— Vérifier le statut du système automatique
  useEffect(() => {
    let interval: number | undefined;

    const checkEmailStatus = async () => {
      try {
        const status = await EmailService.getEmailStatus();
        setEmailStatus(status);
      } catch (error) {
        console.error('Erreur statut email:', error);
      }
    };

    checkEmailStatus();
    interval = window.setInterval(checkEmailStatus, 30000);

    return () => {
      if (interval !== undefined) window.clearInterval(interval);
    };
  }, []);

  // —— Validation de la configuration
  useEffect(() => {
    const errors = EmailService.validateEmailConfig(emailConfig);
    setConfigErrors(errors);
  }, [emailConfig]);

  // —— Handlers avec useCallback pour optimiser les re-renders
  const handleSendManualEmail = useCallback(async () => {
    try {
      setIsSending(true);
      setLastAction(null);

      if (configErrors.length > 0) {
        throw new Error('Configuration invalide: ' + configErrors.join(', '));
      }
      if (!emailConfig.recipientEmail) {
        throw new Error('Destinataire requis');
      }

      // Préparer les données du rapport
      const reportData = {
        ...dailySummary,
        vendors: vendorStats.map((vendor: VendorStat) => ({
          id: vendor.id,
          name: vendor.name,
          dailySales: vendor.dailySales ?? 0,
          totalSales: vendor.totalSales ?? 0,
        })),
        detailedSales: emailConfig.includeDetails ? todaySales.slice(0, 50) : [],
      };

      // Préparer la configuration d'envoi
      const sendConfig: SendConfig = {
        ...emailConfig,
        subject: emailConfig.subject.replace('[DATE]', formatDate(new Date())),
        isManual: true,
      };

      const result = await EmailService.sendDailyReport(reportData, sendConfig);
      
      if (!result.ok) {
        throw new Error(result.error || 'Erreur inconnue');
      }

      setLastAction({
        type: 'success',
        message: 'Email envoyé avec succès !',
        details: `Envoyé à ${emailConfig.recipientEmail}`,
        timestamp: Date.now(),
      });

      // Effectuer RAZ si demandé
      if (emailConfig.performRAZ && onRAZComplete) {
        try {
          await EmailService.performRAZ();
          onRAZComplete();
          setLastAction(prev => prev ? {
            ...prev,
            details: prev.details + ' • RAZ effectuée'
          } : null);
        } catch (razError) {
          console.warn('Erreur RAZ après envoi:', razError);
        }
      }

    } catch (error) {
      const errMsg = error instanceof Error ? error.message : 'Erreur inconnue';
      console.error('❌ Erreur envoi email:', error);
      setLastAction({
        type: 'error',
        message: "Échec de l'envoi de l'email",
        details: errMsg,
        timestamp: Date.now(),
      });
    } finally {
      setIsSending(false);
    }
  }, [configErrors, emailConfig, dailySummary, vendorStats, todaySales, onRAZComplete]);

  const handleTestEmail = useCallback(async () => {
    try {
      setIsSending(true);
      setLastAction(null);

      if (!emailConfig.recipientEmail) {
        throw new Error('Email destinataire requis pour le test');
      }

      const result = await EmailService.testEmailConfiguration(emailConfig);
      
      if (!result.ok) {
        throw new Error(result.error || 'Test échoué');
      }

      setLastAction({
        type: 'success',
        message: 'Email de test envoyé !',
        details: 'Vérifiez votre boîte de réception',
        timestamp: Date.now(),
      });
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : 'Erreur inconnue';
      console.error('❌ Test email échoué:', error);
      setLastAction({
        type: 'error',
        message: 'Test email échoué',
        details: errMsg,
        timestamp: Date.now(),
      });
    } finally {
      setIsSending(false);
    }
  }, [emailConfig]);

  const handleScheduleAutomatic = useCallback(async () => {
    try {
      setIsSending(true);
      setLastAction(null);

      if (configErrors.length > 0) {
        throw new Error('Configuration invalide: ' + configErrors.join(', '));
      }
      if (!emailConfig.autoSendEnabled) {
        throw new Error("Active d'abord l'envoi automatique");
      }

      const result = await EmailService.scheduleAutomaticEmail(emailConfig);
      
      if (!result.ok) {
        throw new Error(result.error || 'Programmation échouée');
      }

      setLastAction({
        type: 'success',
        message: 'Envoi automatique configuré !',
        details: `Programmé tous les jours à ${emailConfig.autoSendTime}`,
        timestamp: Date.now(),
      });

      setEmailStatus(prev => ({ ...(prev ?? { scheduled: false }), scheduled: true }));
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : 'Erreur inconnue';
      console.error('❌ Erreur programmation:', error);
      setLastAction({
        type: 'error',
        message: 'Échec de la programmation',
        details: errMsg,
        timestamp: Date.now(),
      });
    } finally {
      setIsSending(false);
    }
  }, [configErrors, emailConfig]);

  const handlePreviewEmail = useCallback(() => {
    const previewData = {
      ...dailySummary,
      vendors: vendorStats.map((vendor: VendorStat) => ({
        id: vendor.id,
        name: vendor.name,
        dailySales: vendor.dailySales ?? 0,
        totalSales: vendor.totalSales ?? 0,
      })),
    };

    try {
      const emailHTML = EmailService.generateEmailPreview(previewData);
      
      const previewWindow = window.open('', '_blank', 'width=800,height=600');
      if (previewWindow) {
        previewWindow.document.write(emailHTML);
        previewWindow.document.close();
      }
    } catch (error) {
      // Fallback JSON si generateEmailPreview échoue
      const fallbackContent = `
        <!doctype html>
        <html><head><meta charset="utf-8"><title>Aperçu Données</title></head>
        <body style="font-family:monospace;padding:20px;">
        <h2>Aperçu des données (JSON)</h2>
        <pre>${JSON.stringify(previewData, null, 2)}</pre>
        </body></html>
      `;
      
      const previewWindow = window.open('', '_blank', 'width=800,height=600');
      if (previewWindow) {
        previewWindow.document.write(fallbackContent);
        previewWindow.document.close();
      }
    }
  }, [dailySummary, vendorStats]);

  // —— Export PDF
  const handleExportPDF = useCallback(async () => {
    try {
      setLastAction({ type: 'info', message: 'Génération du PDF en cours...', timestamp: Date.now() });

      const result = await PrintService.generatePDF({
        elementId: PRINT_ELEMENT_ID,
        fileName: `rapport-caisse-${formatDate(new Date()).replace(/\s/g, '-')}.pdf`,
        format: 'A4',
        marginMm: 15,
        // autoDownload par défaut = true (donc téléchargement direct)
      });

      if (result.ok) {
        setLastAction({ type: 'success', message: 'PDF exporté avec succès !', timestamp: Date.now() });
      } else {
        setLastAction({
          type: 'error',
          message: result.error || 'Erreur lors de l\'export PDF',
          timestamp: Date.now(),
        });
      }
    } catch {
      setLastAction({
        type: 'error',
        message: 'Erreur lors de l\'export PDF',
        timestamp: Date.now(),
      });
    }
  }, [PRINT_ELEMENT_ID]);

  // —— Aperçu PDF
  const handlePreviewPDF = useCallback(async () => {
    try {
      setLastAction({ type: 'info', message: 'Génération de l\'aperçu PDF...', timestamp: Date.now() });

      const result = await PrintService.generatePDF({
        elementId: PRINT_ELEMENT_ID,
        fileName: 'apercu-rapport.pdf',
        format: 'A4',
        marginMm: 15,
        autoDownload: false, // 🔑 empêche le téléchargement auto en mode aperçu
      });

      if (result.ok && result.blobUrl) {
        setPdfUrl(result.blobUrl);
        setShowPdfPreview(true);
        setLastAction({ type: 'success', message: 'Aperçu PDF généré !', timestamp: Date.now() });
      } else {
        setLastAction({
          type: 'error',
          message: result.error || 'Erreur lors de la génération de l\'aperçu',
          timestamp: Date.now(),
        });
      }
    } catch {
      setLastAction({
        type: 'error',
        message: 'Erreur lors de la génération de l\'aperçu PDF',
        timestamp: Date.now(),
      });
    }
  }, [PRINT_ELEMENT_ID]);

  // —— Fermer l'aperçu PDF
  const handleClosePdfPreview = useCallback(() => {
    setShowPdfPreview(false);
    if (pdfUrl) {
      URL.revokeObjectURL(pdfUrl);
      setPdfUrl(null);
    }
  }, [pdfUrl]);

  // —— Effacer le message flash après 5 s
  useEffect(() => {
    let timeout: NodeJS.Timeout;
    if (lastAction) {
      timeout = setTimeout(() => setLastAction(null), 5000);
    }
    return () => {
      if (timeout) clearTimeout(timeout);
    };
  }, [lastAction]);

  return (
    <div
      className={`email-raz-container ${className}`}
      style={{
        maxWidth: '900px',
        margin: '0 auto',
        padding: '20px',
        fontFamily: 'Arial, sans-serif',
      }}
    >
      {/* En-tête */}
      <div
        style={{
          background: 'linear-gradient(135deg, #6f42c1 0%, #e83e8c 100%)',
          color: 'white',
          padding: '25px',
          borderRadius: '12px',
          marginBottom: '25px',
          textAlign: 'center',
        }}
      >
        <h1
          style={{
            margin: '0 0 10px 0',
            fontSize: '28px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '12px',
          }}
        >
          <Mail size={32} />
          Système E-mail & RAZ Automatique
        </h1>
        <p style={{ margin: 0, opacity: 0.9, fontSize: '16px' }}>
          Envoi automatique des rapports quotidiens avec remise à zéro programmée
        </p>
      </div>

      {/* Statut du système */}
      {emailStatus && (
        <div
          style={{
            background: emailStatus.scheduled ? '#d4edda' : '#fff3cd',
            border: `1px solid ${emailStatus.scheduled ? '#c3e6cb' : '#ffeaa7'}`,
            borderRadius: '8px',
            padding: '15px',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
          }}
        >
          {emailStatus.scheduled ? <CheckCircle size={20} color="#28a745" /> : <Clock size={20} color="#856404" />}
          <span
            style={{
              color: emailStatus.scheduled ? '#155724' : '#856404',
              fontWeight: '500',
            }}
          >
            {emailStatus.scheduled ? `✅ Envoi automatique ACTIF (${emailConfig.autoSendTime})` : '⏸️ Aucun envoi automatique programmé'}
          </span>
        </div>
      )}

      {/* Messages de statut */}
      {lastAction && (
        <div
          style={{
            background: lastAction.type === 'success' ? '#d4edda' : '#f8d7da',
            border: `1px solid ${lastAction.type === 'success' ? '#c3e6cb' : '#f5c6cb'}`,
            borderRadius: '8px',
            padding: '15px',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '10px',
          }}
          role="alert"
          aria-live="polite"
        >
          {lastAction.type === 'success' ? <CheckCircle size={20} color="#28a745" /> : <AlertCircle size={20} color="#dc3545" />}
          <div style={{ flex: 1 }}>
            <div
              style={{
                fontWeight: '600',
                color: lastAction.type === 'success' ? '#155724' : '#721c24',
              }}
            >
              {lastAction.message}
            </div>
            {lastAction.details && (
              <div
                style={{
                  fontSize: '14px',
                  color: lastAction.type === 'success' ? '#155724' : '#721c24',
                  opacity: 0.8,
                  marginTop: '4px',
                }}
              >
                {lastAction.details}
              </div>
            )}
          </div>
          <small
            style={{
              color: lastAction.type === 'success' ? '#155724' : '#721c24',
              opacity: 0.8,
            }}
          >
            {formatTime(new Date(lastAction.timestamp))}
          </small>
        </div>
      )}

      {/* Navigation par onglets */}
      <div style={{ display: 'flex', marginBottom: '25px', borderBottom: '2px solid #e9ecef' }} role="tablist">
        {[
          { id: 'manual', label: 'Envoi Manuel', icon: Send },
          { id: 'automatic', label: 'Envoi Automatique', icon: Bell },
          { id: 'config', label: 'Configuration', icon: Settings },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as Tabs)}
            role="tab"
            aria-selected={activeTab === tab.id}
            aria-controls={`panel-${tab.id}`}
            style={{
              padding: '12px 20px',
              border: 'none',
              background: activeTab === (tab.id as Tabs) ? '#6f42c1' : 'transparent',
              color: activeTab === (tab.id as Tabs) ? 'white' : '#6c757d',
              borderRadius: '8px 8px 0 0',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontWeight: '600',
              transition: 'all 0.2s ease',
            }}
          >
            <tab.icon size={16} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Contenu des onglets */}
      <div
        style={{
          background: 'white',
          border: '1px solid #e9ecef',
          borderRadius: '8px',
          padding: '25px',
        }}
      >
        {/* Onglet Envoi Manuel */}
        {activeTab === 'manual' && (
          <div role="tabpanel" id="panel-manual" aria-labelledby="tab-manual">
            <h3 style={{ margin: '0 0 20px 0', color: '#495057' }}>📤 Envoi Manuel du Rapport</h3>

            {/* Aperçu des données */}
            <div
              id={PRINT_ELEMENT_ID}
              style={{
                background: '#f8f9fa',
                border: '1px solid #e9ecef',
                borderRadius: '8px',
                padding: '20px',
                marginBottom: '20px',
              }}
            >
              <h4 style={{ margin: '0 0 15px 0', color: '#495057' }}>📊 Données à envoyer</h4>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                  gap: '15px',
                }}
              >
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#28a745' }}>{formatCurrency(dailySummary.totalSales)}</div>
                  <div style={{ fontSize: '12px', color: '#6c757d' }}>CA du jour</div>
                </div>

                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#007bff' }}>{dailySummary.salesCount}</div>
                  <div style={{ fontSize: '12px', color: '#6c757d' }}>Ventes</div>
                </div>

                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#6f42c1' }}>{vendorStats.length}</div>
                  <div style={{ fontSize: '12px', color: '#6c757d' }}>Vendeuses</div>
                </div>

                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#fd7e14' }}>{emailConfig.includeDetails ? todaySales.length : 0}</div>
                  <div style={{ fontSize: '12px', color: '#6c757d' }}>Détails inclus</div>
                </div>
              </div>
            </div>

            {/* Boutons d'action */}
            <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
              <button
                onClick={handleSendManualEmail}
                disabled={isSending || !emailConfig.recipientEmail}
                style={{
                  padding: '12px 24px',
                  background: isSending ? '#6c757d' : '#28a745',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontWeight: '600',
                  cursor: isSending ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <Send size={16} />
                {isSending ? 'Envoi...' : 'Envoyer Rapport'}
              </button>

              <button
                onClick={handleTestEmail}
                disabled={isSending || !emailConfig.recipientEmail}
                style={{
                  padding: '12px 24px',
                  background: isSending ? '#6c757d' : '#007bff',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontWeight: '600',
                  cursor: isSending ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <Mail size={16} />
                {isSending ? 'Test...' : 'Test Email'}
              </button>

              <button
                onClick={handlePreviewEmail}
                style={{
                  padding: '12px 24px',
                  background: '#6c757d',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <Download size={16} />
                Aperçu
              </button>

              <button
                onClick={handleExportPDF}
                style={{
                  padding: '12px 24px',
                  background: '#dc3545',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <FileDown size={16} />
                Exporter PDF
              </button>

              <button
                onClick={handlePreviewPDF}
                style={{
                  padding: '12px 24px',
                  background: '#fd7e14',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <Eye size={16} />
                Aperçu PDF
              </button>
            </div>
          </div>
        )}

        {/* Onglet Envoi Automatique */}
        {activeTab === 'automatic' && (
          <div role="tabpanel" id="panel-automatic" aria-labelledby="tab-automatic">
            <h3 style={{ margin: '0 0 20px 0', color: '#495057' }}>🔄 Envoi Automatique</h3>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '15px' }}>
                <input
                  type="checkbox"
                  checked={emailConfig.autoSendEnabled}
                  onChange={(e) => setEmailConfig(prev => ({ ...prev, autoSendEnabled: e.target.checked }))}
                />
                <span style={{ fontWeight: '600' }}>Activer l'envoi automatique quotidien</span>
              </label>

              {emailConfig.autoSendEnabled && (
                <div style={{ marginLeft: '26px' }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                    Heure d'envoi :
                  </label>
                  <input
                    type="time"
                    value={emailConfig.autoSendTime}
                    onChange={(e) => setEmailConfig(prev => ({ ...prev, autoSendTime: e.target.value }))}
                    style={{
                      padding: '8px 12px',
                      border: '1px solid #e9ecef',
                      borderRadius: '6px',
                      fontSize: '14px',
                    }}
                  />
                </div>
              )}
            </div>

            <button
              onClick={handleScheduleAutomatic}
              disabled={isSending || !emailConfig.autoSendEnabled}
              style={{
                padding: '12px 24px',
                background: isSending ? '#6c757d' : '#6f42c1',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontWeight: '600',
                cursor: isSending ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <Bell size={16} />
              {isSending ? 'Configuration...' : 'Configurer Envoi Auto'}
            </button>
          </div>
        )}

        {/* Onglet Configuration */}
        {activeTab === 'config' && (
          <div role="tabpanel" id="panel-config" aria-labelledby="tab-config">
            <h3 style={{ margin: '0 0 20px 0', color: '#495057' }}>⚙️ Configuration Email</h3>

            <div style={{ display: 'grid', gap: '20px', maxWidth: '500px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                  Email destinataire *
                </label>
                <input
                  type="email"
                  value={emailConfig.recipientEmail}
                  onChange={(e) => setEmailConfig(prev => ({ ...prev, recipientEmail: e.target.value }))}
                  placeholder="exemple@myconfort.com"
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid #e9ecef',
                    borderRadius: '6px',
                    fontSize: '14px',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                  Emails en copie (CC)
                </label>
                <input
                  type="text"
                  value={emailConfig.ccEmails}
                  onChange={(e) => setEmailConfig(prev => ({ ...prev, ccEmails: e.target.value }))}
                  placeholder="email1@myconfort.com, email2@myconfort.com"
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid #e9ecef',
                    borderRadius: '6px',
                    fontSize: '14px',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                  Sujet de l'email
                </label>
                <input
                  type="text"
                  value={emailConfig.subject}
                  onChange={(e) => setEmailConfig(prev => ({ ...prev, subject: e.target.value }))}
                  placeholder="Rapport de Caisse MyConfort - [DATE]"
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid #e9ecef',
                    borderRadius: '6px',
                    fontSize: '14px',
                  }}
                />
                <small style={{ color: '#6c757d', fontSize: '12px' }}>
                  Utilisez [DATE] pour insérer automatiquement la date
                </small>
              </div>

              <div>
                <h4 style={{ margin: '0 0 10px 0', fontSize: '16px' }}>Options d'envoi</h4>
                
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <input
                    type="checkbox"
                    checked={emailConfig.attachPDF}
                    onChange={(e) => setEmailConfig(prev => ({ ...prev, attachPDF: e.target.checked }))}
                  />
                  <span>Joindre le rapport en PDF</span>
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <input
                    type="checkbox"
                    checked={emailConfig.includeDetails}
                    onChange={(e) => setEmailConfig(prev => ({ ...prev, includeDetails: e.target.checked }))}
                  />
                  <span>Inclure les détails des ventes (max 50)</span>
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input
                    type="checkbox"
                    checked={emailConfig.performRAZ}
                    onChange={(e) => setEmailConfig(prev => ({ ...prev, performRAZ: e.target.checked }))}
                  />
                  <span style={{ color: '#dc3545', fontWeight: '600' }}>
                    Effectuer une RAZ après envoi (Attention!)
                  </span>
                </label>
              </div>
            </div>

            {configErrors.length > 0 && (
              <div
                style={{
                  background: '#f8d7da',
                  border: '1px solid #f5c6cb',
                  borderRadius: '6px',
                  padding: '12px',
                  marginTop: '20px',
                }}
                role="alert"
              >
                <strong style={{ color: '#721c24' }}>Erreurs de configuration :</strong>
                <ul style={{ margin: '8px 0 0 0', paddingLeft: '20px' }}>
                  {configErrors.map((error, index) => (
                    <li key={index} style={{ color: '#721c24' }}>{error}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modale d'aperçu PDF */}
      {showPdfPreview && pdfUrl && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
          onClick={handleClosePdfPreview}
          role="dialog"
          aria-modal="true"
          aria-labelledby="pdf-preview-title"
        >
          <div
            style={{
              background: 'white',
              borderRadius: '12px',
              padding: '20px',
              maxWidth: '90vw',
              maxHeight: '90vh',
              width: '800px',
              height: '600px',
              display: 'flex',
              flexDirection: 'column',
              gap: '15px',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                borderBottom: '1px solid #e9ecef',
                paddingBottom: '15px',
              }}
            >
              <h3 id="pdf-preview-title" style={{ margin: 0, color: '#495057' }}>
                📄 Aperçu PDF du Rapport
              </h3>
              <button
                onClick={handleClosePdfPreview}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '24px',
                  cursor: 'pointer',
                  color: '#6c757d',
                  padding: '0',
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '4px',
                }}
                aria-label="Fermer l'aperçu"
              >
                ×
              </button>
            </div>
            
            <iframe
              src={pdfUrl}
              style={{
                flex: 1,
                border: '1px solid #e9ecef',
                borderRadius: '8px',
                width: '100%',
              }}
              title="Aperçu du rapport PDF"
            />
            
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => window.open(pdfUrl, '_blank')}
                style={{
                  padding: '8px 16px',
                  background: '#007bff',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontWeight: '500',
                }}
              >
                📥 Télécharger
              </button>
              <button
                onClick={handleClosePdfPreview}
                style={{
                  padding: '8px 16px',
                  background: '#6c757d',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontWeight: '500',
                }}
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmailRAZSystem;
