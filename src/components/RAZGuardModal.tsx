import React, { useEffect, useMemo, useState } from "react";
import { ShowMode } from "../hooks/useRAZGuardSetting";

type RAZGuardModalProps = {
  isViewed: boolean;
  isPrinted: boolean;
  isEmailSent: boolean;
  onAcknowledge?: () => void;

  /** "always" = à chaque fois | "daily" = 1 fois/jour */
  showMode?: ShowMode;

  /** Identifiant logique de la session (ex: "foire_lyon_2025_j2") */
  sessionId?: string;

  /** Fichier audio dans /public (ex: "/sounds/ding.mp3") */
  chimeSrc?: string;
};

function todayKey() {
  const d = new Date();
  // YYYY-MM-DD
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}

export const RAZGuardModal: React.FC<RAZGuardModalProps> = ({
  isViewed,
  isPrinted,
  isEmailSent,
  onAcknowledge,
  showMode = "daily",
  sessionId = "default",
  chimeSrc = "/sounds/ding.mp3",
}) => {
  // visibilité initiale selon le mode
  const storageKey = useMemo(
    () => `raz_guard_ack_${sessionId}_${todayKey()}`,
    [sessionId]
  );

  const [open, setOpen] = useState<boolean>(false);

  useEffect(() => {
    if (showMode === "always") {
      setOpen(true);
      return;
    }
    // daily
    try {
      const val = localStorage.getItem(storageKey);
      setOpen(!val); // si pas d'acquittement aujourd'hui => ouvrir
    } catch {
      setOpen(true);
    }
  }, [showMode, storageKey]);

  // 🔊 Son doux à l'ouverture (meilleur-effort, compatible iPad)
  useEffect(() => {
    if (!open || !chimeSrc) return;
    const audio = new Audio(chimeSrc);
    audio.volume = 0.3;
    audio.play().catch(() => {
      // Safari iPad peut bloquer l'auto-play, donc on ignore l'erreur
    });
  }, [open, chimeSrc]);

  if (!open) return null;

  const acknowledge = () => {
    if (showMode === "daily") {
      try { 
        localStorage.setItem(storageKey, "1"); 
      } catch {
        console.warn('Failed to save RAZ acknowledgment');
      }
    }
    setOpen(false);
    onAcknowledge?.();
  };

  return (
    <div 
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        overflowY: 'auto',
        padding: '20px 0'
      }}
    >
      <div 
        style={{
          width: '92%',
          maxWidth: '600px',
          maxHeight: 'calc(100vh - 40px)',
          overflowY: 'auto',
          borderRadius: '16px',
          backgroundColor: 'white',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          padding: '32px',
          margin: 'auto 0',
          WebkitOverflowScrolling: 'touch'
        }}
      >
        {/* Titre */}
        <h2 style={{
          fontSize: '24px',
          fontWeight: 'bold',
          color: '#92400e',
          marginBottom: '16px'
        }}>
          ⚠️ RAZ Journée – Vérifications obligatoires
        </h2>

        {/* Bulle souriante */}
        <div style={{
          marginBottom: '16px',
          display: 'flex',
          alignItems: 'flex-start',
          gap: '12px',
          borderRadius: '16px',
          backgroundColor: '#ecfdf5',
          padding: '16px',
          border: '1px solid #a7f3d0',
          boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
        }}>
          <span style={{ fontSize: '24px' }} aria-hidden>😃</span>
          <p style={{
            color: '#064e3b',
            fontWeight: '500',
            margin: 0
          }}>
            N'oublie pas d'imprimer la feuille de caisse et de la ranger dans <strong>l'enveloppe</strong>.
          </p>
        </div>

        {/* Checklist dynamique */}
        <ul style={{
          listStyle: 'none',
          padding: 0,
          margin: '0 0 16px 0',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px'
        }}>
          <li style={{
            color: isViewed ? '#064e3b' : '#374151',
            fontSize: '16px'
          }}>
            {isViewed ? "✅" : "•"} 1) Feuille de caisse visionnée (bouton noir)
          </li>
          <li style={{
            color: isPrinted ? '#064e3b' : '#374151',
            fontSize: '16px'
          }}>
            {isPrinted ? "✅" : "•"} 2) Impression effectuée (bouton vert)
          </li>
          <li style={{
            color: isEmailSent ? '#064e3b' : '#374151',
            fontSize: '16px'
          }}>
            {isEmailSent ? "✅" : "•"} 3) Email envoyé (bouton jaune)
          </li>
          <li style={{
            color: (isViewed && isPrinted && isEmailSent) ? '#064e3b' : '#374151',
            fontSize: '16px'
          }}>
            {(isViewed && isPrinted && isEmailSent) ? "✅" : "•"} 4) RAZ Journée (bouton rouge)
          </li>
        </ul>

        {/* Rappel règles */}
        <div style={{
          backgroundColor: '#fffbeb',
          border: '1px solid #fde68a',
          borderRadius: '12px',
          padding: '16px',
          fontSize: '14px',
          color: '#92400e',
          marginBottom: '20px'
        }}>
          <ul style={{
            listStyleType: 'disc',
            paddingLeft: '16px',
            margin: 0,
            display: 'flex',
            flexDirection: 'column',
            gap: '4px'
          }}>
            <li>Impossible d'imprimer si la feuille n'a pas été visionnée.</li>
            <li>Impossible d'envoyer l'email sans impression.</li>
            <li>Impossible de faire RAZ Journée sans email.</li>
            <li><strong>RAZ Fin de session :</strong> Bouton séparé, activé uniquement à la date de clôture prévue.</li>
          </ul>
        </div>

        {/* Actions */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '8px'
        }}>
          <button
            onClick={acknowledge}
            style={{
              width: '100%',
              borderRadius: '12px',
              backgroundColor: '#92400e',
              padding: '12px 16px',
              color: 'white',
              fontWeight: '600',
              border: 'none',
              cursor: 'pointer',
              fontSize: '16px',
              transition: 'background-color 0.2s'
            }}
            onMouseOver={(e) => {
              (e.target as HTMLButtonElement).style.backgroundColor = '#78350f';
            }}
            onMouseOut={(e) => {
              (e.target as HTMLButtonElement).style.backgroundColor = '#92400e';
            }}
          >
            J'ai compris
          </button>
          {showMode === "daily" && (
            <div style={{
              fontSize: '12px',
              color: '#92400e',
              opacity: 0.7,
              textAlign: 'center'
            }}>
              Affichée une fois par jour (session : <code style={{
                backgroundColor: '#fef3c7',
                padding: '2px 6px',
                borderRadius: '4px'
              }}>{sessionId}</code>)
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
