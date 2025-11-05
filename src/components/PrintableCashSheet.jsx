import React, { useState, useEffect, useMemo } from 'react';
import { Printer, Download, FileText, Calendar, TrendingUp, Users, CreditCard, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import { PrintService } from '../services/printService';
import { formatCurrency, formatDate, formatTime, calculateDailySummary, getTodayData } from '../utils/dateUtils';
import '../styles/print.css';

const PrintableCashSheet = ({ sales = [], vendorStats = [], className = '' }) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [lastAction, setLastAction] = useState(null);
  const [error, setError] = useState(null);

  // Calcul des données du jour
  const todaySales = useMemo(() => getTodayData(sales), [sales]);
  const dailySummary = useMemo(() => calculateDailySummary(todaySales), [todaySales]);

  // Statistiques détaillées
  const detailedStats = useMemo(() => {
    const totalCA = dailySummary.totalSales;
    const salesCount = dailySummary.salesCount;
    
    return {
      totalRevenue: totalCA,
      salesCount: salesCount,
      averageBasket: salesCount > 0 ? totalCA / salesCount : 0,
      topVendor: dailySummary.vendorStats.length > 0 
        ? dailySummary.vendorStats.reduce((prev, current) => 
            (prev.sales > current.sales) ? prev : current
          ) 
        : null,
      paymentMethodsCount: Object.keys(dailySummary.paymentMethods).length,
      activeVendors: dailySummary.vendorStats.filter(v => v.sales > 0).length
    };
  }, [dailySummary]);

  const handlePrint = async () => {
    try {
      setIsGenerating(true);
      setError(null);
      
      await PrintService.printElement('printable-cash-sheet');
      
      setLastAction({
        type: 'success',
        message: 'Feuille de caisse envoyée à l\'imprimante',
        timestamp: new Date()
      });
    } catch (error) {
      console.error('Erreur impression:', error);
      setError(error.message);
      setLastAction({
        type: 'error',
        message: error.message,
        timestamp: new Date()
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGeneratePDF = async () => {
    try {
      setIsGenerating(true);
      setError(null);
      
      const filename = `rapport-caisse-${new Date().toISOString().split('T')[0]}.pdf`;
      await PrintService.generatePDF('printable-cash-sheet', filename);
      
      setLastAction({
        type: 'success',
        message: `PDF généré : ${filename}`,
        timestamp: new Date()
      });
    } catch (error) {
      console.error('Erreur génération PDF:', error);
      setError(error.message);
      setLastAction({
        type: 'error',
        message: error.message,
        timestamp: new Date()
      });
    } finally {
      setIsGenerating(false);
    }
  };

  // Effacer les messages après 5 secondes
  useEffect(() => {
    if (lastAction) {
      const timer = setTimeout(() => {
        setLastAction(null);
        setError(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [lastAction]);

  return (
    <div className={`print-container ${className}`}>
      {/* Contrôles d'impression */}
      <div className="no-print" style={{ 
        marginBottom: '30px', 
        padding: '20px', 
        background: 'white', 
        borderRadius: '12px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '20px',
          flexWrap: 'wrap',
          gap: '15px'
        }}>
          <div>
            <h2 style={{ 
              margin: 0, 
              fontSize: '24px', 
              color: '#495057',
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }}>
              <FileText size={28} />
              Feuille de Caisse
            </h2>
            <p style={{ margin: '5px 0 0 0', color: '#6c757d' }}>
              Rapport imprimable des ventes du {formatDate(new Date())}
            </p>
          </div>
          
          <div className="print-buttons">
            <button
              className="print-button primary"
              onClick={handlePrint}
              disabled={isGenerating}
            >
              <Printer size={16} />
              {isGenerating ? 'Impression...' : 'Imprimer'}
            </button>
            
            <button
              className="print-button secondary"
              onClick={handleGeneratePDF}
              disabled={isGenerating}
            >
              <Download size={16} />
              {isGenerating ? 'Génération...' : 'Télécharger PDF'}
            </button>
          </div>
        </div>

        {/* Statistiques rapides */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
          gap: '15px',
          marginBottom: '20px'
        }}>
          <div style={{
            background: 'linear-gradient(135deg, #28a745 0%, #20c997 100%)',
            color: 'white',
            padding: '15px',
            borderRadius: '8px',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '20px', fontWeight: 'bold' }}>
              {formatCurrency(detailedStats.totalRevenue)}
            </div>
            <div style={{ fontSize: '12px', opacity: 0.9 }}>CHIFFRE D'AFFAIRES</div>
          </div>
          
          <div style={{
            background: 'linear-gradient(135deg, #007bff 0%, #6f42c1 100%)',
            color: 'white',
            padding: '15px',
            borderRadius: '8px',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '20px', fontWeight: 'bold' }}>
              {detailedStats.salesCount}
            </div>
            <div style={{ fontSize: '12px', opacity: 0.9 }}>VENTES</div>
          </div>
          
          <div style={{
            background: 'linear-gradient(135deg, #fd7e14 0%, #e83e8c 100%)',
            color: 'white',
            padding: '15px',
            borderRadius: '8px',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '20px', fontWeight: 'bold' }}>
              {formatCurrency(detailedStats.averageBasket)}
            </div>
            <div style={{ fontSize: '12px', opacity: 0.9 }}>PANIER MOYEN</div>
          </div>
        </div>

        {/* Messages de statut */}
        {lastAction && (
          <div className={`print-status ${lastAction.type}`}>
            {lastAction.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
            <span>{lastAction.message}</span>
            <small style={{ marginLeft: 'auto', opacity: 0.8 }}>
              {formatTime(lastAction.timestamp)}
            </small>
          </div>
        )}

        {error && (
          <div className="print-status error">
            <AlertCircle size={16} />
            <span>Erreur: {error}</span>
          </div>
        )}
      </div>

      {/* Feuille imprimable */}
      <div 
        id="printable-cash-sheet" 
        className={`printable-sheet ${isGenerating ? 'printable-loading' : ''}`}
      >
        {/* En-tête */}
        <div className="printable-header">
          <h1>📊 FEUILLE DE CAISSE QUOTIDIENNE</h1>
          <h2>MyConfort - {formatDate(new Date())}</h2>
        </div>

        {/* Résumé principal */}
        <div className="printable-summary">
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: '0 0 20px 0' }}>
            <TrendingUp size={20} />
            Résumé de la journée
          </h3>
          
          <div className="printable-stats">
            <div className="printable-stat">
              <span className="printable-stat-value">
                {formatCurrency(detailedStats.totalRevenue)}
              </span>
              <div className="printable-stat-label">CHIFFRE D'AFFAIRES</div>
            </div>
            
            <div className="printable-stat">
              <span className="printable-stat-value">
                {detailedStats.salesCount}
              </span>
              <div className="printable-stat-label">VENTES TOTALES</div>
            </div>
            
            <div className="printable-stat">
              <span className="printable-stat-value">
                {formatCurrency(detailedStats.averageBasket)}
              </span>
              <div className="printable-stat-label">PANIER MOYEN</div>
            </div>
            
            <div className="printable-stat">
              <span className="printable-stat-value">
                {detailedStats.activeVendors}
              </span>
              <div className="printable-stat-label">VENDEUSES ACTIVES</div>
            </div>
          </div>
        </div>

        {/* Performances par vendeuse */}
        {dailySummary.vendorStats.length > 0 && (
          <div className="printable-section">
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Users size={20} />
              Performances par vendeuse
            </h3>
            
            <table className="printable-table">
              <thead>
                <tr>
                  <th>Vendeuse</th>
                  <th>Chiffre d'affaires</th>
                  <th>Nombre de ventes</th>
                  <th>% du total</th>
                  <th>Panier moyen</th>
                </tr>
              </thead>
              <tbody>
                {dailySummary.vendorStats
                  .sort((a, b) => b.sales - a.sales)
                  .map((vendor, index) => (
                    <tr key={vendor.name}>
                      <td>
                        <strong>{vendor.name}</strong>
                        {index === 0 && detailedStats.topVendor?.name === vendor.name && (
                          <span style={{ 
                            marginLeft: '8px', 
                            background: '#28a745', 
                            color: 'white', 
                            padding: '2px 6px', 
                            borderRadius: '4px', 
                            fontSize: '10px' 
                          }}>
                            TOP
                          </span>
                        )}
                      </td>
                      <td><strong>{formatCurrency(vendor.sales)}</strong></td>
                      <td>{vendor.count}</td>
                      <td>{vendor.percentage.toFixed(1)}%</td>
                      <td>{formatCurrency(vendor.count > 0 ? vendor.sales / vendor.count : 0)}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Répartition des paiements */}
        {Object.keys(dailySummary.paymentMethods).length > 0 && (
          <div className="printable-section">
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <CreditCard size={20} />
              Répartition des moyens de paiement
            </h3>
            
            <table className="printable-table">
              <thead>
                <tr>
                  <th>Moyen de paiement</th>
                  <th>Montant</th>
                  <th>% du total</th>
                  <th>Nombre de transactions</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(dailySummary.paymentMethods)
                  .sort(([,a], [,b]) => b - a)
                  .map(([method, amount]) => {
                    const transactionCount = todaySales.filter(sale => sale.paymentMethod === method).length;
                    const percentage = detailedStats.totalRevenue > 0 ? (amount / detailedStats.totalRevenue * 100) : 0;
                    
                    return (
                      <tr key={method}>
                        <td><strong>{method}</strong></td>
                        <td><strong>{formatCurrency(amount)}</strong></td>
                        <td>{percentage.toFixed(1)}%</td>
                        <td>{transactionCount}</td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        )}

        {/* Détail des ventes */}
        {todaySales.length > 0 && (
          <div className="printable-section">
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Clock size={20} />
              Détail des ventes de la journée
            </h3>
            
            <table className="printable-table">
              <thead>
                <tr>
                  <th>Heure</th>
                  <th>Vendeuse</th>
                  <th>Montant</th>
                  <th>Paiement</th>
                  <th>Articles</th>
                </tr>
              </thead>
              <tbody>
                {todaySales
                  .sort((a, b) => new Date(b.date) - new Date(a.date))
                  .slice(0, 20) // Limiter à 20 ventes pour éviter une page trop longue
                  .map((sale, index) => (
                    <tr key={sale.id || index}>
                      <td>{formatTime(sale.date)}</td>
                      <td>{sale.vendorName}</td>
                      <td><strong>{formatCurrency(sale.totalAmount)}</strong></td>
                      <td>{sale.paymentMethod}</td>
                      <td>{sale.items ? sale.items.length : 0}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
            
            {todaySales.length > 20 && (
              <p style={{ 
                textAlign: 'center', 
                color: '#6c757d', 
                fontStyle: 'italic',
                margin: '15px 0 0 0'
              }}>
                ... et {todaySales.length - 20} autres ventes
              </p>
            )}
          </div>
        )}

        {/* Informations de génération */}
        <div className="printable-footer">
          <p className="company-name">MyConfort - Système de Caisse Automatisé</p>
          <p>Feuille de caisse générée le {formatDate(new Date())} à {formatTime(new Date())}</p>
          <p>Version 1.0 - Rapport quotidien automatique</p>
          <div style={{
            background: '#dc3545',
            color: 'white',
            padding: '8px 15px',
            borderRadius: '20px',
            fontSize: '12px',
            display: 'inline-block',
            marginTop: '10px',
            fontWeight: 600
          }}>
            DOCUMENT CONFIDENTIEL
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrintableCashSheet;
