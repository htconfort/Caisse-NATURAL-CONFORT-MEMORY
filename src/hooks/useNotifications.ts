import { useState, useCallback } from 'react';

export interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  duration?: number;
  timestamp: Date;
  action?: {
    label: string;
    callback: () => void;
  };
}

/**
 * Hook pour gérer les notifications utilisateur
 */
export const useNotifications = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  // Ajouter une notification
  const addNotification = useCallback((notification: Omit<Notification, 'id' | 'timestamp'>) => {
    const newNotification: Notification = {
      ...notification,
      id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      duration: notification.duration || 5000
    };

    setNotifications((prev: Notification[]) => [...prev, newNotification]);

    // Auto-suppression après la durée spécifiée
    if (newNotification.duration && newNotification.duration > 0) {
      setTimeout(() => {
        removeNotification(newNotification.id);
      }, newNotification.duration);
    }

    return newNotification.id;
  }, []);

  // Supprimer une notification
  const removeNotification = useCallback((id: string) => {
    setNotifications((prev: Notification[]) => prev.filter((notif: Notification) => notif.id !== id));
  }, []);

  // Vider toutes les notifications
  const clearNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  // Notifications rapides pour les cas courants
  const notifySuccess = useCallback((title: string, message: string, duration?: number) => {
    return addNotification({ type: 'success', title, message, duration });
  }, [addNotification]);

  const notifyError = useCallback((title: string, message: string, duration?: number) => {
    return addNotification({ type: 'error', title, message, duration: duration || 0 }); // Les erreurs restent affichées
  }, [addNotification]);

  const notifyWarning = useCallback((title: string, message: string, duration?: number) => {
    return addNotification({ type: 'warning', title, message, duration });
  }, [addNotification]);

  const notifyInfo = useCallback((title: string, message: string, duration?: number) => {
    return addNotification({ type: 'info', title, message, duration });
  }, [addNotification]);

  // Notifications spécifiques pour l'application
  const notifyItemStatusChanged = useCallback((productName: string, newStatus: string) => {
    const statusLabels = {
      pending: 'En attente',
      available: 'Disponible',
      delivered: 'Livré',
      cancelled: 'Annulé'
    };
    
    const statusLabel = statusLabels[newStatus as keyof typeof statusLabels] || newStatus;
    
    return notifySuccess(
      'Statut mis à jour',
      `${productName} → ${statusLabel}`,
      3000
    );
  }, [notifySuccess]);

  const notifySyncError = useCallback((error: string) => {
    return notifyError(
      'Erreur de synchronisation',
      `Impossible de synchroniser avec le serveur : ${error}`,
      0
    );
  }, [notifyError]);

  const notifySyncSuccess = useCallback((count: number) => {
    return notifySuccess(
      'Synchronisation réussie',
      `${count} facture(s) synchronisée(s)`,
      2000
    );
  }, [notifySuccess]);

  const notifyOfflineMode = useCallback(() => {
    return notifyWarning(
      'Mode hors ligne',
      'Les modifications seront synchronisées lors de la reconnexion',
      5000
    );
  }, [notifyWarning]);

  return {
    notifications,
    addNotification,
    removeNotification,
    clearNotifications,
    notifySuccess,
    notifyError,
    notifyWarning,
    notifyInfo,
    // Notifications spécifiques
    notifyItemStatusChanged,
    notifySyncError,
    notifySyncSuccess,
    notifyOfflineMode
  };
};
