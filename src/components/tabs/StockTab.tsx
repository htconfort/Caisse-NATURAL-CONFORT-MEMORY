import React, { useState } from 'react';
import { Archive, Package, Truck, Store, Database, TrendingUp, LucideIcon } from 'lucide-react';
import { GeneralStockTab, TrailerEntryTab, StandEntryTab } from './stock';
import { PhysicalStockManager } from '../PhysicalStockManager';
import { SoldStockTab } from './stock/SoldStockTab';

type StockSubTab = 'general' | 'trailer' | 'stand' | 'physical' | 'sold';

interface SubTabInfo {
  id: StockSubTab;
  label: string;
  icon: LucideIcon;
  color: string;
  description: string;
}

const stockSubTabs: SubTabInfo[] = [
  {
    id: 'general',
    label: 'Stock général',
    icon: Package,
    color: '#16A34A',
    description: 'Inventaire principal et gestion des stocks'
  },
  {
    id: 'physical',
    label: 'Stock physique',
    icon: Database,
    color: '#8B5CF6',
    description: 'Stock réel avec déductions automatiques N8N'
  },
  {
    id: 'sold',
    label: 'Stock vendu',
    icon: TrendingUp,
    color: '#F55D3E',
    description: 'Produits vendus par catégorie (jour + session)'
  },
  {
    id: 'trailer',
    label: 'Remorque entrée',
    icon: Truck,
    color: '#3B82F6',
    description: 'Produits en cours de livraison'
  },
  {
    id: 'stand',
    label: 'Stand entrée',
    icon: Store,
    color: '#F59E0B',
    description: 'Vitrine et exposition client'
  }
];

export const StockTab: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<StockSubTab>('general');

  const renderActiveTab = () => {
    switch (activeSubTab) {
      case 'general':
        return <GeneralStockTab />;
      case 'physical':
        return <PhysicalStockManager />;
      case 'sold':
        return <SoldStockTab />;
      case 'trailer':
        return <TrailerEntryTab />;
      case 'stand':
        return <StandEntryTab />;
      default:
        return <GeneralStockTab />;
    }
  };

  return (
    <div>
      {/* En-tête avec titre principal */}
      <div className="card mb-6" style={{ backgroundColor: '#F8FAFC', borderLeft: '4px solid #7C3AED' }}>
        <div className="flex items-center gap-3">
          <Archive size={24} style={{ color: '#7C3AED' }} />
          <div>
            <h2 className="text-xl font-bold" style={{ color: '#000000' }}>
              Gestion des Stocks
            </h2>
            <p className="text-sm" style={{ color: '#6B7280' }}>
              Suivi complet des inventaires, livraisons et exposition
            </p>
          </div>
        </div>
      </div>

      {/* Navigation des sous-onglets */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {stockSubTabs.map((subTab) => {
          const Icon = subTab.icon;
          const isActive = activeSubTab === subTab.id;
          
          return (
            <button
              key={subTab.id}
              onClick={() => setActiveSubTab(subTab.id)}
              className="p-4 rounded-lg border-2 transition-all duration-200 hover:shadow-lg transform hover:scale-105"
              style={{
                backgroundColor: isActive ? subTab.color : '#F8FAFC',
                borderColor: subTab.color,
                color: isActive ? 'white' : '#374151'
              }}
            >
              <div className="flex items-center gap-3 mb-2">
                <Icon 
                  size={24} 
                  style={{ color: isActive ? 'white' : subTab.color }} 
                />
                <span 
                  className="text-lg font-bold"
                  style={{ color: isActive ? 'white' : '#000000' }}
                >
                  {subTab.label}
                </span>
              </div>
              <p 
                className="text-sm text-left font-medium"
                style={{ color: isActive ? 'rgba(255,255,255,0.9)' : '#6B7280' }}
              >
                {subTab.description}
              </p>
            </button>
          );
        })}
      </div>

      {/* Contenu du sous-onglet actif */}
      <div className="transition-all duration-300">
        {renderActiveTab()}
      </div>
    </div>
  );
};
