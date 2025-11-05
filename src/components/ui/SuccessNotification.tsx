import React from 'react';
import { Check } from 'lucide-react';

interface SuccessNotificationProps {
  show: boolean;
}

export const SuccessNotification: React.FC<SuccessNotificationProps> = ({ show }) => {
  if (!show) return null;

  return (
    <div className="fixed bottom-4 right-4 p-4 rounded-lg shadow-lg animate-fadeIn safe-bottom max-w-sm"
      style={{ backgroundColor: '#D1FAE5', border: '1px solid #A7F3D0' }}>
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <Check size={20} style={{ color: '#065F46' }} />
          <span style={{ color: '#065F46' }} className="font-semibold">
            Vente enregistrée avec succès !
          </span>
        </div>
        <div className="text-sm" style={{ color: '#047857' }}>
          ⚠️ Vendeuse décochée automatiquement
        </div>
        <div className="text-xs" style={{ color: '#047857' }}>
          Sélectionnez une nouvelle vendeuse pour l'encaissement suivant
        </div>
      </div>
    </div>
  );
};
