import React, { useState, useEffect } from 'react';
import { Database, Trash2, RefreshCw, Settings, Eye, Download, Upload } from 'lucide-react';
import { db } from '../../db';
import { vendors as defaultVendors } from '../../data';

interface DataDebugPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

interface DatabaseStats {
  vendors: number;
  sales: number;
  settings: number;
  stock: number;
}

interface VendorData {
  id: string;
  name: string;
  dailySales?: number;
  totalSales?: number;
  salesCount?: number;
}

export const DataDebugPanel: React.FC<DataDebugPanelProps> = ({ isOpen, onClose }) => {
  const [stats, setStats] = useState<DatabaseStats>({ vendors: 0, sales: 0, settings: 0, stock: 0 });
  const [vendors, setVendors] = useState<VendorData[]>([]);
  const [envInfo, setEnvInfo] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadDatabaseInfo();
      loadEnvironmentInfo();
    }
  }, [isOpen]);

  const loadEnvironmentInfo = () => {
    setEnvInfo({
      MODE: import.meta.env.MODE || 'unknown',
      VITE_CONTEXT: import.meta.env.VITE_CONTEXT || 'unknown',
      VITE_BRANCH: import.meta.env.VITE_BRANCH || 'local',
      VITE_COMMIT_REF: (import.meta.env.VITE_COMMIT_REF || 'dev').slice(0, 7),
      VITE_BUILD_TIME: import.meta.env.VITE_BUILD_TIME || 'unknown',
      USER_AGENT: navigator.userAgent.includes('iPad') ? 'iPad' : 'Desktop',
      URL: window.location.href
    });
  };

  const loadDatabaseInfo = async () => {
    try {
      setLoading(true);
      
      // Statistiques des tables
      const vendorCount = await db.vendors?.count() || 0;
      const salesCount = await db.sales?.count() || 0;
      const settingsCount = await db.settings?.count() || 0;
      const cacheCount = await db.cache?.count() || 0;

      setStats({
        vendors: vendorCount,
        sales: salesCount,
        settings: settingsCount,
        stock: cacheCount
      });

      // Données des vendeuses
      const vendorData = await db.vendors?.toArray() || [];
      setVendors(vendorData.map(v => ({
        id: v.id,
        name: v.name,
        active: v.active,
        dailySales: v.dailySales,
        totalSales: v.totalSales
      })));

    } catch (error) {
      console.error('Erreur lors du chargement des données:', error);
    } finally {
      setLoading(false);
    }
  };

  const resetLocalDatabase = async () => {
    if (!confirm('⚠️ DANGER: Effacer TOUTE la base locale ?\n\nCeci supprimera:\n- Toutes les vendeuses\n- Toutes les ventes\n- Toutes les factures\n- Tous les paramètres\n\nCette action est IRRÉVERSIBLE !')) {
      return;
    }

    try {
      setLoading(true);
      
      // Fermer la connexion Dexie
      await db.close();
      
      // Supprimer la base IndexedDB
      await new Promise((resolve, reject) => {
        const deleteReq = indexedDB.deleteDatabase('MyConfortDB');
        deleteReq.onsuccess = () => resolve(true);
        deleteReq.onerror = () => reject(deleteReq.error);
      });

      // Vider les autres stockages
      localStorage.clear();
      sessionStorage.clear();
      
      alert('✅ Base locale supprimée. Rechargement de la page...');
      window.location.reload();
    } catch (error) {
      console.error('Erreur lors du reset:', error);
      alert('❌ Erreur lors du reset: ' + error);
    }
  };

  const reseedVendors = async () => {
    if (!confirm('Réinitialiser les vendeuses avec les données par défaut ?')) return;

    try {
      setLoading(true);
      
      // Vider les vendeuses actuelles
      await db.vendors?.clear();
      
      // Ajouter les vendeuses par défaut
      await db.vendors?.bulkAdd(defaultVendors.map(v => ({
        ...v,
        active: true,
        dailySales: 0,
        totalSales: 0
      })));
      
      alert('✅ Vendeuses réinitialisées avec les données par défaut');
      await loadDatabaseInfo();
    } catch (error) {
      console.error('Erreur lors du reseed:', error);
      alert('❌ Erreur: ' + error);
    } finally {
      setLoading(false);
    }
  };

  const exportData = async () => {
    try {
      const data = {
        vendors: await db.vendors?.toArray() || [],
        sales: await db.sales?.toArray() || [],
        invoices: await db.invoices?.toArray() || [],
        settings: await db.settings?.toArray() || [],
        exportDate: new Date().toISOString(),
        environment: envInfo
      };

      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `myconfort-backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      alert('Erreur lors de l\'export: ' + error);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[80vh] overflow-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <Database className="text-blue-500" />
              Debug Panel - Données & Environnement
            </h2>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-700 text-xl">✕</button>
          </div>

          {loading && (
            <div className="text-center py-4">
              <RefreshCw className="animate-spin mx-auto mb-2" />
              Chargement...
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Environnement */}
            <div className="space-y-4">
              <h3 className="font-bold text-lg flex items-center gap-2">
                <Settings className="text-green-500" />
                Environnement
              </h3>
              <div className="bg-gray-50 p-3 rounded text-sm space-y-1">
                {Object.entries(envInfo).map(([key, value]) => (
                  <div key={key}>
                    <strong>{key}:</strong> {value}
                  </div>
                ))}
              </div>
            </div>

            {/* Statistiques Base */}
            <div className="space-y-4">
              <h3 className="font-bold text-lg flex items-center gap-2">
                <Database className="text-blue-500" />
                Base de Données
              </h3>
              <div className="bg-gray-50 p-3 rounded text-sm space-y-1">
                <div><strong>Vendeuses:</strong> {stats.vendors}</div>
                <div><strong>Ventes:</strong> {stats.sales}</div>
                <div><strong>Factures:</strong> {stats.invoices}</div>
                <div><strong>Paramètres:</strong> {stats.settings}</div>
              </div>
            </div>

            {/* Vendeuses Détail */}
            <div className="space-y-4 md:col-span-2">
              <h3 className="font-bold text-lg flex items-center gap-2">
                <Eye className="text-purple-500" />
                Vendeuses Actuelles vs Par Défaut
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium mb-2">Actuelles ({vendors.length})</h4>
                  <div className="bg-gray-50 p-3 rounded text-sm max-h-32 overflow-y-auto">
                    {vendors.map(v => (
                      <div key={v.id} className="flex justify-between">
                        <span>{v.name}</span>
                        <span className="text-gray-500">({v.dailySales || 0}€)</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <h4 className="font-medium mb-2">Par Défaut ({defaultVendors.length})</h4>
                  <div className="bg-green-50 p-3 rounded text-sm max-h-32 overflow-y-auto">
                    {defaultVendors.map(v => (
                      <div key={v.id} className="flex justify-between">
                        <span>{v.name}</span>
                        <span className="text-gray-500">{v.color}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="mt-6 flex flex-wrap gap-3">
            <button
              onClick={loadDatabaseInfo}
              className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 flex items-center gap-2"
              disabled={loading}
            >
              <RefreshCw size={16} />
              Actualiser
            </button>
            
            <button
              onClick={exportData}
              className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 flex items-center gap-2"
            >
              <Download size={16} />
              Exporter Données
            </button>

            {envInfo.MODE === 'development' && (
              <button
                onClick={reseedVendors}
                className="bg-yellow-500 text-white px-4 py-2 rounded hover:bg-yellow-600 flex items-center gap-2"
              >
                <Upload size={16} />
                Reseed Vendeuses (DEV)
              </button>
            )}

            <button
              onClick={resetLocalDatabase}
              className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 flex items-center gap-2"
              disabled={loading}
            >
              <Trash2 size={16} />
              ⚠️ Reset Total (DANGER)
            </button>
          </div>

          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded text-sm">
            <strong>💡 Aide Debug:</strong>
            <ul className="mt-1 space-y-1">
              <li>• <strong>Même environnement ?</strong> Vérifiez VITE_CONTEXT et USER_AGENT</li>
              <li>• <strong>Vendeuses différentes ?</strong> Utilisez "Reseed" ou "Reset Total"</li>
              <li>• <strong>Console manuelle :</strong> <code>await db.vendors.toArray()</code></li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
