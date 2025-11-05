import React, { useState } from 'react';
import { Package, Archive } from 'lucide-react';
import { GeneralStockTab } from './GeneralStockTab';
import { PhysicalStockTab } from './PhysicalStockTab';
import '../../../styles/compact-stock-tabs.css';

interface CompactStockTabsNavProps {
  defaultActiveTab?: string;
}

export const CompactStockTabsNav: React.FC<CompactStockTabsNavProps> = ({ 
  defaultActiveTab = 'general' 
}) => {
  const [activeTab, setActiveTab] = useState(defaultActiveTab);

  const tabs = [
    {
      id: 'general',
      label: 'Général',
      icon: Package,
      component: <GeneralStockTab />
    },
    {
      id: 'physical',
      label: 'Physique',
      icon: Archive,
      component: <PhysicalStockTab />
    }
  ];

  return (
    <div className="space-y-6">
      {/* Navigation compacte horizontale */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-2">
        <div className="flex items-center gap-2 overflow-x-auto">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  compact-stock-tab-button
                  flex items-center gap-2 px-4 py-3 rounded-lg transition-all duration-200 
                  whitespace-nowrap min-w-max font-medium
                  ${isActive 
                    ? 'bg-blue-500 text-white shadow-lg transform scale-105' 
                    : 'bg-gray-50 text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                  }
                `}
              >
                <Icon size={18} />
                <span className="font-semibold">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Contenu de l'onglet actif */}
      <div className="compact-stock-content">
        {tabs.find(tab => tab.id === activeTab)?.component}
      </div>
    </div>
  );
};
