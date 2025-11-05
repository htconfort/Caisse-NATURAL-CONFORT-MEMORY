import React from "react";
import { RAZGuardSettingCard } from "./RAZGuardSettingCard";

export const ParametresAdmin: React.FC = () => {
  return (
    <div style={{
      padding: '20px',
      backgroundColor: '#f5f5f5',
      minHeight: '100vh'
    }}>
      <div style={{ 
        maxWidth: '800px', 
        margin: '0 auto' 
      }}>
        {/* En-tête */}
        <div style={{
          textAlign: 'center',
          marginBottom: '30px',
          padding: '20px',
          backgroundColor: '#4f46e5',
          color: 'white',
          borderRadius: '10px'
        }}>
          <h1 style={{ 
            margin: 0, 
            fontSize: '2.2em', 
            fontWeight: 'bold' 
          }}>
            ⚙️ PARAMÈTRES ADMIN
          </h1>
          <p style={{ 
            margin: '10px 0 0 0', 
            fontSize: '1.1em' 
          }}>
            Configuration des alertes et sécurités du système
          </p>
        </div>

        {/* Section Sécurité RAZ */}
        <div style={{ marginBottom: '20px' }}>
          <h2 style={{
            fontSize: '1.5em',
            fontWeight: 'bold',
            color: '#374151',
            marginBottom: '16px'
          }}>
            🛡️ Sécurité RAZ
          </h2>
          <RAZGuardSettingCard />
        </div>

        {/* Section Info */}
        <div style={{
          backgroundColor: '#e0f2fe',
          border: '1px solid #81d4fa',
          borderRadius: '12px',
          padding: '16px',
          fontSize: '14px',
          color: '#0277bd'
        }}>
          <h3 style={{ 
            margin: '0 0 8px 0', 
            fontWeight: 'bold' 
          }}>
            📋 Informations
          </h3>
          <ul style={{ 
            margin: 0, 
            paddingLeft: '20px' 
          }}>
            <li>Ces paramètres s'appliquent immédiatement à toute l'application</li>
            <li>La modal RAZ Guard aide à prévenir les erreurs humaines</li>
            <li>Mode "Toujours" recommandé lors de formations</li>
            <li>Mode "Une fois par jour" recommandé en utilisation normale</li>
          </ul>
        </div>
      </div>
    </div>
  );
};
