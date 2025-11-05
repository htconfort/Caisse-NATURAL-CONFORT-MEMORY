/**
 * Utilitaire d'impression A4 Portrait optimisé
 * Force le format A4 portrait pour l'impression des feuilles de RAZ
 */

export const printHtmlA4 = (htmlContent: string): void => {
  try {
    // Création d'une nouvelle fenêtre pour l'impression
    const printWindow = window.open('', '_blank', 'width=800,height=600');
    
    if (!printWindow) {
      throw new Error('Impossible d\'ouvrir la fenêtre d\'impression. Vérifiez que les popups ne sont pas bloquées.');
    }

    // HTML complet avec styles CSS A4 portrait intégrés
    const fullHtml = `
      <!DOCTYPE html>
      <html lang="fr">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Impression A4 Portrait - Feuille RAZ</title>
        <style>
          /* Reset CSS pour impression */
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }

          /* Configuration page A4 portrait */
          @page {
            size: A4 portrait;
            margin: 15mm;
            orientation: portrait;
          }

          /* Styles pour écran (aperçu) */
          body {
            font-family: Arial, sans-serif;
            font-size: 12pt;
            line-height: 1.3;
            color: #000;
            background: white;
            width: 210mm;
            min-height: 297mm;
            margin: 0 auto;
            padding: 15mm;
          }

          /* Styles spécifiques impression */
          @media print {
            body {
              width: 100% !important;
              max-width: none !important;
              min-height: auto !important;
              margin: 0 !important;
              padding: 0 !important;
              background: white !important;
              color: black !important;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
              color-adjust: exact;
            }

            /* Force A4 portrait */
            @page {
              size: A4 portrait !important;
              margin: 15mm !important;
              orientation: portrait !important;
            }

            /* Optimisation contenu pour impression */
            .a4-sheet {
              width: 100% !important;
              max-width: none !important;
              min-height: auto !important;
              margin: 0 !important;
              padding: 0 !important;
              box-shadow: none !important;
              border-radius: 0 !important;
              page-break-inside: avoid;
            }

            /* Masquer éléments non imprimables */
            .no-print,
            button,
            .print-button,
            .action-button {
              display: none !important;
            }

            /* Assurer visibilité du contenu */
            .print-content {
              display: block !important;
              visibility: visible !important;
            }

            /* Tables et grilles optimisées */
            table {
              width: 100% !important;
              border-collapse: collapse !important;
            }

            th, td {
              border: 1px solid #000 !important;
              padding: 4px !important;
            }
          }

          /* Styles généraux pour le contenu */
          .print-header {
            text-align: center;
            margin-bottom: 20px;
            font-weight: bold;
          }

          .print-section {
            margin-bottom: 15px;
          }

          .print-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 15px;
          }

          .print-table th,
          .print-table td {
            border: 1px solid #000;
            padding: 6px;
            text-align: left;
          }

          .print-table th {
            background-color: #f0f0f0;
            font-weight: bold;
          }

          .print-total {
            font-weight: bold;
            background-color: #f9f9f9;
          }
        </style>
      </head>
      <body>
        <div class="a4-sheet print-content">
          ${htmlContent}
        </div>

        <script>
          // Auto-impression après chargement
          window.onload = function() {
            setTimeout(function() {
              window.print();
              // Fermer la fenêtre après impression (optionnel)
              setTimeout(function() {
                window.close();
              }, 1000);
            }, 500);
          };

          // Gestion des erreurs d'impression
          window.onbeforeprint = function() {
            console.log('🖨️ Début impression A4 portrait');
          };

          window.onafterprint = function() {
            console.log('✅ Impression A4 portrait terminée');
          };
        </script>
      </body>
      </html>
    `;

    // Écriture du contenu dans la fenêtre
    printWindow.document.write(fullHtml);
    printWindow.document.close();

    // Focus sur la fenêtre d'impression
    printWindow.focus();

  } catch (error) {
    console.error('❌ Erreur lors de l\'impression A4:', error);
    throw error;
  }
};

/**
 * Fonction d'impression simplifiée pour cas d'urgence
 */
export const printSimpleA4 = (content: string): void => {
  const printContent = `
    <style>
      @page { size: A4 portrait; margin: 15mm; }
      body { font-family: Arial; font-size: 12pt; }
    </style>
    <div class="a4-sheet">${content}</div>
  `;
  
  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(`<!DOCTYPE html><html><head><title>Impression</title></head><body>${printContent}</body></html>`);
    printWindow.document.close();
    printWindow.print();
  }
};
