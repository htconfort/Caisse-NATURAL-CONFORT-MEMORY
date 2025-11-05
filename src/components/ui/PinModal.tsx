import React, { useState } from 'react';
import { Lock, X, Eye, EyeOff } from 'lucide-react';

interface PinModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  title?: string;
}

export const PinModal: React.FC<PinModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  title = "Accès Sécurisé"
}) => {
  const currentPin = '1957'; // Code PIN d'origine
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [showPin, setShowPin] = useState(false);

  if (!isOpen) return null;

  const handlePinChange = (value: string) => {
    if (value.length <= 4 && /^\d*$/.test(value)) {
      setPin(value);
      setError('');
    }
  };

  const handleNumberClick = (num: string) => {
    if (pin.length < 4) {
      handlePinChange(pin + num);
    }
  };

  const handleClear = () => {
    setPin('');
    setError('');
  };

  const handleBackspace = () => {
    setPin(pin.slice(0, -1));
    setError('');
  };

  const handleSubmit = () => {
    if (pin === currentPin) {
      setError('');
      setPin('');
      onSuccess();
      onClose();
    } else {
      setError('Code PIN incorrect');
      setPin('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && pin.length === 4) {
      handleSubmit();
    }
    if (e.key === 'Escape') {
      onClose();
    }
  };

  return (
    <>
      <div 
        className="fixed inset-0 flex items-center justify-center p-4"
        style={{ 
          backgroundColor: 'rgba(71, 122, 12, 0.9)', 
          zIndex: 9999,
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0
        }}
        onClick={onClose}
      >
        <div 
          className="rounded-3xl shadow-2xl p-8"
          style={{ 
            backgroundColor: '#F2EFE2',
            width: '380px',
            maxWidth: '90vw'
          }}
          onClick={(e) => e.stopPropagation()}
          onKeyDown={handleKeyPress}
          tabIndex={0}
        >
          
          {/* En-tête avec animation */}
          <div className="text-center mb-8">
            <div className="inline-flex p-4 rounded-full mb-4" style={{ backgroundColor: '#89BBFE' }}>
              <Lock size={28} style={{ color: '#14281D' }} />
            </div>
            <h1 className="text-2xl font-bold mb-2" style={{ color: '#14281D' }}>
              🔐 {title}
            </h1>
            <p className="text-base font-medium" style={{ color: '#080F0F' }}>
              📦 Édition du Stock
            </p>
          </div>

          {/* Bouton de fermeture */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full hover:bg-gray-100 transition-colors"
            style={{ color: '#14281D' }}
          >
            <X size={24} />
          </button>

          {/* Affichage du PIN avec possibilité de masquer/afficher */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <label className="text-sm font-bold" style={{ color: '#14281D' }}>
                Code PIN (4 chiffres)
              </label>
              <button
                onClick={() => setShowPin(!showPin)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm hover:scale-105 transition-all font-medium"
                style={{ backgroundColor: '#89BBFE', color: '#14281D' }}
              >
                {showPin ? <EyeOff size={16} /> : <Eye size={16} />}
                {showPin ? 'Masquer' : 'Voir'}
              </button>
            </div>
            
            {/* Affichage visuel du PIN */}
            <div className="flex justify-center gap-3 mb-6">
              {[0, 1, 2, 3].map((index) => (
                <div
                  key={index}
                  className="w-16 h-16 border-3 rounded-xl flex items-center justify-center text-xl font-bold transition-all transform"
                  style={{
                    borderWidth: '3px',
                    borderColor: error 
                      ? '#F55D3E' 
                      : pin.length > index 
                      ? '#477A0C' 
                      : '#14281D',
                    backgroundColor: error 
                      ? '#F2EFE2' 
                      : pin.length > index 
                      ? '#89BBFE' 
                      : '#F2EFE2',
                    color: error 
                      ? '#F55D3E' 
                      : pin.length > index 
                      ? '#14281D' 
                      : '#080F0F',
                    transform: pin.length > index ? 'scale(1.05)' : 'scale(1)',
                    animation: error ? 'shake 0.5s ease-in-out' : 'none'
                  }}
                >
                  {pin.length > index ? (showPin ? pin[index] : '●') : ''}
                </div>
              ))}
            </div>
          </div>

          {/* Message d'erreur avec animation */}
          {error && (
            <div 
              className="p-4 rounded-xl mb-6 text-center font-bold animate-pulse" 
              style={{ 
                backgroundColor: '#F55D3E', 
                color: '#F2EFE2', 
                border: '2px solid #14281D' 
              }}
            >
              ❌ {error}
            </div>
          )}

          {/* Pavé numérique avec boutons plus gros */}
          <div className="grid grid-cols-3 gap-3 mb-6">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
              <button
                key={num}
                onClick={() => handleNumberClick(num.toString())}
                disabled={pin.length >= 4}
                className="h-14 rounded-xl font-bold text-xl transition-all hover:scale-110 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
                style={{
                  borderWidth: '3px',
                  backgroundColor: pin.length >= 4 ? '#14281D' : '#F2EFE2',
                  borderColor: '#477A0C',
                  color: pin.length >= 4 ? '#F2EFE2' : '#14281D'
                }}
                onMouseEnter={(e) => {
                  if (pin.length < 4) {
                    (e.target as HTMLButtonElement).style.backgroundColor = '#89BBFE';
                    (e.target as HTMLButtonElement).style.borderColor = '#14281D';
                  }
                }}
                onMouseLeave={(e) => {
                  if (pin.length < 4) {
                    (e.target as HTMLButtonElement).style.backgroundColor = '#F2EFE2';
                    (e.target as HTMLButtonElement).style.borderColor = '#477A0C';
                  }
                }}
              >
                {num}
              </button>
            ))}
            
            {/* Ligne du bas avec 0 et boutons d'action */}
            <button
              onClick={handleClear}
              className="h-14 rounded-xl font-bold text-sm transition-all hover:scale-110 active:scale-95"
              style={{ 
                borderWidth: '3px',
                backgroundColor: '#F55D3E', 
                borderColor: '#14281D', 
                color: '#F2EFE2' 
              }}
            >
              🗑️<br/>VIDER
            </button>
            
            <button
              onClick={() => handleNumberClick('0')}
              disabled={pin.length >= 4}
              className="h-14 rounded-xl font-bold text-xl transition-all hover:scale-110 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
              style={{
                borderWidth: '3px',
                backgroundColor: pin.length >= 4 ? '#14281D' : '#F2EFE2',
                borderColor: '#477A0C',
                color: pin.length >= 4 ? '#F2EFE2' : '#14281D'
              }}
              onMouseEnter={(e) => {
                if (pin.length < 4) {
                  (e.target as HTMLButtonElement).style.backgroundColor = '#89BBFE';
                  (e.target as HTMLButtonElement).style.borderColor = '#14281D';
                }
              }}
              onMouseLeave={(e) => {
                if (pin.length < 4) {
                  (e.target as HTMLButtonElement).style.backgroundColor = '#F2EFE2';
                  (e.target as HTMLButtonElement).style.borderColor = '#477A0C';
                }
              }}
            >
              0
            </button>
            
            <button
              onClick={handleBackspace}
              className="h-14 rounded-xl font-bold text-sm transition-all hover:scale-110 active:scale-95"
              style={{ 
                borderWidth: '3px',
                backgroundColor: '#D68FD6', 
                borderColor: '#14281D', 
                color: '#14281D' 
              }}
            >
              ⌫<br/>RETOUR
            </button>
          </div>

          {/* Bouton de validation principal */}
          <button
            onClick={handleSubmit}
            disabled={pin.length !== 4}
            className="w-full py-4 px-6 rounded-xl font-bold text-xl transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none shadow-xl"
            style={{
              borderWidth: '3px',
              backgroundColor: pin.length === 4 ? '#477A0C' : '#14281D',
              color: '#F2EFE2',
              borderColor: pin.length === 4 ? '#89BBFE' : '#080F0F'
            }}
          >
            {pin.length === 4 ? '🚀 ACCÉDER AU STOCK' : '⏳ Saisissez le code PIN'}
          </button>
        </div>
      </div>

      {/* Styles CSS pour l'animation shake */}
      <style dangerouslySetInnerHTML={{
        __html: `
          @keyframes shake {
            0%, 100% { transform: translateX(0); }
            25% { transform: translateX(-5px); }
            75% { transform: translateX(5px); }
          }
          .animate-shake {
            animation: shake 0.5s ease-in-out;
          }
        `
      }} />
    </>
  );
};
