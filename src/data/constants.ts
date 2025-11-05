import type { LucideIcon } from 'lucide-react';
import { Archive, BarChart, CreditCard, Database, History, Package, Receipt, RefreshCw, RotateCcw, Settings, User } from 'lucide-react';
import type { TabType } from '../types';

// Configuration des onglets de navigation
export const tabs: Array<{id: TabType, label: string, icon: LucideIcon}> = [
  { id: 'vendeuse', label: 'Vendeuse', icon: User },
  { id: 'produits', label: 'Produits', icon: Package },
  { id: 'factures', label: 'Factures', icon: Receipt },
  { id: 'factures-supabase', label: 'App Facturation', icon: Database },
  { id: 'reglements', label: 'Règlements', icon: CreditCard },
  { id: 'stock', label: 'Stock', icon: Archive },
  { id: 'ventes', label: 'Ventes', icon: BarChart },
  { id: 'annulation', label: 'Annulation', icon: RotateCcw },
  { id: 'ca', label: 'CA Instant', icon: BarChart },
  { id: 'gestion', label: 'Gestion', icon: Settings },
  { id: 'raz', label: 'RAZ', icon: RefreshCw },
  { id: 'raz_history', label: 'Historique RAZ', icon: History },
];

// Configuration des catégories de produits
export const categories = ['Matelas', 'Sur-matelas', 'Couettes', 'Oreillers', 'Plateau', 'Accessoires', 'Divers'] as const;

// Configuration des moyens de paiement (inspirés de Facturassion)
export const paymentMethods = [
  { id: 'cash', label: '💵 Espèces', description: 'Paiement en espèces' },
  { id: 'card', label: '💳 Carte bleue', description: 'Paiement par carte bancaire' },
  { id: 'transfer', label: '🏦 Virement', description: 'Virement bancaire' },
  { id: 'check', label: '📝 Chèque unique', description: 'Paiement par chèque' },
  { id: 'multiple_checks', label: '📝 Chèques multiples', description: 'Paiement échelonné par chèques', needsDetails: true },
  { id: 'mixed', label: '🔄 Paiement mixte', description: 'Combinaison de plusieurs modes', needsDetails: true },
  { id: 'installment', label: '💰 Acompte + Solde', description: 'Paiement avec acompte', needsDetails: true }
] as const;

// Messages de paiement selon le format Facturassion
export const getPaymentMessage = (method: string, amount: number, details?: { numberOfChecks?: number; amountPerCheck?: number; downPayment?: number; [key: string]: unknown }) => {
  switch (method) {
    case 'cash':
      return `Montant à régler : ${amount.toFixed(2)}€ par Espèces`;
    case 'card':
      return `Montant à régler : ${amount.toFixed(2)}€ par Carte bleue`;
    case 'transfer':
      return `Montant à régler : ${amount.toFixed(2)}€ par Virement`;
    case 'check':
      return `Montant à régler : ${amount.toFixed(2)}€ par Chèque`;
    case 'multiple_checks': {
      const numberOfChecks = details?.numberOfChecks || 1;
      const amountPerCheck = details?.amountPerCheck || amount;
      return `Montant à régler : ${amount.toFixed(2)}€ par ${numberOfChecks} chèques de ${amountPerCheck.toFixed(2)}€`;
    }
    case 'installment': {
      const downPayment = details?.downPayment || 0;
      const remaining = amount - downPayment;
      return `Acompte versé : ${downPayment.toFixed(2)}€ - Reste à payer : ${remaining.toFixed(2)}€`;
    }
    default:
      return `Montant à régler : ${amount.toFixed(2)}€`;
  }
};
