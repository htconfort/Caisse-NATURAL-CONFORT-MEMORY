import React from 'react';
import { Wifi, WifiOff, RefreshCw, CheckCircle } from 'lucide-react';
import { useRealtimeSync } from '../hooks/useRealtimeSync';

/**
 * Indicateur de statut de synchronisation
 * À afficher dans l'en-tête de l'application de caisse
 */
export function SyncIndicator() {
  const { syncStatus } = useRealtimeSync();

  const getStatusColor = () => {
    if (!syncStatus.isOnline) return '#f44336'; // Rouge
    if (syncStatus.pendingSyncs > 0) return '#ff9800'; // Orange
    return '#4caf50'; // Vert
  };

  const getStatusIcon = () => {
    if (!syncStatus.isOnline) return <WifiOff size={20} />;
    if (syncStatus.pendingSyncs > 0) return <RefreshCw size={20} className="spinning" />;
    return <Wifi size={20} />;
  };

  const getStatusText = () => {
    if (!syncStatus.isOnline) return 'Hors ligne';
    if (syncStatus.pendingSyncs > 0) return `${syncStatus.pendingSyncs} sync en attente`;
    if (syncStatus.lastSync) {
      const timeSinceSync = Date.now() - syncStatus.lastSync.getTime();
      if (timeSinceSync < 5000) return 'Synchronisé';
      if (timeSinceSync < 60000) return `Sync il y a ${Math.floor(timeSinceSync / 1000)}s`;
      return `Sync il y a ${Math.floor(timeSinceSync / 60000)}min`;
    }
    return 'En attente';
  };

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      padding: '8px 16px',
      backgroundColor: `${getStatusColor()}20`,
      border: `2px solid ${getStatusColor()}`,
      borderRadius: '8px',
      fontSize: '14px',
      fontWeight: '500'
    }}>
      <div style={{ color: getStatusColor(), display: 'flex', alignItems: 'center' }}>
        {getStatusIcon()}
      </div>
      <div style={{ color: getStatusColor() }}>
        {getStatusText()}
      </div>
      {syncStatus.lastSync && syncStatus.pendingSyncs === 0 && (
        <CheckCircle size={16} color={getStatusColor()} />
      )}
      {syncStatus.error && (
        <div style={{
          fontSize: '12px',
          color: '#666',
          marginLeft: '8px'
        }}>
          ({syncStatus.error})
        </div>
      )}
    </div>
  );
}

// Style pour l'animation de rotation
const style = document.createElement('style');
style.textContent = `
  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
  .spinning {
    animation: spin 1s linear infinite;
  }
`;
document.head.appendChild(style);

