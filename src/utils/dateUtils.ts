// src/utils/dateUtils.ts
import type { Sale, DailySummary } from '../types';

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR'
  }).format(amount);
}

export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('fr-FR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(date);
}

export function formatTime(date: Date): string {
  return new Intl.DateTimeFormat('fr-FR', {
    hour: '2-digit',
    minute: '2-digit'
  }).format(date);
}

export function getTodayData(sales: Sale[]): Sale[] {
  const today = new Date().toISOString().split('T')[0];
  return sales.filter(sale => {
    const saleDate = typeof sale.date === 'string' ? sale.date : sale.date.toISOString();
    return saleDate.startsWith(today) && !sale.canceled;
  });
}

export function getTodayDateString(): string {
  return new Date().toISOString().split('T')[0];
}

export function calculateDailySummary(sales: Sale[]): DailySummary {
  const totalSales = sales.reduce((sum, sale) => sum + sale.totalAmount, 0);
  const salesCount = sales.length;
  const averageBasket = salesCount > 0 ? totalSales / salesCount : 0;
  
  return {
    totalSales,
    salesCount,
    averageBasket,
    date: formatDate(new Date()),
    vendorStats: [],
    paymentMethods: {}
  };
}
