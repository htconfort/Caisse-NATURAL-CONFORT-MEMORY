import React, { useState } from 'react';
import { 
  Archive, 
  Package, 
  Database, 
  AlertTriangle,
  CheckCircle,
  BarChart3,
  Eye,
  EyeOff,
  MoreHorizontal,
  TrendingUp,
  LucideIcon
} from 'lucide-react';
import { GeneralStockTab, PhysicalStockTab, CompactStockTabsNav, SoldStockTab } from './stock';
import '../../styles/stock-elegant.css';

type StockSubTab = 'general' | 'physical' | 'sold';

interface SubTabInfo {
  id: StockSubTab;
  label: string;
  icon: LucideIcon;
  color: string;
  description: string;
  gradient: string;
}

const stockSubTabs: SubTabInfo[] = [
  {
    id: 'general',
    label: 'Stock général',
    icon: Package,
    color: '#16A34A',
    description: 'Inventaire principal et gestion des stocks',
    gradient: 'from-emerald-500 to-green-600'
  },
  {
    id: 'physical',
    label: 'Stock physique',
    icon: Database,
    color: '#8B5CF6',
    description: 'Stock réel avec déductions automatiques N8N',
    gradient: 'from-purple-500 to-violet-600'
  },
  {
    id: 'sold',
    label: 'Stock vendu',
    icon: TrendingUp,
    color: '#F55D3E',
    description: 'Produits vendus par catégorie (jour + session)',
    gradient: 'from-orange-500 to-red-600'
  }
];

type ViewMode = 'cards' | 'compact' | 'horizontal';

export const StockTabElegant: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<StockSubTab>('general');
  const [viewMode, setViewMode] = useState<ViewMode>('cards');

  const cycleViewMode = () => {
    const modes: ViewMode[] = ['cards', 'compact', 'horizontal'];
    const currentIndex = modes.indexOf(viewMode);
    const nextIndex = (currentIndex + 1) % modes.length;
    setViewMode(modes[nextIndex]);
  };

  const getViewModeLabel = () => {
    switch (viewMode) {
      case 'cards': return 'Vue cartes';
      case 'compact': return 'Vue compacte';
      case 'horizontal': return 'Vue horizontale';
      default: return 'Vue cartes';
    }
  };

  const renderActiveTab = () => {
    // Si mode horizontal, utiliser CompactStockTabsNav
    if (viewMode === 'horizontal') {
      return <CompactStockTabsNav defaultActiveTab={activeSubTab} />;
    }
    
    // Sinon, utiliser le rendu traditionnel
    switch (activeSubTab) {
      case 'general':
        return <GeneralStockTab />;
      case 'physical':
        return <PhysicalStockTab />;
      case 'sold':
        return <SoldStockTab />;
      default:
        return <GeneralStockTab />;
    }
  };

  return (
    <div className="stock-elegant-container space-y-6">
      {/* Header principal avec statistiques rapides */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-gray-50 to-white border border-gray-200 shadow-sm">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-purple-500/5"></div>
        <div className="relative p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 text-white shadow-lg">
                <Archive size={28} />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Gestion des Stocks
                </h1>
                <p className="text-gray-600">
                  Suivi complet des inventaires, livraisons et exposition
                </p>
              </div>
            </div>
            
            {/* Toggle modes de vue */}
            <button
              onClick={cycleViewMode}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white border border-gray-200 hover:border-gray-300 transition-all duration-200 hover:shadow-md"
            >
              {viewMode === 'cards' && <Eye size={16} />}
              {viewMode === 'compact' && <EyeOff size={16} />}
              {viewMode === 'horizontal' && <MoreHorizontal size={16} />}
              <span className="text-sm font-medium text-gray-700">
                {getViewModeLabel()}
              </span>
            </button>
          </div>

          {/* Statistiques rapides - Version compacte inline */}
          <div className="flex items-center justify-between bg-white/60 backdrop-blur rounded-xl p-3 border border-gray-100">
            <div className="flex items-center gap-8">
              <div className="stat-card flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-emerald-100">
                  <CheckCircle size={16} className="text-emerald-600" />
                </div>
                <div>
                  <div className="text-lg font-bold text-gray-900">89%</div>
                  <div className="text-xs text-gray-600">Stock OK</div>
                </div>
              </div>
              
              <div className="stat-card flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-amber-100">
                  <AlertTriangle size={16} className="text-amber-600" />
                </div>
                <div>
                  <div className="text-lg font-bold text-gray-900">12</div>
                  <div className="text-xs text-gray-600">Stock faible</div>
                </div>
              </div>
              
              <div className="stat-card flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-purple-100">
                  <BarChart3 size={16} className="text-purple-600" />
                </div>
                <div>
                  <div className="text-lg font-bold text-gray-900">142</div>
                  <div className="text-xs text-gray-600">Références</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation des sous-onglets - Design moderne avec cartes */}
      {viewMode !== 'horizontal' && (
        <div className={`grid gap-4 ${viewMode === 'compact' ? 'grid-cols-2' : 'grid-cols-1 md:grid-cols-2'}`}>
          {stockSubTabs.map((subTab) => {
            const Icon = subTab.icon;
            const isActive = activeSubTab === subTab.id;
            
            return (
              <div
                key={subTab.id}
                onClick={() => setActiveSubTab(subTab.id)}
                className={`nav-card ${isActive ? 'active' : ''} relative group cursor-pointer transition-all duration-300 ${
                  isActive ? 'scale-105' : 'hover:scale-102'
                }`}
              >
                {/* Card principale */}
                <div
                  className={`shine-effect relative overflow-hidden rounded-2xl shadow-lg transition-all duration-300 ${
                    isActive 
                      ? 'shadow-xl ring-2 ring-offset-2' 
                      : 'shadow-md hover:shadow-lg'
                  }`}
                  style={{
                    background: isActive 
                      ? `linear-gradient(135deg, ${subTab.color}, ${subTab.color}dd)` 
                      : 'white',
                    ...(isActive && { '--tw-ring-color': subTab.color } as React.CSSProperties)
                  }}
                >
                  {/* Effet de brillance */}
                  <div className="absolute inset-0 bg-gradient-to-r from-white/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  
                  <div className={`relative p-${viewMode === 'compact' ? '4' : '6'}`}>
                    {/* Header avec icône */}
                    <div className="flex items-center gap-3 mb-3">
                      <div 
                        className={`p-3 rounded-xl shadow-lg transition-all duration-300 ${
                          isActive ? 'bg-white/20 backdrop-blur' : 'bg-gray-100 group-hover:bg-gray-200'
                        }`}
                      >
                        <Icon 
                          size={24} 
                          className={isActive ? 'text-white' : 'text-gray-700'}
                        />
                      </div>
                      <div className="flex-1">
                        <h3 
                          className={`text-lg font-bold transition-colors ${
                            isActive ? 'text-white' : 'text-gray-900'
                          }`}
                        >
                          {subTab.label}
                        </h3>
                      </div>
                    </div>

                    {/* Description */}
                    {viewMode !== 'compact' && (
                      <p 
                        className={`text-sm leading-relaxed transition-colors ${
                          isActive ? 'text-white/90' : 'text-gray-600'
                        }`}
                      >
                        {subTab.description}
                      </p>
                    )}

                    {/* Indicateur d'activation */}
                    {isActive && (
                      <div className="absolute top-4 right-4">
                        <div className="w-3 h-3 bg-white rounded-full shadow-lg animate-pulse"></div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Ombre colorée */}
                <div 
                  className={`absolute inset-0 rounded-2xl transition-all duration-300 -z-10 ${
                    isActive ? 'blur-xl opacity-30' : 'opacity-0'
                  }`}
                  style={{ backgroundColor: subTab.color }}
                ></div>
              </div>
            );
          })}
        </div>
      )}

      {/* Contenu du sous-onglet actif avec animation */}
      <div className="relative">
        <div 
          key={activeSubTab}
          className="animate-fadeIn"
          style={{ 
            animationDuration: '300ms',
            animationFillMode: 'both'
          }}
        >
          {renderActiveTab()}
        </div>
      </div>
    </div>
  );
};
