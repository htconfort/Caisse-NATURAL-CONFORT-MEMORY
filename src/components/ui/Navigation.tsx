import React from 'react';
import type { TabType } from '../../types';
import { tabs } from '../../data/constants';

interface NavigationProps {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  cartItemsCount: number;
  salesCount: number;
  cartLength: number;
  invoicesCount?: number; // Nouveau prop pour les factures
  pendingPaymentsCount?: number; // Nouveau prop pour les règlements
}

export const Navigation: React.FC<NavigationProps> = ({ 
  activeTab, 
  setActiveTab, 
  cartItemsCount, 
  salesCount,
  cartLength,
  invoicesCount = 0, // Valeur par défaut
  pendingPaymentsCount = 0 // Valeur par défaut
}) => {
  return (
    <nav className="border-b bg-white">
      <div className="flex overflow-x-auto">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-6 py-4 font-semibold transition-all relative touch-feedback ${
              activeTab === tab.id 
                ? 'header-white-text' 
                : 'hover:bg-gray-50'
            } ${tab.id === 'factures-supabase' ? 'flex-col' : 'whitespace-nowrap'}`}
            style={{
              backgroundColor: activeTab === tab.id ? 'var(--primary-green)' : 'transparent',
              color: activeTab === tab.id ? 'white' : '#000000',
              minWidth: '120px',
              textAlign: tab.id === 'factures-supabase' ? 'center' : 'left'
            }}
          >
            <tab.icon size={20} />
            {tab.id === 'factures-supabase' ? (
              <div style={{ 
                display: 'flex', 
                flexDirection: 'column', 
                alignItems: 'center',
                lineHeight: '1.2',
                fontSize: '13px'
              }}>
                <span>Application</span>
                <span>Facturation</span>
              </div>
            ) : (
              tab.label
            )}
            
            {tab.id === 'ventes' && cartLength > 0 && (
              <span className="absolute -top-1 -right-1 w-6 h-6 flex items-center justify-center text-xs rounded-full"
                style={{ backgroundColor: '#F59E0B', color: 'white' }}>
                {cartItemsCount}
              </span>
            )}
            
            {/* NOUVEAU : Badge pour l'onglet factures */}
            {tab.id === 'factures' && invoicesCount > 0 && (
              <span className="absolute -top-1 -right-1 w-6 h-6 flex items-center justify-center text-xs rounded-full"
                style={{ backgroundColor: '#3B82F6', color: 'white' }}>
                {invoicesCount}
              </span>
            )}
            
            {/* 🔴 Badge ROUGE pour l'onglet règlements (règlements en attente = URGENT) */}
            {tab.id === 'reglements' && pendingPaymentsCount > 0 && (
              <span className="absolute -top-1 -right-1 w-6 h-6 flex items-center justify-center text-xs rounded-full animate-pulse"
                style={{ backgroundColor: '#DC2626', color: 'white', fontWeight: 'bold' }}>
                {pendingPaymentsCount}
              </span>
            )}
            
            {tab.id === 'annulation' && cartLength > 0 && (
              <span className="absolute -top-1 -right-1 w-6 h-6 flex items-center justify-center text-xs rounded-full"
                style={{ backgroundColor: 'var(--warning-red)', color: 'white' }}>
                {cartItemsCount}
              </span>
            )}
            
            {tab.id === 'raz' && (salesCount > 0 || cartLength > 0) && (
              <span className="absolute -top-1 -right-1 w-6 h-6 flex items-center justify-center text-xs rounded-full animate-pulse"
                style={{ backgroundColor: '#DC2626', color: 'white' }}>
                !
              </span>
            )}
          </button>
        ))}
      </div>
    </nav>
  );
};
