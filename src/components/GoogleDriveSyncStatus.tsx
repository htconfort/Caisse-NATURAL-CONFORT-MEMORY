import React, { useState, useEffect } from 'react';
import { Cloud, CloudOff, Upload, RotateCw } from 'lucide-react';
import { googleDriveSyncService } from '../services/googleDriveSyncService';

interface GoogleDriveSyncStatusProps {
  className?: string;
}

export const GoogleDriveSyncStatus: React.FC<GoogleDriveSyncStatusProps> = ({ className = '' }) => {
  const [status, setStatus] = useState({ isOnline: navigator.onLine, queueSize: 0 });
  const [isRetrying, setIsRetrying] = useState(false);

  useEffect(() => {
    // Mise à jour du statut toutes les 30 secondes
    const interval = setInterval(() => {
      setStatus(googleDriveSyncService.getStatus());
    }, 30000);

    // Mise à jour immédiate
    setStatus(googleDriveSyncService.getStatus());

    return () => clearInterval(interval);
  }, []);

  // Écouter les changements de connexion
  useEffect(() => {
    const handleOnline = () => setStatus(googleDriveSyncService.getStatus());
    const handleOffline = () => setStatus(googleDriveSyncService.getStatus());

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleForceRetry = async () => {
    setIsRetrying(true);
    try {
      await googleDriveSyncService.forceRetryQueue();
      setStatus(googleDriveSyncService.getStatus());
    } finally {
      setIsRetrying(false);
    }
  };

  const getStatusIcon = () => {
    if (status.isOnline && status.queueSize === 0) {
      return <Cloud className="w-4 h-4 text-green-500" />;
    } else if (status.isOnline && status.queueSize > 0) {
      return <Upload className="w-4 h-4 text-orange-500" />;
    } else {
      return <CloudOff className="w-4 h-4 text-red-500" />;
    }
  };

  const getStatusText = () => {
    if (status.isOnline && status.queueSize === 0) {
      return 'Synchronisé';
    } else if (status.isOnline && status.queueSize > 0) {
      return `${status.queueSize} en attente`;
    } else {
      return status.queueSize > 0 ? `Hors-ligne (${status.queueSize})` : 'Hors-ligne';
    }
  };

  const getStatusColor = () => {
    if (status.isOnline && status.queueSize === 0) {
      return 'bg-green-50 border-green-200 text-green-700';
    } else if (status.isOnline && status.queueSize > 0) {
      return 'bg-orange-50 border-orange-200 text-orange-700';
    } else {
      return 'bg-red-50 border-red-200 text-red-700';
    }
  };

  return (
    <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${getStatusColor()} ${className}`}>
      {getStatusIcon()}
      <span className="text-sm font-medium">
        Google Drive: {getStatusText()}
      </span>
      
      {status.queueSize > 0 && status.isOnline && (
        <button
          onClick={handleForceRetry}
          disabled={isRetrying}
          className="ml-2 p-1 rounded hover:bg-white/50 transition-colors"
          title="Forcer la synchronisation"
        >
          <RotateCw className={`w-3 h-3 ${isRetrying ? 'animate-spin' : ''}`} />
        </button>
      )}
    </div>
  );
};

export default GoogleDriveSyncStatus;
