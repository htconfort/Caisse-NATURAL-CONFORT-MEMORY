// src/components/ResetSystemPro.tsx
// Interface de réinitialisation complète pour MyConfort

import React, { useState, useEffect } from 'react';
import { 
  Trash2, 
  RefreshCw, 
  AlertTriangle, 
  CheckCircle, 
  Download, 
  Upload,
  Database,
  Clock,
  BarChart3,
  ShoppingCart,
  Users,
  Package
} from 'lucide-react';
import ResetService from '@/services/resetService';

interface ResetSystemProProps {
  onClose?: () => void;
}

interface Stats {
  sales: number;
  vendors: number;
  cartItems: number;
  stock: number;
  sessions: number;
  invoices: number;
  localStorageKeys: number;
}

export const ResetSystemPro: React.FC<ResetSystemProProps> = ({ onClose }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [backups, setBackups] = useState<any[]>([]);
  const [selectedBackup, setSelectedBackup] = useState<string>('');

  // Charger les statistiques et sauvegardes
  useEffect(() => {
    loadStats();
    loadBackups();
  }, []);

  const loadStats = async () => {
    try {
      const currentStats = await ResetService.getCurrentStats();
      setStats(currentStats);
    } catch (error) {
      console.error('Erreur chargement stats:', error);
    }
  };

  const loadBackups = () => {
    const availableBackups = ResetService.getAvailableBackups();
    setBackups(availableBackups);
  };

  const handleReset = async (type: 'full' | 'checks' | 'sales') => {
    if (!confirm(`Êtes-vous sûr de vouloir effectuer cette réinitialisation ?`)) {
      return;
    }

    setIsLoading(true);
    setResult(null);

    try {
      let resetResult;
      
      switch (type) {
        case 'full':
          resetResult = await ResetService.fullReset();
          break;
        case 'checks':
          resetResult = await ResetService.clearPendingChecks();
          break;
        case 'sales':
          resetResult = await ResetService.resetSalesOnly();
          break;
      }

      setResult(resetResult);
      await loadStats();
      loadBackups();

      // Recharger la page après reset complet
      if (type === 'full' && resetResult.success) {
        setTimeout(() => {
          window.location.reload();
        }, 3000);
      }

    } catch (error) {
      setResult({
        success: false,
        message: `Erreur: ${error}`,
        details: [],
        errors: [String(error)]
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRestore = async () => {
    if (!selectedBackup) return;

    if (!confirm(`Restaurer la sauvegarde du ${backups.find(b => b.key === selectedBackup)?.date} ?`)) {
      return;
    }

    setIsLoading(true);
    try {
      const restoreResult = await ResetService.restoreFromBackup(selectedBackup);
      setResult(restoreResult);
      await loadStats();

      if (restoreResult.success) {
        setTimeout(() => window.location.reload(), 2000);
      }
    } catch (error) {
      setResult({
        success: false,
        message: `Erreur restauration: ${error}`,
        details: [],
        errors: [String(error)]
      });
    } finally {
      setIsLoading(false);
    }
  };

  const deleteBackup = (backupKey: string) => {
    if (confirm('Supprimer cette sauvegarde ?')) {
      ResetService.deleteBackup(backupKey);
      loadBackups();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Database className="w-6 h-6" />
              Réinitialisation Système
            </h2>
            {onClose && (
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        <div className="p-6 space-y-6">
          
          {/* Statistiques actuelles */}
          {stats && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="flex items-center gap-2 text-blue-700">
                  <ShoppingCart className="w-5 h-5" />
                  <span className="font-semibold">Ventes</span>
                </div>
                <div className="text-2xl font-bold text-blue-900">{stats.sales}</div>
              </div>
              
              <div className="bg-green-50 p-4 rounded-lg">
                <div className="flex items-center gap-2 text-green-700">
                  <Users className="w-5 h-5" />
                  <span className="font-semibold">Vendeurs</span>
                </div>
                <div className="text-2xl font-bold text-green-900">{stats.vendors}</div>
              </div>
              
              <div className="bg-purple-50 p-4 rounded-lg">
                <div className="flex items-center gap-2 text-purple-700">
                  <Package className="w-5 h-5" />
                  <span className="font-semibold">Stock</span>
                </div>
                <div className="text-2xl font-bold text-purple-900">{stats.stock}</div>
              </div>
              
              <div className="bg-orange-50 p-4 rounded-lg">
                <div className="flex items-center gap-2 text-orange-700">
                  <BarChart3 className="w-5 h-5" />
                  <span className="font-semibold">Factures</span>
                </div>
                <div className="text-2xl font-bold text-orange-900">{stats.invoices}</div>
              </div>
            </div>
          )}

          {/* Options de réinitialisation */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            
            {/* Supprimer les chèques à venir */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-center gap-2 text-yellow-800 mb-3">
                <Clock className="w-5 h-5" />
                <h3 className="font-semibold">Chèques à venir</h3>
              </div>
              <p className="text-sm text-yellow-700 mb-4">
                Supprime uniquement l'historique des chèques à venir et factures N8N.
                Garde toutes les autres données.
              </p>
              <button
                onClick={() => handleReset('checks')}
                disabled={isLoading}
                className="w-full bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded-lg font-medium disabled:opacity-50 transition-colors"
              >
                Supprimer les chèques
              </button>
            </div>

            {/* Reset ventes uniquement */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center gap-2 text-blue-800 mb-3">
                <RefreshCw className="w-5 h-5" />
                <h3 className="font-semibold">Reset ventes</h3>
              </div>
              <p className="text-sm text-blue-700 mb-4">
                Supprime les ventes et remet les stats vendeurs à zéro.
                Garde le stock et la configuration.
              </p>
              <button
                onClick={() => handleReset('sales')}
                disabled={isLoading}
                className="w-full bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg font-medium disabled:opacity-50 transition-colors"
              >
                Reset ventes
              </button>
            </div>

            {/* Reset complet */}
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center gap-2 text-red-800 mb-3">
                <Trash2 className="w-5 h-5" />
                <h3 className="font-semibold">Reset complet</h3>
              </div>
              <p className="text-sm text-red-700 mb-4">
                ⚠️ Supprime TOUTES les données : ventes, stock, factures, sessions.
                Remet l'application à zéro.
              </p>
              <button
                onClick={() => handleReset('full')}
                disabled={isLoading}
                className="w-full bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg font-medium disabled:opacity-50 transition-colors"
              >
                Reset complet
              </button>
            </div>
          </div>

          {/* Gestion des sauvegardes */}
          {backups.length > 0 && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <div className="flex items-center gap-2 text-gray-800 mb-3">
                <Download className="w-5 h-5" />
                <h3 className="font-semibold">Sauvegardes disponibles</h3>
              </div>
              
              <div className="space-y-2">
                {backups.map(backup => (
                  <div key={backup.key} className="flex items-center justify-between bg-white p-3 rounded border">
                    <div className="flex items-center gap-3">
                      <input
                        type="radio"
                        name="backup"
                        value={backup.key}
                        checked={selectedBackup === backup.key}
                        onChange={(e) => setSelectedBackup(e.target.value)}
                        className="text-blue-500"
                      />
                      <span className="text-sm font-medium">{backup.date}</span>
                    </div>
                    <button
                      onClick={() => deleteBackup(backup.key)}
                      className="text-red-500 hover:text-red-700 text-sm"
                    >
                      Supprimer
                    </button>
                  </div>
                ))}
              </div>
              
              {selectedBackup && (
                <button
                  onClick={handleRestore}
                  disabled={isLoading}
                  className="mt-3 bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg font-medium disabled:opacity-50 transition-colors flex items-center gap-2"
                >
                  <Upload className="w-4 h-4" />
                  Restaurer la sauvegarde
                </button>
              )}
            </div>
          )}

          {/* Résultat de l'opération */}
          {result && (
            <div className={`border rounded-lg p-4 ${
              result.success 
                ? 'bg-green-50 border-green-200' 
                : 'bg-red-50 border-red-200'
            }`}>
              <div className={`flex items-center gap-2 mb-3 ${
                result.success ? 'text-green-800' : 'text-red-800'
              }`}>
                {result.success ? (
                  <CheckCircle className="w-5 h-5" />
                ) : (
                  <AlertTriangle className="w-5 h-5" />
                )}
                <h3 className="font-semibold">{result.message}</h3>
              </div>
              
              {result.details && result.details.length > 0 && (
                <div className="space-y-1">
                  {result.details.map((detail: string, index: number) => (
                    <div key={index} className="text-sm text-gray-700">
                      {detail}
                    </div>
                  ))}
                </div>
              )}
              
              {result.errors && result.errors.length > 0 && (
                <div className="mt-3 space-y-1">
                  {result.errors.map((error: string, index: number) => (
                    <div key={index} className="text-sm text-red-700 bg-red-100 p-2 rounded">
                      {error}
                    </div>
                  ))}
                </div>
              )}
              
              {result.backupPath && (
                <div className="mt-3 text-sm text-gray-600">
                  💾 Sauvegarde créée : {result.backupPath}
                </div>
              )}
            </div>
          )}

          {/* Loading */}
          {isLoading && (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
              <span className="ml-3 text-gray-600">Traitement en cours...</span>
            </div>
          )}

          {/* Avertissement */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5" />
              <div className="text-amber-800">
                <h4 className="font-semibold mb-1">⚠️ Attention</h4>
                <ul className="text-sm space-y-1">
                  <li>• Les sauvegardes sont automatiquement créées avant chaque reset</li>
                  <li>• Le reset complet rechargera automatiquement la page</li>
                  <li>• Ces actions sont irréversibles sans sauvegarde</li>
                  <li>• Fermez l'application sur les autres appareils avant le reset</li>
                </ul>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default ResetSystemPro;
