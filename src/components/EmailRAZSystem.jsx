import React, { useState, useEffect, useMemo } from 'react';
import { Mail, Send, Clock, Settings, CheckCircle, AlertCircle, Download, RefreshCw, Calendar, Bell } from 'lucide-react';
import { EmailService } from '../services/emailService';
import { formatCurrency, formatDate, formatTime, calculateDailySummary, getTodayData } from '../utils/dateUtils';

const EmailRAZSystem = ({ sales = [], vendorStats = [], onRAZComplete = null, className = '' }) => {
  // États pour la configuration email
  const [emailConfig, setEmailConfig] = useState({
    recipientEmail: '',
    ccEmails: '',
    subject: 'Rapport de Caisse MyConfort - [DATE]',
    autoSendEnabled: false,
    autoSendTime: '20:00',
    performRAZ: false,
    attachPDF: true,
    attachData: false,
    includeDetails: true
  });

  // États pour l'interface
  const [activeTab, setActiveTab] = useState('manual');
  const [isSending, setIsSending] = useState(false);
  const [lastAction, setLastAction] = useState(null);
  const [emailStatus, setEmailStatus] = useState(null);
  const [configErrors, setConfigErrors] = useState([]);

  // Données calculées
  const todaySales = useMemo(() => getTodayData(sales), [sales]);
  const dailySummary = useMemo(() => calculateDailySummary(todaySales), [todaySales]);

  // Charger la configuration sauvegardée
  useEffect(() => {
    const savedConfig = localStorage.getItem('myconfort-email-config');
    if (savedConfig) {
      try {
        const parsed = JSON.parse(savedConfig);
        setEmailConfig(prev => ({ ...prev, ...parsed }));
      } catch (error) {
        console.error('Erreur chargement config email:', error);
      }
    }
  }, []);

  // Sauvegarder la configuration
  useEffect(() => {
    localStorage.setItem('myconfort-email-config', JSON.stringify(emailConfig));
  }, [emailConfig]);

  // Vérifier le statut du système automatique
  useEffect(() => {
    const checkEmailStatus = async () => {
      try {
        const status = await EmailService.getEmailStatus();
        setEmailStatus(status);
      } catch (error) {
        console.error('Erreur statut email:', error);
      }
    };

    checkEmailStatus();
    const interval = setInterval(checkEmailStatus, 30000); // Vérifier toutes les 30 secondes
    return () => clearInterval(interval);
  }, []);

  // Validation de la configuration
  useEffect(() => {
    const errors = EmailService.validateEmailConfig(emailConfig);
    setConfigErrors(errors);
  }, [emailConfig]);

  const handleSendManualEmail = async () => {
    try {
      setIsSending(true);
      setLastAction(null);

      if (configErrors.length > 0) {
        throw new Error('Configuration invalide: ' + configErrors.join(', '));
      }

      // Préparer les données du rapport
      const reportData = {
        ...dailySummary,
        vendors: vendorStats.map(vendor => ({
          name: vendor.name,
          sales: vendor.dailySales || 0,
          totalSales: vendor.totalSales || 0
        })),
        detailedSales: todaySales.slice(0, 50) // Limiter les détails
      };

      // Préparer la configuration d'envoi
      const sendConfig = {
        ...emailConfig,
        subject: emailConfig.subject.replace('[DATE]', formatDate(new Date())),
        isManual: true
      };

      const result = await EmailService.sendDailyReport(reportData, sendConfig);

      setLastAction({
        type: 'success',
        message: 'Email envoyé avec succès !',
        details: `Envoyé à ${emailConfig.recipientEmail}`,
        timestamp: new Date()
      });

      console.log('✅ Email envoyé:', result);
      
    } catch (error) {
      console.error('❌ Erreur envoi email:', error);
      setLastAction({
        type: 'error',
        message: 'Échec de l\'envoi de l\'email',
        details: error.message,
        timestamp: new Date()
      });
    } finally {
      setIsSending(false);
    }
  };

  const handleTestEmail = async () => {
    try {
      setIsSending(true);
      setLastAction(null);

      if (!emailConfig.recipientEmail) {
        throw new Error('Email destinataire requis pour le test');
      }

      const result = await EmailService.testEmailConfiguration(emailConfig);

      setLastAction({
        type: 'success',
        message: 'Email de test envoyé !',
        details: 'Vérifiez votre boîte de réception',
        timestamp: new Date()
      });

      console.log('✅ Test email réussi:', result);
      
    } catch (error) {
      console.error('❌ Test email échoué:', error);
      setLastAction({
        type: 'error',
        message: 'Test email échoué',
        details: error.message,
        timestamp: new Date()
      });
    } finally {
      setIsSending(false);
    }
  };

  const handleScheduleAutomatic = async () => {
    try {
      setIsSending(true);
      setLastAction(null);

      if (configErrors.length > 0) {
        throw new Error('Configuration invalide: ' + configErrors.join(', '));
      }

      const result = await EmailService.scheduleAutomaticEmail(emailConfig);

      setLastAction({
        type: 'success',
        message: 'Envoi automatique configuré !',
        details: `Programmé tous les jours à ${emailConfig.autoSendTime}`,
        timestamp: new Date()
      });

      // Mettre à jour le statut
      setEmailStatus({ ...emailStatus, scheduled: true });

      console.log('✅ Envoi automatique programmé:', result);
      
    } catch (error) {
      console.error('❌ Erreur programmation:', error);
      setLastAction({
        type: 'error',
        message: 'Échec de la programmation',
        details: error.message,
        timestamp: new Date()
      });
    } finally {
      setIsSending(false);
    }
  };

  const handlePreviewEmail = () => {
    const previewData = {
      ...dailySummary,
      vendors: vendorStats.map(vendor => ({
        name: vendor.name,
        sales: vendor.dailySales || 0,
        totalSales: vendor.totalSales || 0
      }))
    };

    const emailHTML = EmailService.generateEmailPreview(previewData);
    
    const previewWindow = window.open('', '_blank', 'width=800,height=600');
    if (previewWindow) {
      previewWindow.document.write(emailHTML);
      previewWindow.document.close();
    }
  };

  // Effacer les messages après 5 secondes
  useEffect(() => {
    if (lastAction) {
      const timer = setTimeout(() => setLastAction(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [lastAction]);

  return (
    <div className={`email-raz-container ${className}`} style={{ 
      maxWidth: '900px', 
      margin: '0 auto', 
      padding: '20px',
      fontFamily: 'Arial, sans-serif'
    }}>
      {/* En-tête */}
      <div style={{
        background: 'linear-gradient(135deg, #6f42c1 0%, #e83e8c 100%)',
        color: 'white',
        padding: '25px',
        borderRadius: '12px',
        marginBottom: '25px',
        textAlign: 'center'
      }}>
        <h1 style={{ 
          margin: '0 0 10px 0', 
          fontSize: '28px', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          gap: '12px' 
        }}>
          <Mail size={32} />
          Système E-mail & RAZ Automatique
        </h1>
        <p style={{ margin: 0, opacity: 0.9, fontSize: '16px' }}>
          Envoi automatique des rapports quotidiens avec remise à zéro programmée
        </p>
      </div>

      {/* Statut du système */}
      {emailStatus && (
        <div style={{
          background: emailStatus.scheduled ? '#d4edda' : '#fff3cd',
          border: `1px solid ${emailStatus.scheduled ? '#c3e6cb' : '#ffeaa7'}`,
          borderRadius: '8px',
          padding: '15px',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px'
        }}>
          {emailStatus.scheduled ? <CheckCircle size={20} color="#28a745" /> : <Clock size={20} color="#856404" />}
          <span style={{ 
            color: emailStatus.scheduled ? '#155724' : '#856404',
            fontWeight: '500'
          }}>
            {emailStatus.scheduled 
              ? `✅ Envoi automatique ACTIF (${emailConfig.autoSendTime})`
              : '⏸️ Aucun envoi automatique programmé'
            }
          </span>
        </div>
      )}

      {/* Messages de statut */}
      {lastAction && (
        <div style={{
          background: lastAction.type === 'success' ? '#d4edda' : '#f8d7da',
          border: `1px solid ${lastAction.type === 'success' ? '#c3e6cb' : '#f5c6cb'}`,
          borderRadius: '8px',
          padding: '15px',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'flex-start',
          gap: '10px'
        }}>
          {lastAction.type === 'success' ? <CheckCircle size={20} color="#28a745" /> : <AlertCircle size={20} color="#dc3545" />}
          <div style={{ flex: 1 }}>
            <div style={{ 
              fontWeight: '600',
              color: lastAction.type === 'success' ? '#155724' : '#721c24'
            }}>
              {lastAction.message}
            </div>
            {lastAction.details && (
              <div style={{ 
                fontSize: '14px',
                color: lastAction.type === 'success' ? '#155724' : '#721c24',
                opacity: 0.8,
                marginTop: '4px'
              }}>
                {lastAction.details}
              </div>
            )}
          </div>
          <small style={{ 
            color: lastAction.type === 'success' ? '#155724' : '#721c24',
            opacity: 0.8
          }}>
            {formatTime(lastAction.timestamp)}
          </small>
        </div>
      )}

      {/* Navigation par onglets */}
      <div style={{
        display: 'flex',
        marginBottom: '25px',
        borderBottom: '2px solid #e9ecef'
      }}>
        {[
          { id: 'manual', label: 'Envoi Manuel', icon: Send },
          { id: 'automatic', label: 'Envoi Automatique', icon: Bell },
          { id: 'config', label: 'Configuration', icon: Settings }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '12px 20px',
              border: 'none',
              background: activeTab === tab.id ? '#6f42c1' : 'transparent',
              color: activeTab === tab.id ? 'white' : '#6c757d',
              borderRadius: '8px 8px 0 0',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontWeight: '600',
              transition: 'all 0.2s ease'
            }}
          >
            <tab.icon size={16} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Contenu des onglets */}
      <div style={{
        background: 'white',
        border: '1px solid #e9ecef',
        borderRadius: '8px',
        padding: '25px'
      }}>
        
        {/* Onglet Envoi Manuel */}
        {activeTab === 'manual' && (
          <div>
            <h3 style={{ margin: '0 0 20px 0', color: '#495057' }}>
              📤 Envoi Manuel du Rapport
            </h3>
            
            {/* Aperçu des données */}
            <div style={{
              background: '#f8f9fa',
              border: '1px solid #e9ecef',
              borderRadius: '8px',
              padding: '20px',
              marginBottom: '20px'
            }}>
              <h4 style={{ margin: '0 0 15px 0', color: '#495057' }}>
                📊 Données à envoyer
              </h4>
              
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                gap: '15px'
              }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#28a745' }}>
                    {formatCurrency(dailySummary.totalSales)}
                  </div>
                  <div style={{ fontSize: '12px', color: '#6c757d' }}>CA du jour</div>
                </div>
                
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#007bff' }}>
                    {dailySummary.salesCount}
                  </div>
                  <div style={{ fontSize: '12px', color: '#6c757d' }}>Ventes</div>
                </div>
                
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#6f42c1' }}>
                    {dailySummary.vendorStats.length}
                  </div>
                  <div style={{ fontSize: '12px', color: '#6c757d' }}>Vendeuses</div>
                </div>
              </div>
            </div>

            {/* Configuration d'envoi */}
            <div style={{
              background: '#fff3cd',
              border: '1px solid #ffeaa7',
              borderRadius: '8px',
              padding: '15px',
              marginBottom: '20px'
            }}>
              <h5 style={{ margin: '0 0 10px 0', color: '#856404' }}>
                ⚙️ Configuration actuelle
              </h5>
              <ul style={{ margin: 0, paddingLeft: '20px', color: '#856404' }}>
                <li><strong>Destinataire:</strong> {emailConfig.recipientEmail || 'Non configuré'}</li>
                <li><strong>Sujet:</strong> {emailConfig.subject.replace('[DATE]', formatDate(new Date()))}</li>
                <li><strong>PDF joint:</strong> {emailConfig.attachPDF ? 'Oui' : 'Non'}</li>
                <li><strong>Données jointes:</strong> {emailConfig.attachData ? 'Oui' : 'Non'}</li>
              </ul>
            </div>

            {/* Boutons d'action */}
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <button
                onClick={handleSendManualEmail}
                disabled={isSending || configErrors.length > 0 || !emailConfig.recipientEmail}
                style={{
                  background: configErrors.length > 0 || !emailConfig.recipientEmail 
                    ? '#6c757d' 
                    : 'linear-gradient(135deg, #28a745 0%, #20c997 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '12px 24px',
                  fontWeight: '600',
                  cursor: configErrors.length > 0 || !emailConfig.recipientEmail ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  opacity: configErrors.length > 0 || !emailConfig.recipientEmail ? 0.6 : 1
                }}
              >
                <Send size={16} />
                {isSending ? 'Envoi en cours...' : 'Envoyer le rapport'}
              </button>
              
              <button
                onClick={handleTestEmail}
                disabled={isSending || !emailConfig.recipientEmail}
                style={{
                  background: 'linear-gradient(135deg, #007bff 0%, #6f42c1 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '12px 24px',
                  fontWeight: '600',
                  cursor: !emailConfig.recipientEmail ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  opacity: !emailConfig.recipientEmail ? 0.6 : 1
                }}
              >
                <Mail size={16} />
                Envoyer un test
              </button>
              
              <button
                onClick={handlePreviewEmail}
                style={{
                  background: 'linear-gradient(135deg, #6c757d 0%, #495057 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '12px 24px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <Download size={16} />
                Aperçu email
              </button>
            </div>
          </div>
        )}

        {/* Onglet Envoi Automatique */}
        {activeTab === 'automatic' && (
          <div>
            <h3 style={{ margin: '0 0 20px 0', color: '#495057' }}>
              ⏰ Envoi Automatique Programmé
            </h3>
            
            {/* Configuration de l'envoi automatique */}
            <div style={{
              background: '#f8f9fa',
              border: '1px solid #e9ecef',
              borderRadius: '8px',
              padding: '20px',
              marginBottom: '20px'
            }}>
              <div style={{ marginBottom: '20px' }}>
                <label style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  fontWeight: '600',
                  color: '#495057',
                  cursor: 'pointer'
                }}>
                  <input
                    type="checkbox"
                    checked={emailConfig.autoSendEnabled}
                    onChange={(e) => setEmailConfig(prev => ({ 
                      ...prev, 
                      autoSendEnabled: e.target.checked 
                    }))}
                    style={{ transform: 'scale(1.2)' }}
                  />
                  Activer l'envoi automatique quotidien
                </label>
              </div>

              {emailConfig.autoSendEnabled && (
                <div style={{ display: 'grid', gap: '15px' }}>
                  <div>
                    <label style={{ 
                      display: 'block', 
                      marginBottom: '5px', 
                      fontWeight: '600',
                      color: '#495057'
                    }}>
                      <Clock size={16} style={{ marginRight: '5px', verticalAlign: 'middle' }} />
                      Heure d'envoi quotidien
                    </label>
                    <input
                      type="time"
                      value={emailConfig.autoSendTime}
                      onChange={(e) => setEmailConfig(prev => ({ 
                        ...prev, 
                        autoSendTime: e.target.value 
                      }))}
                      style={{
                        padding: '10px',
                        border: '2px solid #e9ecef',
                        borderRadius: '6px',
                        fontSize: '16px',
                        width: '150px'
                      }}
                    />
                    <small style={{ display: 'block', color: '#6c757d', marginTop: '5px' }}>
                      L'email sera envoyé automatiquement chaque jour à cette heure
                    </small>
                  </div>

                  <div>
                    <label style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      fontWeight: '600',
                      color: '#495057',
                      cursor: 'pointer'
                    }}>
                      <input
                        type="checkbox"
                        checked={emailConfig.performRAZ}
                        onChange={(e) => setEmailConfig(prev => ({ 
                          ...prev, 
                          performRAZ: e.target.checked 
                        }))}
                        style={{ transform: 'scale(1.2)' }}
                      />
                      <RefreshCw size={16} />
                      Effectuer une RAZ automatique après l'envoi
                    </label>
                    <small style={{ 
                      display: 'block', 
                      color: '#dc3545', 
                      marginTop: '5px',
                      marginLeft: '30px',
                      fontWeight: '500'
                    }}>
                      ⚠️ Attention: Ceci remettra à zéro les ventes du jour et le panier
                    </small>
                  </div>
                </div>
              )}
            </div>

            {/* Informations sur la programmation */}
            {emailConfig.autoSendEnabled && (
              <div style={{
                background: '#e8f5e8',
                border: '1px solid #28a745',
                borderRadius: '8px',
                padding: '15px',
                marginBottom: '20px'
              }}>
                <h5 style={{ margin: '0 0 10px 0', color: '#155724' }}>
                  📅 Programmation prévue
                </h5>
                <ul style={{ margin: 0, paddingLeft: '20px', color: '#155724' }}>
                  <li><strong>Fréquence:</strong> Tous les jours</li>
                  <li><strong>Heure:</strong> {emailConfig.autoSendTime}</li>
                  <li><strong>Destinataire:</strong> {emailConfig.recipientEmail || 'À configurer'}</li>
                  <li><strong>RAZ automatique:</strong> {emailConfig.performRAZ ? 'Activée' : 'Désactivée'}</li>
                </ul>
              </div>
            )}

            {/* Bouton d'activation */}
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={handleScheduleAutomatic}
                disabled={isSending || !emailConfig.autoSendEnabled || configErrors.length > 0}
                style={{
                  background: !emailConfig.autoSendEnabled || configErrors.length > 0 
                    ? '#6c757d' 
                    : 'linear-gradient(135deg, #6f42c1 0%, #e83e8c 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '12px 24px',
                  fontWeight: '600',
                  cursor: !emailConfig.autoSendEnabled || configErrors.length > 0 ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  opacity: !emailConfig.autoSendEnabled || configErrors.length > 0 ? 0.6 : 1
                }}
              >
                <Bell size={16} />
                {isSending ? 'Configuration...' : 'Activer la programmation'}
              </button>
            </div>
          </div>
        )}

        {/* Onglet Configuration */}
        {activeTab === 'config' && (
          <div>
            <h3 style={{ margin: '0 0 20px 0', color: '#495057' }}>
              ⚙️ Configuration Email
            </h3>
            
            {/* Erreurs de configuration */}
            {configErrors.length > 0 && (
              <div style={{
                background: '#f8d7da',
                border: '1px solid #f5c6cb',
                borderRadius: '8px',
                padding: '15px',
                marginBottom: '20px'
              }}>
                <h5 style={{ margin: '0 0 10px 0', color: '#721c24' }}>
                  ❌ Erreurs de configuration
                </h5>
                <ul style={{ margin: 0, paddingLeft: '20px', color: '#721c24' }}>
                  {configErrors.map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Formulaire de configuration */}
            <div style={{ display: 'grid', gap: '20px' }}>
              
              {/* Configuration destinataires */}
              <div>
                <h4 style={{ margin: '0 0 15px 0', color: '#495057' }}>
                  📧 Destinataires
                </h4>
                
                <div style={{ display: 'grid', gap: '15px' }}>
                  <div>
                    <label style={{ 
                      display: 'block', 
                      marginBottom: '5px', 
                      fontWeight: '600',
                      color: '#495057'
                    }}>
                      Email principal *
                    </label>
                    <input
                      type="email"
                      value={emailConfig.recipientEmail}
                      onChange={(e) => setEmailConfig(prev => ({ 
                        ...prev, 
                        recipientEmail: e.target.value 
                      }))}
                      placeholder="manager@myconfort.com"
                      style={{
                        width: '100%',
                        padding: '10px',
                        border: '2px solid #e9ecef',
                        borderRadius: '6px',
                        fontSize: '16px'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ 
                      display: 'block', 
                      marginBottom: '5px', 
                      fontWeight: '600',
                      color: '#495057'
                    }}>
                      Emails en copie (optionnel)
                    </label>
                    <input
                      type="text"
                      value={emailConfig.ccEmails}
                      onChange={(e) => setEmailConfig(prev => ({ 
                        ...prev, 
                        ccEmails: e.target.value 
                      }))}
                      placeholder="comptable@myconfort.com, direction@myconfort.com"
                      style={{
                        width: '100%',
                        padding: '10px',
                        border: '2px solid #e9ecef',
                        borderRadius: '6px',
                        fontSize: '16px'
                      }}
                    />
                    <small style={{ color: '#6c757d' }}>
                      Séparez plusieurs emails par des virgules
                    </small>
                  </div>
                </div>
              </div>

              {/* Configuration contenu */}
              <div>
                <h4 style={{ margin: '0 0 15px 0', color: '#495057' }}>
                  📝 Contenu
                </h4>
                
                <div style={{ display: 'grid', gap: '15px' }}>
                  <div>
                    <label style={{ 
                      display: 'block', 
                      marginBottom: '5px', 
                      fontWeight: '600',
                      color: '#495057'
                    }}>
                      Sujet de l'email
                    </label>
                    <input
                      type="text"
                      value={emailConfig.subject}
                      onChange={(e) => setEmailConfig(prev => ({ 
                        ...prev, 
                        subject: e.target.value 
                      }))}
                      style={{
                        width: '100%',
                        padding: '10px',
                        border: '2px solid #e9ecef',
                        borderRadius: '6px',
                        fontSize: '16px'
                      }}
                    />
                    <small style={{ color: '#6c757d' }}>
                      Utilisez [DATE] pour insérer automatiquement la date
                    </small>
                  </div>

                  <div style={{ display: 'grid', gap: '10px' }}>
                    <label style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      fontWeight: '600',
                      color: '#495057',
                      cursor: 'pointer'
                    }}>
                      <input
                        type="checkbox"
                        checked={emailConfig.attachPDF}
                        onChange={(e) => setEmailConfig(prev => ({ 
                          ...prev, 
                          attachPDF: e.target.checked 
                        }))}
                        style={{ transform: 'scale(1.2)' }}
                      />
                      Joindre le rapport en PDF
                    </label>

                    <label style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      fontWeight: '600',
                      color: '#495057',
                      cursor: 'pointer'
                    }}>
                      <input
                        type="checkbox"
                        checked={emailConfig.attachData}
                        onChange={(e) => setEmailConfig(prev => ({ 
                          ...prev, 
                          attachData: e.target.checked 
                        }))}
                        style={{ transform: 'scale(1.2)' }}
                      />
                      Joindre les données brutes (JSON)
                    </label>

                    <label style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      fontWeight: '600',
                      color: '#495057',
                      cursor: 'pointer'
                    }}>
                      <input
                        type="checkbox"
                        checked={emailConfig.includeDetails}
                        onChange={(e) => setEmailConfig(prev => ({ 
                          ...prev, 
                          includeDetails: e.target.checked 
                        }))}
                        style={{ transform: 'scale(1.2)' }}
                      />
                      Inclure les détails des ventes
                    </label>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default EmailRAZSystem;
