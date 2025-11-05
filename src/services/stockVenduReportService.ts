/**
 * Service de génération de rapport Stock Vendu
 * Pour inclusion dans l'email de RAZ
 */

import { productCatalog } from '@/data';
import type { Sale } from '@/types';

interface ProductStat {
  productName: string;
  category: string;
  quantity: number;
}

interface CategoryGroup {
  category: string;
  products: ProductStat[];
  totalQuantity: number;
}

export class StockVenduReportService {
  
  // Map pour retrouver la catégorie officielle d'un produit
  private static productCategoryMap = new Map(
    productCatalog.map(product => [product.name, product.category])
  );

  // Obtenir la VRAIE catégorie d'un produit
  private static getRealCategory(productName: string): string {
    // Chercher dans le catalogue
    const catalogCategory = this.productCategoryMap.get(productName);
    if (catalogCategory) {
      return catalogCategory;
    }
    
    // Détection intelligente
    const nameLower = productName.toLowerCase();
    if (nameLower.includes('protège')) return 'Protège-matelas';
    if (nameLower.includes('matelas') && !nameLower.includes('sur')) return 'Matelas';
    if (nameLower.includes('surmatelas') || nameLower.includes('sur-matelas')) return 'Sur-matelas';
    if (nameLower.includes('oreiller') || nameLower.includes('traversin')) return 'Oreillers';
    if (nameLower.includes('couette')) return 'Couettes';
    if (nameLower.includes('plateau') && nameLower.includes('fraîche')) return 'Plateau Fraîche';
    if (nameLower.includes('plateau')) return 'Plateau';
    if (nameLower.includes('taie') || nameLower.includes('régule') || nameLower.includes('pack')) return 'Accessoires';
    
    return 'IGNORE';
  }

  // Grouper par catégorie
  private static groupByCategory(productMap: Map<string, ProductStat>): CategoryGroup[] {
    const categoryGroups = new Map<string, CategoryGroup>();
    
    productMap.forEach(product => {
      if (!categoryGroups.has(product.category)) {
        categoryGroups.set(product.category, {
          category: product.category,
          products: [],
          totalQuantity: 0
        });
      }
      const group = categoryGroups.get(product.category)!;
      group.products.push(product);
      group.totalQuantity += product.quantity;
    });

    const result = Array.from(categoryGroups.values());
    result.forEach(group => {
      group.products.sort((a, b) => b.quantity - a.quantity);
    });
    
    return result.sort((a, b) => b.totalQuantity - a.totalQuantity);
  }

  // Calculer les ventes par produit pour le JOUR
  static calculateDaySalesByProduct(
    localSales: Sale[], 
    supabaseInvoices: any[]
  ): CategoryGroup[] {
    const productMap = new Map<string, ProductStat>();
    const razTimestamp = localStorage.getItem('lastRAZTimestamp');
    const razTime = razTimestamp ? parseInt(razTimestamp) : 0;

    // Filtrer ventes du jour
    const todaySales = localSales.filter(sale => {
      const saleTime = new Date(sale.date).getTime();
      return saleTime > razTime;
    });

    // Ventes locales
    todaySales.forEach(sale => {
      sale.items.forEach(item => {
        const productName = item.name;
        const category = this.getRealCategory(productName);
        
        if (category === 'IGNORE') return;
        
        const key = `${category}::${productName}`;
        const existing = productMap.get(key) || {
          productName,
          category,
          quantity: 0
        };
        existing.quantity += item.quantity;
        productMap.set(key, existing);
      });
    });

    // Factures Supabase du jour
    const todayInvoices = supabaseInvoices.filter(inv => {
      const invTime = new Date(inv.created_at).getTime();
      return invTime > razTime;
    });

    todayInvoices.forEach((invoice: any) => {
      if (invoice.produits && Array.isArray(invoice.produits)) {
        invoice.produits.forEach((item: any) => {
          const productName = item.nom || item.name || 'Produit inconnu';
          const category = this.getRealCategory(productName);
          
          if (category === 'IGNORE') return;
          
          const qty = item.quantite || item.quantity || 1;
          const key = `${category}::${productName}`;
          
          const existing = productMap.get(key) || {
            productName,
            category,
            quantity: 0
          };
          existing.quantity += qty;
          productMap.set(key, existing);
        });
      }
    });

    return this.groupByCategory(productMap);
  }

  // Calculer les ventes par produit pour la SESSION COMPLÈTE
  static calculateSessionSalesByProduct(
    localSales: Sale[], 
    supabaseInvoices: any[]
  ): CategoryGroup[] {
    const productMap = new Map<string, ProductStat>();

    // TOUTES les ventes locales
    localSales.forEach(sale => {
      sale.items.forEach(item => {
        const productName = item.name;
        const category = this.getRealCategory(productName);
        
        if (category === 'IGNORE') return;
        
        const key = `${category}::${productName}`;
        const existing = productMap.get(key) || {
          productName,
          category,
          quantity: 0
        };
        existing.quantity += item.quantity;
        productMap.set(key, existing);
      });
    });

    // TOUTES les factures Supabase
    supabaseInvoices.forEach((invoice: any) => {
      if (invoice.produits && Array.isArray(invoice.produits)) {
        invoice.produits.forEach((item: any) => {
          const productName = item.nom || item.name || 'Produit inconnu';
          const category = this.getRealCategory(productName);
          
          if (category === 'IGNORE') return;
          
          const qty = item.quantite || item.quantity || 1;
          const key = `${category}::${productName}`;
          
          const existing = productMap.get(key) || {
            productName,
            category,
            quantity: 0
          };
          existing.quantity += qty;
          productMap.set(key, existing);
        });
      }
    });

    return this.groupByCategory(productMap);
  }

  // Générer le rapport texte JOUR pour email RAZ Journée
  static generateDayReport(
    localSales: Sale[], 
    supabaseInvoices: any[],
    sessionName?: string
  ): string {
    const daySales = this.calculateDaySalesByProduct(localSales, supabaseInvoices);
    const totalDayQty = daySales.reduce((sum, cat) => sum + cat.totalQuantity, 0);

    let report = '\n\n';
    report += '════════════════════════════════════════════════════════\n';
    report += '📊 STOCK VENDU DU JOUR - Détail par produit\n';
    report += '════════════════════════════════════════════════════════\n\n';
    
    if (sessionName) {
      report += `Session: ${sessionName}\n`;
    }
    report += `📅 Ventes du jour: ${totalDayQty} produits vendus\n\n`;
    
    daySales.forEach(categoryGroup => {
      report += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
      report += `📦 ${categoryGroup.category.toUpperCase()} (${categoryGroup.totalQuantity} produits)\n`;
      report += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
      
      categoryGroup.products.forEach(product => {
        const dots = '.'.repeat(Math.max(3, 50 - product.productName.length));
        report += `  ${product.productName} ${dots} ${product.quantity}\n`;
      });
      
      report += `\n  TOTAL ${categoryGroup.category} .......................... ${categoryGroup.totalQuantity}\n\n`;
    });
    
    report += '════════════════════════════════════════════════════════\n';
    report += `TOTAL JOUR: ${totalDayQty} produits vendus\n`;
    report += '════════════════════════════════════════════════════════\n';
    
    return report;
  }

  // Générer le rapport texte SESSION pour email RAZ Fin Session
  static generateSessionReport(
    localSales: Sale[], 
    supabaseInvoices: any[],
    sessionName?: string,
    sessionStart?: number,
    sessionEnd?: number
  ): string {
    const sessionSales = this.calculateSessionSalesByProduct(localSales, supabaseInvoices);
    const totalSessionQty = sessionSales.reduce((sum, cat) => sum + cat.totalQuantity, 0);

    let report = '\n\n';
    report += '════════════════════════════════════════════════════════\n';
    report += '📊 STOCK VENDU DE LA SESSION - Détail complet\n';
    report += '════════════════════════════════════════════════════════\n\n';
    
    if (sessionName) {
      report += `Session: ${sessionName}\n`;
    }
    if (sessionStart && sessionEnd && !isNaN(sessionStart) && !isNaN(sessionEnd)) {
      report += `Période: du ${new Date(sessionStart).toLocaleDateString('fr-FR')} au ${new Date(sessionEnd).toLocaleDateString('fr-FR')}\n`;
    }
    report += `📈 Total session: ${totalSessionQty} produits vendus\n\n`;
    
    sessionSales.forEach(categoryGroup => {
      report += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
      report += `📦 ${categoryGroup.category.toUpperCase()} (${categoryGroup.totalQuantity} produits)\n`;
      report += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
      
      categoryGroup.products.forEach(product => {
        const dots = '.'.repeat(Math.max(3, 50 - product.productName.length));
        report += `  ${product.productName} ${dots} ${product.quantity}\n`;
      });
      
      report += `\n  TOTAL ${categoryGroup.category} .......................... ${categoryGroup.totalQuantity}\n\n`;
    });
    
    report += '════════════════════════════════════════════════════════\n';
    report += `TOTAL SESSION: ${totalSessionQty} produits vendus\n`;
    report += '════════════════════════════════════════════════════════\n';
    
    return report;
  }
}

