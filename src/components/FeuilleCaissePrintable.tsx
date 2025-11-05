import React from 'react';
import { printHtmlA4 } from '@/utils/printA4';

interface Props {
  eventName: string;
  contentHtml: string; // contenu HTML (tableau, stats, etc.)
  onPrintComplete?: () => void; // Callback appelé après impression
}

export const FeuilleCaissePrintable: React.FC<Props> = ({ eventName, contentHtml, onPrintComplete }) => {
  const handlePrint = () => {
    const fullHtml = `
      <div style="padding: 32px; font-family: 'Manrope', sans-serif;">
        <h1 style="text-align: center; font-size: 20px; margin-bottom: 20px;">
          📍 Feuille de Caisse — ${eventName}
        </h1>
        ${contentHtml}
      </div>
    `;
    printHtmlA4(fullHtml);
    
    // ✅ Notifier le parent que l'impression a eu lieu
    if (onPrintComplete) {
      onPrintComplete();
    }
  };

  return (
    <button
      onClick={handlePrint}
      style={{
        backgroundColor: '#477A0C',
        color: 'white',
        padding: '8px 16px',
        borderRadius: '8px',
        fontSize: '16px',
        border: 'none',
        cursor: 'pointer'
      }}
    >
      🧾 Imprimer Feuille de Caisse
    </button>
  );
};
