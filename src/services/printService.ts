import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

const isProd = typeof process !== 'undefined' && process.env.NODE_ENV === 'production';

export interface PrintJob {
  /** Si fourni, on rend ce HTML dans un conteneur temporaire (prioritaire sur elementId) */
  html?: string;
  fileName?: string;
  format?: 'A4' | 'A5' | 'A6';
  landscape?: boolean;
  /** Multiplicateur de résolution pour html2canvas (par défaut: max(2, devicePixelRatio)) */
  scale?: number;
  /** Alternative à html: capture d'un élément existant dans le DOM */
  elementId?: string;
  /** Marge intérieure PDF en millimètres */
  marginMm?: number;
  /** Télécharge automatiquement le PDF (par défaut: true) */
  autoDownload?: boolean;
}

export interface PrintResult {
  ok: boolean;
  /** Pour compat éventuelle desktop; non utilisée en web */
  path?: string;
  /** URL du Blob pour prévisualiser le PDF (penser à URL.revokeObjectURL côté appelant) */
  blobUrl?: string;
  error?: string;
}

export class PrintService {
  // ————————————————————————————————————————————————————————
  // PDF — Capture d'un élément DOM OU d'une string HTML
  // ————————————————————————————————————————————————————————
  static async generatePDF(job: PrintJob): Promise<PrintResult> {
    const {
      elementId,
      html,
      fileName = 'rapport-caisse.pdf',
      format = 'A4',
      landscape = false,
      scale = Math.max(
        2,
        typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 2
      ),
      marginMm = 10,
      autoDownload = true,
    } = job;

    let cleanup: (() => void) | null = null;

    try {
      // 1) Récupérer la cible à rendre
      let target: HTMLElement | null = null;

      if (elementId) {
        target = document.getElementById(elementId);
        if (!target) throw new Error(`Élément introuvable: #${elementId}`);
      } else if (html) {
        const container = document.createElement('div');
        container.style.position = 'fixed';
        container.style.left = '-10000px';
        container.style.top = '0';
        container.style.width = '794px'; // ~A4 @96dpi; base layout stable
        container.innerHTML = html;
        document.body.appendChild(container);
        target = container;

        cleanup = () => {
          if (container.parentNode) container.parentNode.removeChild(container);
        };
      } else {
        throw new Error('Vous devez fournir elementId ou html');
      }

      // 2) Capture haute résolution
      const canvas = await html2canvas(target, {
        scale,
        useCORS: true,
        allowTaint: false,
        backgroundColor: '#ffffff',
        removeContainer: true,
        imageTimeout: 0,
        logging: false,
        foreignObjectRendering: true,
      });

      // 3) Dimensions PDF
      const formats = {
        A4: { w: 210, h: 297 },
        A5: { w: 148, h: 210 },
        A6: { w: 105, h: 148 },
      };

      let pageWidth: number = formats[format].w;
      let pageHeight: number = formats[format].h;
      if (landscape) {
        const temp = pageWidth;
        pageWidth = pageHeight;
        pageHeight = temp;
      }

      const contentWidth = pageWidth - 2 * marginMm;
      const contentHeight = pageHeight - 2 * marginMm;

      const orientation = pageWidth > pageHeight ? 'landscape' : 'portrait';
      const pdf = new jsPDF({
        orientation,
        unit: 'mm',
        format: format.toLowerCase() as 'a4' | 'a5' | 'a6',
      });

      // Dimensions image à insérer (proportionnelles)
      const imgWidth = contentWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      // 4) Pagination précise (basée sur le canvas source)
      let remainingHeight = imgHeight;
      let yOffset = 0; // en mm (dans l'espace PDF)

      while (remainingHeight > 0) {
        if (yOffset > 0) pdf.addPage();

        const windowHeight = Math.min(remainingHeight, contentHeight);

        // Convertit l'offset/hauteur "PDF" vers des pixels du canvas
        const sourceY = (yOffset * canvas.height) / imgHeight;
        const cutHeightPx = (windowHeight * canvas.height) / imgHeight;

        // Découpe une fenêtre dans le canvas source
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = canvas.width;
        tempCanvas.height = Math.max(1, Math.round(cutHeightPx));
        const tempCtx = tempCanvas.getContext('2d')!;
        tempCtx.drawImage(
          canvas,
          0, Math.round(sourceY),                 // src x,y
          canvas.width, tempCanvas.height,        // src w,h
          0, 0,                                    // dst x,y
          canvas.width, tempCanvas.height          // dst w,h
        );

        const windowData = tempCanvas.toDataURL('image/png', 1.0);
        pdf.addImage(windowData, 'PNG', marginMm, marginMm, imgWidth, windowHeight);

        yOffset += windowHeight;
        remainingHeight -= windowHeight;
      }

      // 5) Métadonnées
      pdf.setProperties({
        title: 'Rapport de Caisse MyConfort',
        subject: 'Rapport quotidien des ventes',
        author: 'MyConfort POS System',
        creator: 'MyConfort Cash Register',
        keywords: 'caisse, rapport, ventes, myconfort',
      });

      // 6) Blob + URL (laisser la révocation à l'appelant)
      const pdfBlob = pdf.output('blob');
      const blobUrl = URL.createObjectURL(pdfBlob);

      if (autoDownload) {
        pdf.save(fileName);
      }

      if (!isProd) console.log('✅ PDF généré:', { fileName, format, landscape, blobUrl });

      return { ok: true, blobUrl };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erreur inconnue';
      if (!isProd) console.error('❌ Erreur génération PDF:', message);
      return { ok: false, error: `Erreur lors de la génération du PDF: ${message}` };
    } finally {
      if (cleanup) cleanup();
    }
  }

  // ————————————————————————————————————————————————————————
  // Impression native via fenêtre dédiée (avec injection CSS)
  // ————————————————————————————————————————————————————————
  static async printElement(
    elementId: string,
    opts?: { includeStyles?: boolean; title?: string }
  ): Promise<PrintResult> {
    const includeStyles = opts?.includeStyles ?? true;
    const title = opts?.title ?? 'Rapport de Caisse - MyConfort';

    try {
      const element = document.getElementById(elementId);
      if (!element) throw new Error(`Élément introuvable pour impression: #${elementId}`);

      const printWindow = window.open('', '_blank', 'width=800,height=600');
      if (!printWindow) {
        throw new Error("Impossible d'ouvrir la fenêtre d'impression. Vérifiez le blocage des popups.");
      }

      // CSS d'impression de base
      const printCSS = `
        <style>
          @media print {
            @page { size: A4; margin: 15mm; }
            html, body {
              margin: 0; padding: 0;
              font-family: Arial, sans-serif;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            * { box-sizing: border-box; }
            .no-print, .print-hidden { display: none !important; }
            .printable-content { width: 100%; max-width: none; box-shadow: none !important; }
            table { page-break-inside: avoid; border-collapse: collapse; width: 100%; }
            tr { page-break-inside: avoid; }
            .header { background: #007bff !important; color: #ffffff !important; }
            .break-before { page-break-before: always; }
            .break-after { page-break-after: always; }
          }
          @media screen {
            body { padding: 20px; background: #f5f5f5; }
          }
        </style>
      `;

      // Base HTML
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="UTF-8" />
            <title>${title}</title>
            ${printCSS}
          </head>
          <body>
            <div class="printable-content">${element.innerHTML}</div>
          </body>
        </html>
      `);

      // Injection des styles du document courant (si autorisé)
      if (includeStyles) {
        try {
          const sheets = Array.from(document.styleSheets) as CSSStyleSheet[];
          for (const sheet of sheets) {
            try {
              const rules = sheet.cssRules;
              let cssText = '';
              for (let i = 0; i < rules.length; i++) cssText += rules[i].cssText;
              const styleEl = printWindow.document.createElement('style');
              styleEl.textContent = cssText;
              printWindow.document.head.appendChild(styleEl);
            } catch {
              // Cross-origin: on ignore silencieusement
            }
          }
        } catch {
          // En cas de restriction, on garde au moins le CSS de base
        }
      }

      printWindow.document.close();

      // Attendre le rendu complet puis lancer l'impression
      return new Promise((resolve) => {
        const doPrint = () => {
          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              setTimeout(() => {
                printWindow.print();
                setTimeout(() => {
                  printWindow.close();
                  resolve({ ok: true });
                }, 500);
              }, 250);
            });
          });
        };

        if (printWindow.document.readyState === 'complete') {
          doPrint();
        } else {
          printWindow.onload = doPrint;
        }
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erreur inconnue';
      if (!isProd) console.error('❌ Erreur impression:', message);
      return { ok: false, error: `Erreur lors de l'impression: ${message}` };
    }
  }

  // ————————————————————————————————————————————————————————
  // Méthode de convenance (rétrocompatibilité)
  // ————————————————————————————————————————————————————————
  static async generatePDFFromElement(
    elementId: string,
    filename: string = 'rapport-caisse.pdf'
  ): Promise<boolean> {
    const result = await this.generatePDF({ elementId, fileName: filename });
    if (!result.ok && result.error) throw new Error(result.error);
    return result.ok;
  }

  // ————————————————————————————————————————————————————————
  // Helpers format
  // ————————————————————————————————————————————————————————
  static formatCurrency(amount: number): string {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(amount);
  }

  static formatDate(date: Date): string {
    return new Intl.DateTimeFormat('fr-FR', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    }).format(date);
  }

  static formatTime(date: Date): string {
    return new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' }).format(date);
  }

  static formatDateTime(date: Date): string {
    return new Intl.DateTimeFormat('fr-FR', {
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit',
    }).format(date);
  }
}
