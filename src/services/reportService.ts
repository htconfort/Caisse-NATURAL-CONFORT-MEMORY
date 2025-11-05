/**
 * Service de génération de rapports et d'exports
 * Gère les rapports de stock physique, feuilles de caisse et emails
 */

import type { Sale, PhysicalStock } from '../types';
// import { syncService } from './syncService'; // Temporairement désactivé

// Stub temporaire pour syncService
const syncService = {
  getCurrentPhysicalStock: () => [] as PhysicalStock[]
};

export interface EventReport {
  eventDate: Date;
  physicalStockReport: PhysicalStockReport;
  cashierSheet: CashierSheet;
  totalSales: number;
  totalItems: number;
}

export interface PhysicalStockReport {
  remainingStock: PhysicalStock[];
  totalValue: number;
  lowStockItems: PhysicalStock[];
  outOfStockItems: PhysicalStock[];
  eventStartStock: PhysicalStock[];
  stockMovements: StockMovement[];
}

export interface CashierSheet {
  sales: Sale[];
  totalCash: number;
  totalCard: number;
  totalCheck: number;
  totalOther: number;
  grandTotal: number;
  salesByVendor: VendorSummary[];
  transactionCount: number;
}

export interface VendorSummary {
  vendorName: string;
  totalSales: number;
  transactionCount: number;
  salesAmount: number;
}

export interface StockMovement {
  productName: string;
  category: string;
  initialStock: number;
  finalStock: number;
  totalSold: number;
  lastSaleTime?: Date;
}

class ReportService {
  
  /**
   * Génère un rapport complet de fin d'événement
   */
  public generateEventReport(): EventReport {
    const physicalStock = syncService.getCurrentPhysicalStock();
    const sales = this.getSalesFromStorage();
    
    return {
      eventDate: new Date(),
      physicalStockReport: this.generatePhysicalStockReport(physicalStock),
      cashierSheet: this.generateCashierSheet(sales),
      totalSales: sales.reduce((sum, sale) => sum + sale.totalAmount, 0),
      totalItems: sales.reduce((sum, sale) => sum + sale.items.reduce((itemSum, item) => itemSum + item.quantity, 0), 0)
    };
  }

  /**
   * Génère le rapport de stock physique restant
   */
  private generatePhysicalStockReport(physicalStock: PhysicalStock[]): PhysicalStockReport {
    const lowStockItems = physicalStock.filter(item => 
      item.currentStock > 0 && item.currentStock <= item.minStockAlert
    );
    
    const outOfStockItems = physicalStock.filter(item => item.currentStock === 0);
    
    const totalValue = physicalStock.reduce((sum, item) => {
      // Essayer de récupérer le prix depuis le catalogue
      const catalogProduct = this.findProductInCatalog(item.productName);
      const price = catalogProduct?.priceTTC || 0;
      return sum + (item.currentStock * price);
    }, 0);

    // Récupérer le stock de début d'événement (simulé pour l'instant)
    const eventStartStock = this.getEventStartStock();
    
    // Calculer les mouvements de stock
    const stockMovements = this.calculateStockMovements(eventStartStock, physicalStock);

    return {
      remainingStock: physicalStock,
      totalValue,
      lowStockItems,
      outOfStockItems,
      eventStartStock,
      stockMovements
    };
  }

  /**
   * Génère la feuille de caisse
   */
  private generateCashierSheet(sales: Sale[]): CashierSheet {
    const activeSales = sales.filter(sale => !sale.canceled);
    
    const totalCash = activeSales
      .filter(sale => sale.paymentMethod === 'cash')
      .reduce((sum, sale) => sum + sale.totalAmount, 0);
    
    const totalCard = activeSales
      .filter(sale => sale.paymentMethod === 'card')
      .reduce((sum, sale) => sum + sale.totalAmount, 0);
    
    const totalCheck = activeSales
      .filter(sale => sale.paymentMethod === 'check')
      .reduce((sum, sale) => sum + sale.totalAmount, 0);
    
    const totalOther = activeSales
      .filter(sale => !['cash', 'card', 'check'].includes(sale.paymentMethod))
      .reduce((sum, sale) => sum + sale.totalAmount, 0);

    // Grouper par vendeur
    const vendorMap = new Map<string, VendorSummary>();
    activeSales.forEach(sale => {
      const existing = vendorMap.get(sale.vendorName) || {
        vendorName: sale.vendorName,
        totalSales: 0,
        transactionCount: 0,
        salesAmount: 0
      };
      
      existing.totalSales += sale.totalAmount;
      existing.transactionCount += 1;
      existing.salesAmount += sale.totalAmount;
      
      vendorMap.set(sale.vendorName, existing);
    });

    return {
      sales: activeSales,
      totalCash,
      totalCard,
      totalCheck,
      totalOther,
      grandTotal: totalCash + totalCard + totalCheck + totalOther,
      salesByVendor: Array.from(vendorMap.values()),
      transactionCount: activeSales.length
    };
  }

  /**
   * Génère le HTML du rapport de stock physique
   */
  public generatePhysicalStockHTML(report: PhysicalStockReport): string {
    const now = new Date();
    const formatDate = (date: Date) => date.toLocaleString('fr-FR');
    const formatCurrency = (amount: number) => `${amount.toFixed(2)}€`;

    return `
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Rapport Stock Physique - ${formatDate(now)}</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; color: #333; }
        .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 20px; }
        .section { margin-bottom: 30px; }
        .section h2 { color: #2563eb; border-bottom: 1px solid #e5e7eb; padding-bottom: 10px; }
        table { width: 100%; border-collapse: collapse; margin-top: 15px; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f8f9fa; font-weight: bold; }
        .alert-low { background-color: #fef3cd; }
        .alert-out { background-color: #f8d7da; }
        .summary { background-color: #e8f5e8; padding: 15px; border-radius: 5px; margin-bottom: 20px; }
        .footer { margin-top: 40px; text-align: center; font-size: 12px; color: #666; }
        @media print { body { margin: 0; } .no-print { display: none; } }
    </style>
</head>
<body>
    <div class="header">
        <h1>📦 RAPPORT STOCK PHYSIQUE</h1>
        <p><strong>Date :</strong> ${formatDate(now)}</p>
        <p><strong>Caisse MyConfort</strong></p>
    </div>

    <div class="summary">
        <h2>📊 Résumé</h2>
        <p><strong>Valeur stock restant :</strong> ${formatCurrency(report.totalValue)}</p>
        <p><strong>Articles en stock :</strong> ${report.remainingStock.filter(item => item.currentStock > 0).length}</p>
        <p><strong>Articles stock faible :</strong> ${report.lowStockItems.length}</p>
        <p><strong>Articles en rupture :</strong> ${report.outOfStockItems.length}</p>
    </div>

    <div class="section">
        <h2>📋 Stock Physique Restant</h2>
        <table>
            <thead>
                <tr>
                    <th>Produit</th>
                    <th>Catégorie</th>
                    <th>Stock Actuel</th>
                    <th>Stock Disponible</th>
                    <th>Dernière MAJ</th>
                    <th>Statut</th>
                </tr>
            </thead>
            <tbody>
                ${report.remainingStock.map(item => {
                  const status = item.currentStock === 0 ? 'Rupture' : 
                               item.currentStock <= item.minStockAlert ? 'Stock faible' : 'OK';
                  const rowClass = item.currentStock === 0 ? 'alert-out' : 
                                 item.currentStock <= item.minStockAlert ? 'alert-low' : '';
                  
                  return `
                    <tr class="${rowClass}">
                        <td>${item.productName}</td>
                        <td>${item.category}</td>
                        <td>${item.currentStock}</td>
                        <td>${item.availableStock}</td>
                        <td>${formatDate(new Date(item.lastUpdated))}</td>
                        <td>${status}</td>
                    </tr>
                  `;
                }).join('')}
            </tbody>
        </table>
    </div>

    ${report.stockMovements.length > 0 ? `
    <div class="section">
        <h2>📈 Mouvements de Stock</h2>
        <table>
            <thead>
                <tr>
                    <th>Produit</th>
                    <th>Stock Initial</th>
                    <th>Stock Final</th>
                    <th>Quantité Vendue</th>
                    <th>Taux de Rotation</th>
                </tr>
            </thead>
            <tbody>
                ${report.stockMovements.map(movement => {
                  const rotationRate = movement.initialStock > 0 ? 
                    ((movement.totalSold / movement.initialStock) * 100).toFixed(1) : '0';
                  
                  return `
                    <tr>
                        <td>${movement.productName}</td>
                        <td>${movement.initialStock}</td>
                        <td>${movement.finalStock}</td>
                        <td>${movement.totalSold}</td>
                        <td>${rotationRate}%</td>
                    </tr>
                  `;
                }).join('')}
            </tbody>
        </table>
    </div>
    ` : ''}

    <div class="footer">
        <p>Rapport généré automatiquement par Caisse MyConfort</p>
        <p>Pour toute question, contactez l'administrateur système</p>
    </div>
</body>
</html>
    `;
  }

  /**
   * Génère le HTML de la feuille de caisse
   */
  public generateCashierSheetHTML(cashierSheet: CashierSheet): string {
    const now = new Date();
    const formatDate = (date: Date) => date.toLocaleString('fr-FR');
    const formatCurrency = (amount: number) => `${amount.toFixed(2)}€`;

    return `
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Feuille de Caisse - ${formatDate(now)}</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; color: #333; }
        .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 20px; }
        .section { margin-bottom: 30px; }
        .section h2 { color: #16a34a; border-bottom: 1px solid #e5e7eb; padding-bottom: 10px; }
        table { width: 100%; border-collapse: collapse; margin-top: 15px; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f8f9fa; font-weight: bold; }
        .summary { background-color: #e8f5e8; padding: 15px; border-radius: 5px; margin-bottom: 20px; }
        .payment-summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin: 20px 0; }
        .payment-card { background: #f8f9fa; padding: 15px; border-radius: 8px; text-align: center; }
        .total-card { background: #16a34a; color: white; font-weight: bold; font-size: 1.2em; }
        .footer { margin-top: 40px; text-align: center; font-size: 12px; color: #666; }
        @media print { body { margin: 0; } .no-print { display: none; } }
    </style>
</head>
<body>
    <div class="header">
        <h1>💰 FEUILLE DE CAISSE</h1>
        <p><strong>Date :</strong> ${formatDate(now)}</p>
        <p><strong>Caisse MyConfort</strong></p>
    </div>

    <div class="summary">
        <h2>📊 Résumé des Ventes</h2>
        <p><strong>Nombre de transactions :</strong> ${cashierSheet.transactionCount}</p>
        <p><strong>Chiffre d'affaires total :</strong> ${formatCurrency(cashierSheet.grandTotal)}</p>
    </div>

    <div class="payment-summary">
        <div class="payment-card">
            <h3>💵 Espèces</h3>
            <p>${formatCurrency(cashierSheet.totalCash)}</p>
        </div>
        <div class="payment-card">
            <h3>💳 Carte</h3>
            <p>${formatCurrency(cashierSheet.totalCard)}</p>
        </div>
        <div class="payment-card">
            <h3>🏦 Chèque</h3>
            <p>${formatCurrency(cashierSheet.totalCheck)}</p>
        </div>
        <div class="payment-card">
            <h3>🔄 Autre</h3>
            <p>${formatCurrency(cashierSheet.totalOther)}</p>
        </div>
        <div class="payment-card total-card">
            <h3>💰 TOTAL</h3>
            <p>${formatCurrency(cashierSheet.grandTotal)}</p>
        </div>
    </div>

    <div class="section">
        <h2>👥 Ventes par Vendeur</h2>
        <table>
            <thead>
                <tr>
                    <th>Vendeur</th>
                    <th>Transactions</th>
                    <th>Chiffre d'Affaires</th>
                    <th>Panier Moyen</th>
                </tr>
            </thead>
            <tbody>
                ${cashierSheet.salesByVendor.map(vendor => {
                  const averageBasket = vendor.transactionCount > 0 ? 
                    vendor.salesAmount / vendor.transactionCount : 0;
                  
                  return `
                    <tr>
                        <td>${vendor.vendorName}</td>
                        <td>${vendor.transactionCount}</td>
                        <td>${formatCurrency(vendor.salesAmount)}</td>
                        <td>${formatCurrency(averageBasket)}</td>
                    </tr>
                  `;
                }).join('')}
            </tbody>
        </table>
    </div>

    <div class="section">
        <h2>🧾 Détail des Ventes</h2>
        <table>
            <thead>
                <tr>
                    <th>Heure</th>
                    <th>Vendeur</th>
                    <th>Articles</th>
                    <th>Paiement</th>
                    <th>Montant</th>
                </tr>
            </thead>
            <tbody>
                ${cashierSheet.sales.map(sale => {
                  const itemsCount = sale.items.reduce((sum, item) => sum + item.quantity, 0);
                  const paymentLabel = {
                    cash: 'Espèces',
                    card: 'Carte',
                    check: 'Chèque',
                    multi: 'Mixte'
                  }[sale.paymentMethod] || sale.paymentMethod;
                  
                  return `
                    <tr>
                        <td>${formatDate(new Date(sale.date))}</td>
                        <td>${sale.vendorName}</td>
                        <td>${itemsCount} article${itemsCount > 1 ? 's' : ''}</td>
                        <td>${paymentLabel}</td>
                        <td>${formatCurrency(sale.totalAmount)}</td>
                    </tr>
                  `;
                }).join('')}
            </tbody>
        </table>
    </div>

    <div class="footer">
        <p>Feuille de caisse générée automatiquement par Caisse MyConfort</p>
        <p>Document confidentiel - Usage interne uniquement</p>
    </div>
</body>
</html>
    `;
  }

  /**
   * Sauvegarde l'historique d'un événement
   */
  public saveEventHistory(report: EventReport): void {
    try {
      const history = this.getEventHistory();
      const eventRecord = {
        id: `event-${Date.now()}`,
        date: report.eventDate,
        totalSales: report.totalSales,
        totalItems: report.totalItems,
        stockValue: report.physicalStockReport.totalValue,
        transactionCount: report.cashierSheet.transactionCount
      };
      
      history.push(eventRecord);
      
      // Garder seulement les 50 derniers événements
      if (history.length > 50) {
        history.splice(0, history.length - 50);
      }
      
      localStorage.setItem('event-history', JSON.stringify(history));
      console.log('📚 Historique événement sauvegardé:', eventRecord);
    } catch (error) {
      console.error('Erreur lors de la sauvegarde historique:', error);
    }
  }

  /**
   * Télécharge un rapport en PDF (simulation)
   */
  public downloadReport(content: string, filename: string): void {
    const blob = new Blob([content], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  /**
   * Prépare l'impression d'un rapport
   */
  public printReport(content: string): void {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(content);
      printWindow.document.close();
      printWindow.focus();
      
      // Attendre que le contenu soit chargé avant d'imprimer
      setTimeout(() => {
        printWindow.print();
        printWindow.close();
      }, 500);
    }
  }

  // Méthodes utilitaires privées
  private getSalesFromStorage(): Sale[] {
    try {
      const stored = localStorage.getItem('sales');
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Erreur lecture ventes:', error);
      return [];
    }
  }

  private getEventHistory(): any[] {
    try {
      const stored = localStorage.getItem('event-history');
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Erreur lecture historique:', error);
      return [];
    }
  }

  private findProductInCatalog(productName: string): any {
    // Simulation - en réalité, il faudrait importer le catalogue
    return null;
  }

  private getEventStartStock(): PhysicalStock[] {
    try {
      const stored = localStorage.getItem('event-start-stock');
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      return [];
    }
  }

  private calculateStockMovements(startStock: PhysicalStock[], currentStock: PhysicalStock[]): StockMovement[] {
    return currentStock.map(current => {
      const initial = startStock.find(item => 
        item.productName === current.productName && item.category === current.category
      );
      
      const initialStock = initial?.currentStock || 0;
      const totalSold = Math.max(0, initialStock - current.currentStock);
      
      return {
        productName: current.productName,
        category: current.category,
        initialStock,
        finalStock: current.currentStock,
        totalSold
      };
    });
  }
}

export const reportService = new ReportService();
