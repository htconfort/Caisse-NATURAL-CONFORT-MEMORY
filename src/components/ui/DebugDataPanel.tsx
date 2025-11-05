import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Database, Download, RefreshCw, Trash2, AlertTriangle, CheckCircle, Info, X } from 'lucide-react';

// ==========================
// 🔧 DebugDataPanel (React)
// ==========================
// Objectif: Outil universel pour inspecter l'état des données locales (IndexedDB/Dexie),
// vérifier l'environnement de build, et déclencher des actions de maintenance
// (Reset DB locale, Re-seed en DEV, Forcer une re-synchronisation).

// Types pour le système de debug
interface DexieTable {
  count(): Promise<number>;
  limit(count: number): { toArray(): Promise<TableRecord[]> };
  toArray(): Promise<TableRecord[]>;
}

export interface DexieLike {
  name: string;
  tables?: DexieTable[];
  table?: (name: string) => DexieTable;
  [key: string]: unknown;
}

interface TableRecord {
  id?: string | number;
  saleId?: string;
  vendorId?: string;
  name?: string;
  productName?: string;
  paymentMethod?: string;
  date?: string | Date;
  lastUpdate?: string | Date;
  openedAt?: string | Date;
}

interface DebugDataPanelProps {
  db: DexieLike;
  dbName?: string;
  onForceSync?: () => Promise<void> | void;
  onReseedDev?: (db: DexieLike) => Promise<void> | void;
  className?: string;
}

interface TableInfo {
  name: string;
  count: number;
  sample?: Array<{
    id: string | number;
    name: string;
    date: string | null;
  }>;
}

interface EnvInfo {
  MODE?: string;
  VITE_CONTEXT?: string;
  VITE_BRANCH?: string;
  VITE_COMMIT_REF?: string;
  VITE_BUILD_TIME?: string;
  VITE_FIREBASE_PROJECT_ID?: string;
}

interface StorageInfo {
  usage: number;
  quota: number;
  usageFormatted: string;
  quotaFormatted: string;
  percentage: number;
}

interface StorageEstimate {
  usage?: number;
  quota?: number;
}

type TabKey = 'data' | 'env' | 'storage' | 'actions' | 'tests';

const isDevEnv = () => {
  try {
    return (
      import.meta.env.MODE === 'development' ||
      import.meta.env.VITE_CONTEXT === 'dev' ||
      import.meta.env.DEV === true
    );
  } catch {
    return false;
  }
};

const getEnvInfo = (): EnvInfo => ({
  MODE: import.meta.env.MODE,
  VITE_CONTEXT: import.meta.env.VITE_CONTEXT,
  VITE_BRANCH: import.meta.env.VITE_BRANCH,
  VITE_COMMIT_REF: import.meta.env.VITE_COMMIT_REF,
  VITE_BUILD_TIME: import.meta.env.VITE_BUILD_TIME,
  VITE_FIREBASE_PROJECT_ID: import.meta.env.VITE_FIREBASE_PROJECT_ID,
});

async function estimateStorage(): Promise<StorageInfo | null> {
  if ((navigator as unknown as { storage?: { estimate(): Promise<StorageEstimate> } }).storage?.estimate) {
    try {
      const est = await (navigator as unknown as { storage: { estimate(): Promise<StorageEstimate> } }).storage.estimate();
      const usage = est.usage || 0;
      const quota = est.quota || 0;
      
      const formatBytes = (bytes: number) => {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
      };

      return {
        usage,
        quota,
        usageFormatted: formatBytes(usage),
        quotaFormatted: formatBytes(quota),
        percentage: quota > 0 ? Math.round((usage / quota) * 100) : 0
      };
    } catch (err) {
      console.warn('Storage estimation failed:', err);
      return null;
    }
  }
  return null;
}

export const DebugDataPanel: React.FC<DebugDataPanelProps> = ({
  db,
  dbName,
  onForceSync,
  onReseedDev,
  className = ''
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<TabKey>('data');
  const [tableInfos, setTableInfos] = useState<TableInfo[]>([]);
  const [envInfo, setEnvInfo] = useState<EnvInfo>({});
  const [storageInfo, setStorageInfo] = useState<StorageInfo | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  const isDev = useMemo(() => isDevEnv(), []);
  const effectiveDbName = dbName || db.name || 'MyConfortDB';

  // Raccourci clavier Ctrl/⌘ + Alt + D
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.altKey && e.key === 'd') {
        e.preventDefault();
        setIsOpen(true);
      }
    };

    const handleCustomEvent = () => {
      setIsOpen(true);
    };

    document.addEventListener('keydown', handleKeyDown);
    window.addEventListener('open-debug-panel', handleCustomEvent);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('open-debug-panel', handleCustomEvent);
    };
  }, []);

  // Charger les informations au premier affichage
  useEffect(() => {
    if (isOpen && !lastRefresh) {
      // refreshData sera appelé manuellement lors du premier affichage
    }
  }, [isOpen, lastRefresh]);

  const refreshData = useCallback(async () => {
    setIsLoading(true);
    try {
      // Informations des tables
      const tables: TableInfo[] = [];
      const commonTables = ['sales', 'vendors', 'cartItems', 'stock', 'sessions'];
      
      for (const tableName of commonTables) {
        try {
          const table = db.table ? db.table(tableName) : (db as Record<string, unknown>)[tableName];
          if (table && typeof (table as DexieTable).count === 'function') {
            const count = await (table as DexieTable).count();
            let sample: TableRecord[] = [];
            
            if (count > 0 && typeof (table as DexieTable).limit === 'function') {
              sample = await (table as DexieTable).limit(3).toArray();
            }

            tables.push({
              name: tableName,
              count,
              sample: sample.map(item => ({
                id: item.id || item.saleId || item.vendorId || '?',
                name: item.name || item.productName || item.paymentMethod || '?',
                date: item.date ? 
                  (item.date instanceof Date ? item.date.toISOString() : String(item.date)) :
                  item.lastUpdate ? 
                    (item.lastUpdate instanceof Date ? item.lastUpdate.toISOString() : String(item.lastUpdate)) :
                    item.openedAt ?
                      (item.openedAt instanceof Date ? item.openedAt.toISOString() : String(item.openedAt)) :
                      null
              }))
            });
          }
        } catch (err) {
          console.warn(`Erreur lecture table ${tableName}:`, err);
          tables.push({
            name: tableName,
            count: -1,
            sample: []
          });
        }
      }

      setTableInfos(tables);

      // Informations d'environnement
      setEnvInfo(getEnvInfo());

      // Informations de stockage
      const storage = await estimateStorage();
      setStorageInfo(storage);

      setLastRefresh(new Date());
    } catch (err) {
      console.error('Erreur refresh debug panel:', err);
    } finally {
      setIsLoading(false);
    }
  }, [db]);

  const exportData = useCallback(async () => {
    try {
      const data = {
        timestamp: new Date().toISOString(),
        env: envInfo,
        storage: storageInfo,
        tables: {} as Record<string, unknown>
      };

      for (const tableInfo of tableInfos) {
        if (tableInfo.count > 0) {
          try {
            const table = db.table ? db.table(tableInfo.name) : (db as Record<string, unknown>)[tableInfo.name];
            data.tables[tableInfo.name] = await (table as DexieTable).toArray();
          } catch (err) {
            data.tables[tableInfo.name] = { error: err instanceof Error ? err.message : 'Erreur inconnue' };
          }
        }
      }

      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${effectiveDbName}-dump-${new Date().toISOString().slice(0, 19)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      alert(`Erreur export: ${err instanceof Error ? err.message : 'Erreur inconnue'}`);
    }
  }, [db, effectiveDbName, envInfo, storageInfo, tableInfos]);

  const resetLocalDB = useCallback(async () => {
    if (!confirm(`⚠️ DANGER: Effacer complètement la base locale "${effectiveDbName}" ?\n\nCeci supprimera:\n• Toutes les ventes\n• Tous les vendeurs\n• Tout le stock\n• Les paramètres\n\nCette action est IRRÉVERSIBLE !`)) {
      return;
    }

    if (!confirm('Êtes-vous VRAIMENT sûr ? Cette action ne peut pas être annulée.')) {
      return;
    }

    try {
      setIsLoading(true);
      
      // Supprimer IndexedDB
      await indexedDB.deleteDatabase(effectiveDbName);
      
      // Supprimer localStorage et sessionStorage
      localStorage.clear();
      sessionStorage.clear();
      
      alert('✅ Base locale supprimée. La page va se recharger.');
      window.location.reload();
    } catch (err) {
      alert(`Erreur reset DB: ${err instanceof Error ? err.message : 'Erreur inconnue'}`);
      setIsLoading(false);
    }
  }, [effectiveDbName]);

  const handleReseedDev = useCallback(async () => {
    if (!isDev) {
      alert('⚠️ Re-seed disponible uniquement en développement');
      return;
    }

    if (!onReseedDev) {
      alert('⚠️ Callback onReseedDev non fourni');
      return;
    }

    if (!confirm('Re-seed des données par défaut en DEV ?')) {
      return;
    }

    try {
      setIsLoading(true);
      await onReseedDev(db);
      await refreshData();
      alert('✅ Re-seed terminé');
    } catch (err) {
      alert(`Erreur re-seed: ${err instanceof Error ? err.message : 'Erreur inconnue'}`);
    } finally {
      setIsLoading(false);
    }
  }, [isDev, onReseedDev, db, refreshData]);

  const handleForceSync = useCallback(async () => {
    if (!onForceSync) {
      alert('⚠️ Callback onForceSync non fourni');
      return;
    }

    if (!confirm('Forcer la synchronisation avec la source distante ?')) {
      return;
    }

    try {
      setIsLoading(true);
      await onForceSync();
      await refreshData();
      alert('✅ Synchronisation terminée');
    } catch (err) {
      alert(`Erreur synchronisation: ${err instanceof Error ? err.message : 'Erreur inconnue'}`);
    } finally {
      setIsLoading(false);
    }
  }, [onForceSync, refreshData]);

  if (!isOpen) {
    return null;
  }

  return (
    <div className={`fixed inset-0 bg-black bg-opacity-50 z-[9999] flex items-center justify-center p-4 ${className}`}>
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b bg-gray-50">
          <div className="flex items-center gap-2">
            <Database className="text-blue-500" size={20} />
            <h2 className="text-lg font-bold">Debug Data Panel</h2>
            <span className="text-sm text-gray-500">({effectiveDbName})</span>
            {isDev && <span className="bg-orange-100 text-orange-800 text-xs px-2 py-1 rounded">DEV</span>}
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="text-gray-500 hover:text-gray-700"
          >
            <X size={20} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b">
          {[
            { key: 'data', label: 'Données', icon: Database },
            { key: 'env', label: 'Environnement', icon: Info },
            { key: 'storage', label: 'Stockage', icon: RefreshCw },
            { key: 'actions', label: 'Actions', icon: AlertTriangle }
          ].map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key as TabKey)}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 ${
                activeTab === key 
                  ? 'border-blue-500 text-blue-600 bg-blue-50' 
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <Icon size={16} />
              {label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-4">
          {isLoading && (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="animate-spin mr-2" size={20} />
              Chargement...
            </div>
          )}

          {/* Données */}
          {activeTab === 'data' && !isLoading && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold">Tables de données</h3>
                <button
                  onClick={refreshData}
                  className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800"
                >
                  <RefreshCw size={14} />
                  Actualiser
                </button>
              </div>
              
              {tableInfos.map((table) => (
                <div key={table.name} className="border rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium">{table.name}</h4>
                    <span className={`px-2 py-1 rounded text-sm ${
                      table.count === -1 ? 'bg-red-100 text-red-800' :
                      table.count === 0 ? 'bg-gray-100 text-gray-800' :
                      'bg-green-100 text-green-800'
                    }`}>
                      {table.count === -1 ? 'Erreur' : `${table.count} enregistrements`}
                    </span>
                  </div>
                  
                  {table.sample && table.sample.length > 0 && (
                    <div className="text-xs text-gray-600 bg-gray-50 p-2 rounded">
                      <strong>Échantillon:</strong>
                      {table.sample.map((item, idx) => (
                        <div key={idx} className="truncate">
                          {item.id} | {item.name} | {item.date ? new Date(item.date).toLocaleDateString() : 'N/A'}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
              
              {lastRefresh && (
                <div className="text-xs text-gray-500 text-center">
                  Dernière actualisation: {lastRefresh.toLocaleTimeString()}
                </div>
              )}
            </div>
          )}

          {/* Environnement */}
          {activeTab === 'env' && !isLoading && (
            <div className="space-y-4">
              <h3 className="font-bold">Informations d'environnement</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.entries(envInfo).map(([key, value]) => (
                  <div key={key} className="border rounded-lg p-3">
                    <div className="font-medium text-sm text-gray-600">{key}</div>
                    <div className="font-mono text-sm">{value || 'Non défini'}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Stockage */}
          {activeTab === 'storage' && !isLoading && (
            <div className="space-y-4">
              <h3 className="font-bold">Informations de stockage</h3>
              {storageInfo ? (
                <div className="border rounded-lg p-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div>
                      <div className="text-sm text-gray-600">Utilisé</div>
                      <div className="font-bold text-lg">{storageInfo.usageFormatted}</div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-600">Quota</div>
                      <div className="font-bold text-lg">{storageInfo.quotaFormatted}</div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-600">Pourcentage</div>
                      <div className="font-bold text-lg">{storageInfo.percentage}%</div>
                    </div>
                  </div>
                  
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full ${
                        storageInfo.percentage > 80 ? 'bg-red-500' :
                        storageInfo.percentage > 60 ? 'bg-yellow-500' : 'bg-green-500'
                      }`}
                      style={{ width: `${Math.min(storageInfo.percentage, 100)}%` }}
                    />
                  </div>
                </div>
              ) : (
                <div className="text-gray-500 text-center py-8">
                  Informations de stockage non disponibles dans ce navigateur
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          {activeTab === 'actions' && !isLoading && (
            <div className="space-y-4">
              <h3 className="font-bold">Actions de maintenance</h3>
              
              <div className="space-y-3">
                <button
                  onClick={exportData}
                  className="w-full flex items-center gap-2 p-3 border rounded-lg hover:bg-gray-50"
                >
                  <Download className="text-blue-500" size={20} />
                  <div className="text-left">
                    <div className="font-medium">Exporter les données (JSON)</div>
                    <div className="text-sm text-gray-600">Sauvegarde complète de la base locale</div>
                  </div>
                </button>

                {onForceSync && (
                  <button
                    onClick={handleForceSync}
                    className="w-full flex items-center gap-2 p-3 border rounded-lg hover:bg-blue-50"
                  >
                    <RefreshCw className="text-blue-500" size={20} />
                    <div className="text-left">
                      <div className="font-medium">Forcer la synchronisation</div>
                      <div className="text-sm text-gray-600">Re-synchroniser avec la source distante</div>
                    </div>
                  </button>
                )}

                {isDev && onReseedDev && (
                  <button
                    onClick={handleReseedDev}
                    className="w-full flex items-center gap-2 p-3 border rounded-lg hover:bg-orange-50"
                  >
                    <CheckCircle className="text-orange-500" size={20} />
                    <div className="text-left">
                      <div className="font-medium">Re-seed données (DEV seulement)</div>
                      <div className="text-sm text-gray-600">Ajouter les données par défaut si tables vides</div>
                    </div>
                  </button>
                )}

                <button
                  onClick={resetLocalDB}
                  className="w-full flex items-center gap-2 p-3 border border-red-300 rounded-lg hover:bg-red-50"
                >
                  <Trash2 className="text-red-500" size={20} />
                  <div className="text-left">
                    <div className="font-medium text-red-600">⚠️ Reset base locale (DANGER)</div>
                    <div className="text-sm text-gray-600">Supprime TOUTES les données locales - IRRÉVERSIBLE</div>
                  </div>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t p-3 bg-gray-50 text-xs text-gray-500">
          💡 Raccourci: Ctrl/⌘ + Alt + D | Événement: window.dispatchEvent(new CustomEvent('open-debug-panel'))
        </div>
      </div>
    </div>
  );
};
