import React from 'react';
import { AlertCircle, Check } from 'lucide-react';
import type { Vendor, SessionDB } from '../../types';

interface VendorSelectionProps {
  vendorStats: Vendor[];
  selectedVendor: Vendor | null;
  setSelectedVendor: (vendor: Vendor) => void;
  setActiveTab: (tab: 'produits') => void;
  currentSession?: SessionDB | null;
}

export const VendorSelection: React.FC<VendorSelectionProps> = ({
  vendorStats,
  selectedVendor,
  setSelectedVendor,
  setActiveTab,
  currentSession
}) => {
  // Formater les informations de session pour affichage
  const eventInfo = React.useMemo(() => {
    if (!currentSession?.eventName) {
      console.log('⚠️ VendorSelection: Pas de session ou pas de nom d\'événement');
      return null;
    }
    
    if (!currentSession.eventStart || !currentSession.eventEnd) {
      console.warn('⚠️ VendorSelection: Session sans dates', {
        eventName: currentSession.eventName,
        eventStart: currentSession.eventStart,
        eventEnd: currentSession.eventEnd
      });
      return currentSession.eventName;
    }
    
    try {
      const startDate = new Date(currentSession.eventStart);
      const endDate = new Date(currentSession.eventEnd);
      
      // Vérifier que les dates sont valides
      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        console.error('❌ VendorSelection: Dates invalides', {
          eventStart: currentSession.eventStart,
          eventEnd: currentSession.eventEnd
        });
        return currentSession.eventName;
      }
      
      const formattedStart = startDate.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
      const formattedEnd = endDate.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
      
      const result = `${currentSession.eventName} (${formattedStart} - ${formattedEnd})`;
      console.log('✅ VendorSelection: EventInfo formaté:', result);
      
      return result;
    } catch (error) {
      console.error('❌ VendorSelection: Erreur formatage dates', error);
      return currentSession.eventName;
    }
  }, [currentSession]);
  return (
    <div className="max-w-5xl mx-auto animate-fadeIn">
      <h2 className="text-3xl font-bold mb-6" style={{ color: 'var(--dark-green)' }}>
        {!selectedVendor ? 'Sélection de la vendeuse (OBLIGATOIRE)' : 'Sélection de la vendeuse'}
      </h2>
      {!selectedVendor && (
        <div className="mb-6 p-4 rounded-lg" style={{ backgroundColor: '#FEF3CD', border: '1px solid #F59E0B' }}>
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle size={20} style={{ color: '#D97706' }} />
            <h3 className="font-bold" style={{ color: '#D97706' }}>
              Sélection obligatoire
            </h3>
          </div>
          <p style={{ color: '#92400E' }}>
            Vous devez sélectionner une vendeuse avant de pouvoir utiliser les fonctionnalités de la caisse.
          </p>
        </div>
      )}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {vendorStats.map(vendor => (
          <div
            key={vendor.id}
            onClick={() => {
              setSelectedVendor(vendor);
              setActiveTab('produits');
            }}
            className={`card cursor-pointer touch-feedback ${
              selectedVendor?.id === vendor.id ? 'ring-4 ring-white' : ''
            }`}
            style={{
              backgroundColor: vendor.color,
              color: 'white',
              padding: '16px',
              border: selectedVendor?.id === vendor.id ? '3px solid white' : '1px solid rgba(255,255,255,0.3)'
            }}
          >
            <div className="flex justify-between items-start mb-3">
              <h3 className={`text-lg font-bold ${['Johan', 'Sabrina', 'Billy'].includes(vendor.name) ? 'vendor-black-text' : 'vendor-white-text'}`}>
                {vendor.name}
              </h3>
              {selectedVendor?.id === vendor.id && (
                <Check size={20} color={['Johan', 'Sabrina', 'Billy'].includes(vendor.name) ? 'black' : 'white'} />
              )}
            </div>
            <div className="space-y-1">
              {/* Affichage de l'événement si session active */}
              {eventInfo && (
                <p className={`text-xs italic opacity-80 mb-2 ${['Johan', 'Sabrina', 'Billy'].includes(vendor.name) ? 'vendor-black-text' : 'vendor-white-text'}`}>
                  📅 {eventInfo}
                </p>
              )}
              <p className={`text-xs opacity-90 ${['Johan', 'Sabrina', 'Billy'].includes(vendor.name) ? 'vendor-black-text' : 'vendor-white-text'}`}>
                CA Instant: <span className={`font-bold ${['Johan', 'Sabrina', 'Billy'].includes(vendor.name) ? 'vendor-black-text' : 'vendor-white-text'}`}>
                  {(vendor.dailySales || 0).toFixed(2)}€
                </span>
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
