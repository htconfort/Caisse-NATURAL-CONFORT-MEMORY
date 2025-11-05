import React from 'react';
import type { Notification } from '../hooks/useNotifications';

interface NotificationCenterProps {
  notifications: Notification[];
  onRemove: (id: string) => void;
}

export const NotificationCenter: React.FC<NotificationCenterProps> = ({ notifications, onRemove }) => {
  if (notifications.length === 0) return null;

  const getNotificationIcon = (type: Notification['type']) => {
    const icons = {
      success: '✅',
      error: '❌',
      warning: '⚠️',
      info: 'ℹ️'
    };
    return icons[type];
  };

  const getNotificationColor = (type: Notification['type']) => {
    const colors = {
      success: 'bg-green-100 border-green-500 text-green-800',
      error: 'bg-red-100 border-red-500 text-red-800',
      warning: 'bg-yellow-100 border-yellow-500 text-yellow-800',
      info: 'bg-blue-100 border-blue-500 text-blue-800'
    };
    return colors[type];
  };

  return (
    <div className="fixed top-4 right-4 z-50 space-y-3 max-w-sm">
      {notifications.map((notification) => (
        <div
          key={notification.id}
          className={`p-4 rounded-lg border-l-4 shadow-lg animate-slideInRight ${getNotificationColor(notification.type)}`}
        >
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3">
              <span className="text-lg flex-shrink-0">
                {getNotificationIcon(notification.type)}
              </span>
              <div className="flex-1 min-w-0">
                <h4 className="font-medium text-sm">{notification.title}</h4>
                <p className="text-sm opacity-90 mt-1">{notification.message}</p>
                {notification.action && (
                  <button
                    onClick={notification.action.callback}
                    className="text-sm underline mt-2 hover:opacity-75"
                  >
                    {notification.action.label}
                  </button>
                )}
              </div>
            </div>
            <button
              onClick={() => onRemove(notification.id)}
              className="ml-3 text-lg hover:opacity-75 flex-shrink-0"
              title="Fermer"
            >
              ×
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};
