import React, { useState } from 'react';
import { Lock, Shield } from 'lucide-react';

interface RAZPasswordProtectionProps {
  onUnlock: () => void;
}

// Mot de passe par défaut (peut être changé dans les paramètres)
const DEFAULT_PASSWORD = '2025';

export const RAZPasswordProtection: React.FC<RAZPasswordProtectionProps> = ({ onUnlock }) => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [attempts, setAttempts] = useState(0);

  // Récupérer le mot de passe configuré (ou utiliser le défaut)
  const getConfiguredPassword = (): string => {
    try {
      const stored = localStorage.getItem('raz_history_password');
      return stored || DEFAULT_PASSWORD;
    } catch {
      return DEFAULT_PASSWORD;
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const configuredPassword = getConfiguredPassword();
    
    if (password === configuredPassword) {
      // Mot de passe correct
      setError('');
      // Mémoriser l'accès pour la session (pas permanent)
      sessionStorage.setItem('raz_history_unlocked', 'true');
      onUnlock();
    } else {
      // Mot de passe incorrect
      setAttempts(prev => prev + 1);
      setError('❌ Mot de passe incorrect');
      setPassword('');
      
      // Bloquer après 5 tentatives
      if (attempts >= 4) {
        setError('🚫 Trop de tentatives. Attendez 1 minute.');
        setTimeout(() => {
          setAttempts(0);
          setError('');
        }, 60000);
      }
    }
  };

  const isBlocked = attempts >= 5;

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '60vh',
      padding: '40px'
    }}>
      <div style={{
        background: 'white',
        borderRadius: '16px',
        padding: '40px',
        maxWidth: '450px',
        width: '100%',
        boxShadow: '0 10px 40px rgba(0,0,0,0.15)',
        border: '2px solid #e5e7eb'
      }}>
        {/* Icône */}
        <div style={{
          textAlign: 'center',
          marginBottom: '30px'
        }}>
          <div style={{
            width: '80px',
            height: '80px',
            margin: '0 auto 20px',
            background: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Shield size={40} color="white" />
          </div>
          <h2 style={{
            margin: 0,
            fontSize: '24px',
            color: '#1e40af',
            fontWeight: 'bold'
          }}>
            🔒 Accès Protégé
          </h2>
          <p style={{
            margin: '10px 0 0 0',
            color: '#666',
            fontSize: '15px'
          }}>
            Historique des RAZ - Données sensibles
          </p>
        </div>

        {/* Formulaire */}
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '25px' }}>
            <label style={{
              display: 'block',
              marginBottom: '8px',
              color: '#333',
              fontWeight: '600',
              fontSize: '14px'
            }}>
              Mot de passe
            </label>
            <div style={{ position: 'relative' }}>
              <Lock
                size={20}
                style={{
                  position: 'absolute',
                  left: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: '#9ca3af'
                }}
              />
              <input
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError('');
                }}
                placeholder="Entrez le mot de passe"
                disabled={isBlocked}
                autoFocus
                style={{
                  width: '100%',
                  padding: '12px 12px 12px 45px',
                  border: error ? '2px solid #ef4444' : '2px solid #e5e7eb',
                  borderRadius: '8px',
                  fontSize: '16px',
                  outline: 'none',
                  transition: 'all 0.2s ease',
                  background: isBlocked ? '#f3f4f6' : 'white',
                  boxSizing: 'border-box'
                }}
                onFocus={(e) => {
                  if (!error) {
                    e.target.style.borderColor = '#3b82f6';
                  }
                }}
                onBlur={(e) => {
                  if (!error) {
                    e.target.style.borderColor = '#e5e7eb';
                  }
                }}
              />
            </div>
            
            {error && (
              <div style={{
                marginTop: '10px',
                padding: '10px',
                background: '#fef2f2',
                border: '1px solid #fecaca',
                borderRadius: '6px',
                color: '#dc2626',
                fontSize: '14px',
                fontWeight: '600'
              }}>
                {error}
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={isBlocked || !password}
            style={{
              width: '100%',
              padding: '14px',
              background: isBlocked || !password ? '#9ca3af' : '#1e40af',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: isBlocked || !password ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              if (!isBlocked && password) {
                e.currentTarget.style.background = '#1e3a8a';
              }
            }}
            onMouseLeave={(e) => {
              if (!isBlocked && password) {
                e.currentTarget.style.background = '#1e40af';
              }
            }}
          >
            {isBlocked ? '🚫 Bloqué' : 'Déverrouiller'}
          </button>
        </form>

        {/* Aide */}
        <div style={{
          marginTop: '25px',
          padding: '15px',
          background: '#f0f9ff',
          borderRadius: '8px',
          border: '1px solid #bfdbfe'
        }}>
          <div style={{
            fontSize: '13px',
            color: '#1e40af',
            fontWeight: '600',
            marginBottom: '8px'
          }}>
            💡 Informations
          </div>
          <ul style={{
            margin: 0,
            paddingLeft: '20px',
            fontSize: '13px',
            color: '#666'
          }}>
            <li>Accès valide pour cette session uniquement</li>
            <li>5 tentatives maximum (reset après 1 minute)</li>
            <li>Pour changer le mot de passe : Paramètres → Sécurité</li>
            <li>Contactez l'administrateur si vous avez oublié le mot de passe</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

