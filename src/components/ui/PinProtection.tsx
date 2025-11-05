import React, { useState } from 'react';
import { Lock, Eye, EyeOff, Shield } from 'lucide-react';

interface PinProtectionProps {
  onUnlock: () => void;
  title?: string;
  description?: string;
}

const STOCK_PIN = '1234'; // Code PIN par défaut - à changer en production

export const PinProtection: React.FC<PinProtectionProps> = ({
  onUnlock,
  title = "Accès protégé",
  description = "Veuillez saisir le code PIN pour accéder à cette section"
}) => {
  const [pin, setPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [error, setError] = useState('');
  const [attempts, setAttempts] = useState(0);

  const handlePinChange = (value: string) => {
    // Limiter à 4 chiffres
    if (value.length <= 4 && /^\d*$/.test(value)) {
      setPin(value);
      setError('');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (pin === STOCK_PIN) {
      setError('');
      onUnlock();
    } else {
      setAttempts(prev => prev + 1);
      setError(`Code PIN incorrect. Tentative ${attempts + 1}/3`);
      setPin('');
      
      if (attempts >= 2) {
        setError('Trop de tentatives échouées. Contactez l\'administrateur.');
        // En production, on pourrait bloquer temporairement
      }
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && pin.length === 4) {
      handleSubmit(e);
    }
  };

  return (
    <div className="max-w-md mx-auto mt-20">
      <div className="card">
        {/* En-tête */}
        <div className="text-center mb-6">
          <div className="flex justify-center mb-4">
            <div 
              className="p-4 rounded-full"
              style={{ backgroundColor: 'rgba(124, 58, 237, 0.1)' }}
            >
              <Shield size={32} style={{ color: '#7C3AED' }} />
            </div>
          </div>
          <h2 className="text-2xl font-bold mb-2" style={{ color: '#000000' }}>
            {title}
          </h2>
          <p className="text-sm" style={{ color: '#6B7280' }}>
            {description}
          </p>
        </div>

        {/* Formulaire PIN */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label 
              htmlFor="pin" 
              className="block text-sm font-semibold mb-2"
              style={{ color: '#000000' }}
            >
              Code PIN (4 chiffres)
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center">
                <Lock size={20} style={{ color: '#6B7280' }} />
              </div>
              <input
                id="pin"
                type={showPin ? 'text' : 'password'}
                value={pin}
                onChange={(e) => handlePinChange(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="****"
                className="w-full pl-10 pr-12 py-3 border rounded-lg text-center text-2xl font-bold tracking-widest"
                style={{ 
                  borderColor: error ? '#DC2626' : '#D1D5DB',
                  backgroundColor: error ? '#FEF2F2' : '#FFFFFF'
                }}
                autoComplete="off"
                autoFocus
              />
              <button
                type="button"
                onClick={() => setShowPin(!showPin)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
              >
                {showPin ? 
                  <EyeOff size={20} style={{ color: '#6B7280' }} /> : 
                  <Eye size={20} style={{ color: '#6B7280' }} />
                }
              </button>
            </div>
          </div>

          {/* Message d'erreur */}
          {error && (
            <div 
              className="p-3 rounded-lg text-sm font-semibold"
              style={{ 
                backgroundColor: '#FEF2F2', 
                color: '#DC2626',
                border: '1px solid #FECACA'
              }}
            >
              {error}
            </div>
          )}

          {/* Bouton de validation */}
          <button
            type="submit"
            disabled={pin.length !== 4 || attempts >= 3}
            className="w-full py-3 px-4 rounded-lg font-semibold text-white transition-all hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              backgroundColor: pin.length === 4 && attempts < 3 ? '#7C3AED' : '#9CA3AF'
            }}
          >
            {pin.length !== 4 ? 'Saisissez 4 chiffres' : 'Déverrouiller'}
          </button>
        </form>

        {/* Pavé numérique virtuel (optionnel pour tablette) */}
        <div className="mt-6 pt-6 border-t" style={{ borderColor: '#E5E7EB' }}>
          <p className="text-xs text-center mb-4" style={{ color: '#6B7280' }}>
            Pavé numérique virtuel
          </p>
          <div className="grid grid-cols-3 gap-2">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
              <button
                key={num}
                type="button"
                onClick={() => handlePinChange(pin + num.toString())}
                disabled={pin.length >= 4}
                className="p-3 rounded-lg border font-bold text-lg hover:shadow-md transition-all disabled:opacity-50"
                style={{ 
                  borderColor: '#D1D5DB',
                  backgroundColor: '#F9FAFB',
                  color: '#000000'
                }}
              >
                {num}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setPin('')}
              className="p-3 rounded-lg border font-bold text-sm hover:shadow-md transition-all"
              style={{ 
                borderColor: '#DC2626',
                backgroundColor: '#FEF2F2',
                color: '#DC2626'
              }}
            >
              Effacer
            </button>
            <button
              type="button"
              onClick={() => handlePinChange(pin + '0')}
              disabled={pin.length >= 4}
              className="p-3 rounded-lg border font-bold text-lg hover:shadow-md transition-all disabled:opacity-50"
              style={{ 
                borderColor: '#D1D5DB',
                backgroundColor: '#F9FAFB',
                color: '#000000'
              }}
            >
              0
            </button>
            <button
              type="button"
              onClick={() => setPin(pin.slice(0, -1))}
              className="p-3 rounded-lg border font-bold text-sm hover:shadow-md transition-all"
              style={{ 
                borderColor: '#F59E0B',
                backgroundColor: '#FFFBEB',
                color: '#F59E0B'
              }}
            >
              ⌫
            </button>
          </div>
        </div>

        {/* Info développeur */}
        <div className="mt-6 pt-4 border-t text-center" style={{ borderColor: '#E5E7EB' }}>
          <p className="text-xs" style={{ color: '#9CA3AF' }}>
            💡 Code par défaut : 1234 (à modifier en production)
          </p>
        </div>
      </div>
    </div>
  );
};
