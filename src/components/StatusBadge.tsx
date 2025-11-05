import React from 'react';
import type { Invoice } from '@/services/syncService';

interface StatusBadgeProps {
  status: Invoice['status'];
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, className = '' }) => {
  const getStatusConfig = (status: Invoice['status']) => {
    const statusConfig = {
      draft: { 
        color: 'status-draft', 
        label: '📝 Brouillon',
        gradient: 'linear-gradient(135deg, #6b7280, #9ca3af)'
      },
      sent: { 
        color: 'status-sent', 
        label: '📤 Envoyée',
        gradient: 'linear-gradient(135deg, #3b82f6, #60a5fa)'
      },
      partial: { 
        color: 'status-partial', 
        label: '🔄 Partielle',
        gradient: 'linear-gradient(135deg, #f59e0b, #fbbf24)'
      },
      paid: { 
        color: 'status-paid', 
        label: '✅ Payée',
        gradient: 'linear-gradient(135deg, #10b981, #34d399)'
      },
      cancelled: { 
        color: 'status-cancelled', 
        label: '❌ Annulée',
        gradient: 'linear-gradient(135deg, #ef4444, #f87171)'
      }
    };
    
    return statusConfig[status] || statusConfig.draft;
  };

  const config = getStatusConfig(status);
  
  return (
    <span 
      className={`status-badge status-badge-animated ${config.color} ${className}`}
      style={{
        background: config.gradient,
        boxShadow: `0 4px 12px ${config.gradient.includes('#10b981') ? 'rgba(16, 185, 129, 0.3)' :
                                config.gradient.includes('#3b82f6') ? 'rgba(59, 130, 246, 0.3)' :
                                config.gradient.includes('#f59e0b') ? 'rgba(245, 158, 11, 0.3)' :
                                config.gradient.includes('#ef4444') ? 'rgba(239, 68, 68, 0.3)' :
                                'rgba(107, 114, 128, 0.3)'}`
      }}
    >
      {config.label}
    </span>
  );
};
