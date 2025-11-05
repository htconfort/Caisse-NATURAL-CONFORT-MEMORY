import React from 'react';
import type { SyncStats } from '@/services/syncService';

interface SyncStatusProps {
  stats: SyncStats;
  onSync: () => void;
  loading: boolean;
}

export const SyncStatus: React.FC<SyncStatusProps> = ({ stats, onSync, loading }) => {
  const formatLastSync = () => {
    if (!stats.lastSyncTime) return 'Jamais synchronisé';
    
    const now = new Date();
    const lastSync = new Date(stats.lastSyncTime);
    const diffMinutes = Math.floor((now.getTime() - lastSync.getTime()) / (1000 * 60));
    
    if (diffMinutes < 1) return 'À l\'instant';
    if (diffMinutes < 60) return `Il y a ${diffMinutes} min`;
    
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `Il y a ${diffHours}h`;
    
    return lastSync.toLocaleDateString('fr-FR');
  };

  const getSyncStatusIcon = () => {
    switch (stats.syncStatus) {
      case 'syncing':
        return '🔄';
      case 'error':
        return '❌';
      default:
        return '✅';
    }
  };

  const getSyncStatusColor = () => {
    switch (stats.syncStatus) {
      case 'syncing':
        return 'text-blue-600 bg-blue-100';
      case 'error':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-green-600 bg-green-100';
    }
  };

  return (
    <div className="flex items-center gap-4">
      {/* Statut de synchronisation */}
      <div className={`px-3 py-1 rounded-full text-sm font-medium ${getSyncStatusColor()}`}>
        <span className={stats.syncStatus === 'syncing' ? 'animate-spin inline-block' : ''}>
          {getSyncStatusIcon()}
        </span>
        <span className="ml-2">
          {stats.syncStatus === 'syncing' && 'Synchronisation...'}
          {stats.syncStatus === 'error' && 'Erreur'}
          {stats.syncStatus === 'idle' && 'Synchronisé'}
        </span>
      </div>

      {/* Dernière synchronisation */}
      <div className="text-sm text-gray-600">
        {formatLastSync()}
      </div>

      {/* Bouton de synchronisation manuelle */}
      <button
        onClick={onSync}
        disabled={loading || stats.syncStatus === 'syncing'}
        className={`px-4 py-2 rounded-lg font-medium transition-all ${
          loading || stats.syncStatus === 'syncing'
            ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
            : 'bg-blue-600 text-white hover:bg-blue-700 shadow-md hover:shadow-lg'
        }`}
        title="Synchroniser maintenant"
      >
        {loading || stats.syncStatus === 'syncing' ? (
          <>
            <span className="animate-spin inline-block mr-2">🔄</span>
            Sync...
          </>
        ) : (
          <>
            🔄 Synchroniser
          </>
        )}
      </button>

      {/* Affichage des erreurs */}
      {stats.syncStatus === 'error' && stats.errorMessage && (
        <div className="text-xs text-red-600 max-w-xs truncate" title={stats.errorMessage}>
          {stats.errorMessage}
        </div>
      )}
    </div>
  );
};
