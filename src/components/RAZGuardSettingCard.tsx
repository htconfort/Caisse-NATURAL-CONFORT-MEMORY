import React from "react";
import { useRAZGuardSetting, ShowMode } from "../hooks/useRAZGuardSetting";

export const RAZGuardSettingCard: React.FC = () => {
  const { mode, setMode, ready } = useRAZGuardSetting("daily");
  
  if (!ready) return null;

  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value as ShowMode;
    setMode(val);
  };

  return (
    <div style={{
      borderRadius: '16px',
      border: '1px solid #e5e7eb',
      backgroundColor: 'white',
      padding: '24px',
      boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
      marginBottom: '16px'
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '8px'
      }}>
        <h3 style={{
          fontSize: '18px',
          fontWeight: '600',
          margin: 0
        }}>
          Notification RAZ (Modal)
        </h3>
        <span style={{
          fontSize: '12px',
          borderRadius: '9999px',
          padding: '2px 8px',
          backgroundColor: '#f3f4f6',
          color: '#374151'
        }}>
          iPad Wizard
        </span>
      </div>
      
      <p style={{
        fontSize: '14px',
        color: '#374151',
        marginBottom: '16px',
        margin: '0 0 16px 0'
      }}>
        Choisis la fréquence d'affichage de la modale d'alerte RAZ pour guider les vendeuses.
      </p>

      <div style={{
        display: 'grid',
        gap: '8px',
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))'
      }}>
        <label style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          borderRadius: '12px',
          border: mode === "daily" ? '1px solid #a7f3d0' : '1px solid #e5e7eb',
          backgroundColor: mode === "daily" ? '#ecfdf5' : 'white',
          padding: '12px',
          cursor: 'pointer'
        }}>
          <input
            type="radio"
            name="razShowMode"
            value="daily"
            checked={mode === "daily"}
            onChange={onChange}
            style={{
              height: '16px',
              width: '16px'
            }}
          />
          <div>
            <div style={{ fontWeight: '500' }}>Une fois par jour</div>
            <div style={{
              fontSize: '12px',
              color: '#6b7280'
            }}>
              Afficher la modale au premier accès, puis la cacher jusqu'au lendemain.
            </div>
          </div>
        </label>

        <label style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          borderRadius: '12px',
          border: mode === "always" ? '1px solid #fcd34d' : '1px solid #e5e7eb',
          backgroundColor: mode === "always" ? '#fffbeb' : 'white',
          padding: '12px',
          cursor: 'pointer'
        }}>
          <input
            type="radio"
            name="razShowMode"
            value="always"
            checked={mode === "always"}
            onChange={onChange}
            style={{
              height: '16px',
              width: '16px'
            }}
          />
          <div>
            <div style={{ fontWeight: '500' }}>Toujours</div>
            <div style={{
              fontSize: '12px',
              color: '#6b7280'
            }}>
              Afficher la modale à chaque entrée dans l'onglet RAZ (idéal en formation).
            </div>
          </div>
        </label>
      </div>

      <div style={{
        marginTop: '16px',
        fontSize: '12px',
        color: '#6b7280'
      }}>
        Astuce : ce réglage est sauvegardé localement. Tu pourras basculer plus tard sur un
        stockage global (<code>SystemSettings</code>) sans changer cet écran.
      </div>
    </div>
  );
};
