import React, { useState, useMemo } from 'react';
import { Printer, Mail, Download, Eye, EyeOff, RefreshCw } from 'lucide-react';
import type { Sale, Vendor, Invoice } from '../types';

// ===== DONNÉES D'EXEMPLE RÈGLEMENTS À VENIR - À REMPLACER PAR VOS VRAIES DONNÉES =====
const reglementsAVenir = [
  { vendorId: '1', vendorName: 'Sylvie', clientName: 'Martin Dupont', nbCheques: 3, montantCheque: 450.00, dateProchain: '2025-09-15' },
  { vendorId: '1', vendorName: 'Sylvie', clientName: 'Sophie Bernard', nbCheques: 2, montantCheque: 650.00, dateProchain: '2025-08-20' },
  { vendorId: '2', vendorName: 'Babette', clientName: 'Jean Moreau', nbCheques: 4, montantCheque: 375.50, dateProchain: '2025-08-25' },
  { vendorId: '3', vendorName: 'Lucia', clientName: 'Claire Rousseau', nbCheques: 6, montantCheque: 280.00, dateProchain: '2025-09-01' },
  { vendorId: '3', vendorName: 'Lucia', clientName: 'Pierre Durand', nbCheques: 2, montantCheque: 890.00, dateProchain: '2025-08-30' },
  { vendorId: '5', vendorName: 'Johan', clientName: 'Marie Leblanc', nbCheques: 3, montantCheque: 520.00, dateProchain: '2025-09-10' },
];

interface FeuilleDeRAZProProps {
  sales: Sale[];
  invoices: Invoice[];
  vendorStats: Vendor[];
  exportDataBeforeReset: () => void;
  executeRAZ: () => void;
}

function FeuilleDeRAZPro({ sales, invoices, vendorStats, exportDataBeforeReset, executeRAZ }: FeuilleDeRAZProProps) {
  const [modeApercu, setModeApercu] = useState(false);

  // ===== CALCULS AUTOMATIQUES =====
  const calculs = useMemo(() => {
    const validSales = sales.filter(sale => !sale.canceled);
    
    // ===== CALCULS VENTES CAISSE =====
    const caisseParPaiement = {
      carte: validSales.filter(v => v.paymentMethod === 'card').reduce((sum, v) => sum + v.totalAmount, 0),
      especes: validSales.filter(v => v.paymentMethod === 'cash').reduce((sum, v) => sum + v.totalAmount, 0),
      cheque: validSales.filter(v => v.paymentMethod === 'check').reduce((sum, v) => sum + v.totalAmount, 0),
      mixte: validSales.filter(v => v.paymentMethod === 'multi').reduce((sum, v) => sum + v.totalAmount, 0),
    };
    
    const caisseTotal = Object.values(caisseParPaiement).reduce((sum, amount) => sum + amount, 0);
    const caisseNbVentes = validSales.length;
    const caisseTicketMoyen = caisseNbVentes > 0 ? caisseTotal / caisseNbVentes : 0;

    // ===== CALCULS FACTURES N8N =====
    const facturierTotal = invoices.reduce((sum, invoice) => sum + invoice.totalTTC, 0);
    const facturierNbVentes = invoices.length;
    const facturierTicketMoyen = facturierNbVentes > 0 ? facturierTotal / facturierNbVentes : 0;

    // ===== TOTAUX GLOBAUX =====
    const caTotal = caisseTotal + facturierTotal;
    const nbVentesTotal = caisseNbVentes + facturierNbVentes;
    const ticketMoyen = nbVentesTotal > 0 ? caTotal / nbVentesTotal : 0;
    
    // Totaux par mode de paiement (pour compatibilité - seulement caisse)
    const parPaiement = caisseParPaiement;

    // Calculs par vendeuse avec détail des modes de paiement
    const vendeusesAvecDetail = vendorStats.map(vendeur => {
      const ventesVendeur = validSales.filter(v => v.vendorName === vendeur.name);
      const facturesVendeur = invoices.filter(f => f.vendorName === vendeur.name);
      
      const detailPaiements = {
        carte: ventesVendeur.filter(v => v.paymentMethod === 'card').reduce((sum, v) => sum + v.totalAmount, 0),
        especes: ventesVendeur.filter(v => v.paymentMethod === 'cash').reduce((sum, v) => sum + v.totalAmount, 0),
        cheque: ventesVendeur.filter(v => v.paymentMethod === 'check').reduce((sum, v) => sum + v.totalAmount, 0),
        mixte: ventesVendeur.filter(v => v.paymentMethod === 'multi').reduce((sum, v) => sum + v.totalAmount, 0),
      };
      
      const totalCaisseVendeur = Object.values(detailPaiements).reduce((sum, amount) => sum + amount, 0);
      const totalFacturierVendeur = facturesVendeur.reduce((sum, f) => sum + f.totalTTC, 0);
      const totalVendeur = totalCaisseVendeur + totalFacturierVendeur;
      const nbVentesVendeur = ventesVendeur.length + facturesVendeur.length;
      
      return {
        ...vendeur,
        detailPaiements,
        totalCaisse: totalCaisseVendeur,
        totalFacturier: totalFacturierVendeur,
        totalCalcule: totalVendeur,
        nbVentesCalcule: nbVentesVendeur,
        nbVentesCaisse: ventesVendeur.length,
        nbVentesFacturier: facturesVendeur.length
      };
    });

    const vendeusesActives = vendeusesAvecDetail.filter(v => v.totalCalcule > 0).length;

    // Calculs des règlements à venir
    const totalReglementsAVenir = reglementsAVenir.reduce((total, reglement) => 
      total + (reglement.nbCheques * reglement.montantCheque), 0
    );
    
    const nbClientsAttente = reglementsAVenir.length;
    const nbChequesTotal = reglementsAVenir.reduce((total, reglement) => total + reglement.nbCheques, 0);

    return {
      // Totaux globaux
      parPaiement,
      caTotal,
      nbVentesTotal,
      ticketMoyen,
      vendeusesActives,
      vendeusesAvecDetail,
      
      // Détails Caisse
      caisseTotal,
      caisseNbVentes,
      caisseTicketMoyen,
      caisseParPaiement,
      
      // Détails Facturier
      facturierTotal,
      facturierNbVentes,
      facturierTicketMoyen,
      
      // Règlements
      totalReglementsAVenir,
      nbClientsAttente,
      nbChequesTotal
    };
  }, [sales, invoices, vendorStats]);

  // ===== FONCTIONS D'ACTION =====
  const imprimer = () => {
    console.log('🖨️ Début de la fonction d\'impression');
    console.log('📊 Données calculs:', calculs);
    
    try {
      // Créer une nouvelle fenêtre pour l'impression
      const fenetreImpression = window.open('', '_blank');
      if (!fenetreImpression) {
        alert('Impossible d\'ouvrir la fenêtre d\'impression. Veuillez autoriser les popups pour ce site.');
        return;
      }
      
      console.log('✅ Fenêtre d\'impression créée');
      
      const contenuHTML = genererHTMLImpression(calculs);
      console.log('✅ HTML généré, longueur:', contenuHTML.length);
      
      fenetreImpression.document.write(contenuHTML);
      fenetreImpression.document.close();
      fenetreImpression.focus();
      
      console.log('✅ Lancement de l\'impression');
      fenetreImpression.print();
      fenetreImpression.close();
      
      console.log('✅ Impression terminée');
    } catch (error) {
      console.error('❌ Erreur lors de l\'impression:', error);
      alert('Erreur lors de l\'impression: ' + String(error));
    }
  };

  const genererHTMLImpression = (calculsData: {
    parPaiement: { carte: number; especes: number; cheque: number; mixte: number };
    caTotal: number;
    nbVentesTotal: number;
    ticketMoyen: number;
    vendeusesActives: number;
    vendeusesAvecDetail: VendeusesAvecDetail[];
    totalReglementsAVenir: number;
    nbClientsAttente: number;
    nbChequesTotal: number;
  }) => {
    return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>MyConfort - Feuille de caisse</title>
      <style>
        body {
          margin: 0;
          padding: 40px;
          font-family: Arial, sans-serif;
          font-size: 14px;
          line-height: 1.4;
          color: black;
          background: white;
        }
        @page {
          margin: 1.5cm;
          size: A4;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          border: 2px solid black;
        }
        th, td {
          border: 1px solid black;
          padding: 8px;
          text-align: left;
        }
        th {
          background-color: #f0f0f0;
          font-weight: bold;
        }
        .text-center { text-align: center; }
        .text-right { text-align: right; }
        .font-bold { font-weight: bold; }
        .bg-gray { background-color: #f9f9f9; }
      </style>
    </head>
    <body>
      <div style="text-align: center; margin-bottom: 40px; padding-bottom: 20px; border-bottom: 3px solid black;">
        <h1 style="margin: 0; font-size: 32px; font-weight: bold; letter-spacing: 2px;">MYCONFORT</h1>
        <h2 style="margin: 10px 0; font-size: 24px; font-weight: bold;">FEUILLE DE CAISSE</h2>
        <p style="margin: 0; font-size: 18px; font-weight: bold;">
          ${new Date().toLocaleDateString('fr-FR', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric'
          }).toUpperCase()}
        </p>
      </div>

      <div style="display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap: 20px; margin-bottom: 40px;">
        <div style="text-align: center; padding: 20px; border: 2px solid black;">
          <h3 style="margin: 0 0 10px 0; font-size: 14px; font-weight: bold;">CHIFFRE D'AFFAIRES</h3>
          <p style="margin: 0; font-size: 24px; font-weight: bold;">${calculsData.caTotal.toFixed(2)} €</p>
        </div>
        <div style="text-align: center; padding: 20px; border: 2px solid black;">
          <h3 style="margin: 0 0 10px 0; font-size: 14px; font-weight: bold;">NOMBRE DE VENTES</h3>
          <p style="margin: 0; font-size: 24px; font-weight: bold;">${calculsData.nbVentesTotal}</p>
        </div>
        <div style="text-align: center; padding: 20px; border: 2px solid black;">
          <h3 style="margin: 0 0 10px 0; font-size: 14px; font-weight: bold;">TICKET MOYEN</h3>
          <p style="margin: 0; font-size: 24px; font-weight: bold;">${calculsData.ticketMoyen.toFixed(2)} €</p>
        </div>
        <div style="text-align: center; padding: 20px; border: 2px solid black;">
          <h3 style="margin: 0 0 10px 0; font-size: 14px; font-weight: bold;">RÈGLEMENTS À VENIR</h3>
          <p style="margin: 0; font-size: 18px; font-weight: bold;">${calculsData.totalReglementsAVenir.toFixed(2)} €</p>
          <p style="margin: 5px 0 0 0; font-size: 11px;">${calculsData.nbChequesTotal} chèques</p>
        </div>
      </div>

      <div style="margin-bottom: 40px;">
        <h3 style="font-size: 20px; font-weight: bold; margin-bottom: 15px; padding-bottom: 5px; border-bottom: 2px solid black;">
          CHIFFRE D'AFFAIRES PAR VENDEUSE ET MODE DE PAIEMENT
        </h3>
        <table>
          <thead>
            <tr style="background-color: #f0f0f0;">
              <th>VENDEUSE</th>
              <th class="text-center">NB VENTES</th>
              <th class="text-right">CARTE (€)</th>
              <th class="text-right">ESPÈCES (€)</th>
              <th class="text-right">CHÈQUE (€)</th>
              <th class="text-right">MIXTE (€)</th>
              <th class="text-right">TOTAL (€)</th>
            </tr>
          </thead>
          <tbody>
            ${calculsData.vendeusesAvecDetail
              .filter((v: VendeusesAvecDetail) => v.totalCalcule > 0)
              .sort((a: VendeusesAvecDetail, b: VendeusesAvecDetail) => b.totalCalcule - a.totalCalcule)
              .map((vendeur: VendeusesAvecDetail) => `
                <tr>
                  <td class="font-bold">${vendeur.name}</td>
                  <td class="text-center">${vendeur.nbVentesCalcule}</td>
                  <td class="text-right font-bold">${vendeur.detailPaiements.carte > 0 ? vendeur.detailPaiements.carte.toFixed(2) : '-'}</td>
                  <td class="text-right font-bold">${vendeur.detailPaiements.especes > 0 ? vendeur.detailPaiements.especes.toFixed(2) : '-'}</td>
                  <td class="text-right font-bold">${vendeur.detailPaiements.cheque > 0 ? vendeur.detailPaiements.cheque.toFixed(2) : '-'}</td>
                  <td class="text-right font-bold">${vendeur.detailPaiements.mixte > 0 ? vendeur.detailPaiements.mixte.toFixed(2) : '-'}</td>
                  <td class="text-right font-bold bg-gray">${vendeur.totalCalcule.toFixed(2)}</td>
                </tr>
              `).join('')}
            <tr style="background-color: #f0f0f0; font-weight: bold;">
              <td style="border: 2px solid black;" class="font-bold">TOTAL</td>
              <td style="border: 2px solid black;" class="text-center font-bold">${calculsData.nbVentesTotal}</td>
              <td style="border: 2px solid black;" class="text-right font-bold">${calculsData.parPaiement.carte.toFixed(2)}</td>
              <td style="border: 2px solid black;" class="text-right font-bold">${calculsData.parPaiement.especes.toFixed(2)}</td>
              <td style="border: 2px solid black;" class="text-right font-bold">${calculsData.parPaiement.cheque.toFixed(2)}</td>
              <td style="border: 2px solid black;" class="text-right font-bold">${calculsData.parPaiement.mixte.toFixed(2)}</td>
              <td style="border: 2px solid black;" class="text-right font-bold">${calculsData.caTotal.toFixed(2)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      ${reglementsAVenir.length > 0 ? `
      <div style="margin-bottom: 40px;">
        <h3 style="font-size: 20px; font-weight: bold; margin-bottom: 15px; padding-bottom: 5px; border-bottom: 2px solid black;">
          RÈGLEMENTS À VENIR (FACTURIER)
        </h3>
        
        <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 20px; margin-bottom: 20px; text-align: center;">
          <div style="padding: 10px; background-color: #f0f0f0; border: 1px solid black; font-weight: bold;">
            TOTAL ATTENDU<br/>
            <span style="font-size: 18px; color: #000;">${calculs.totalReglementsAVenir.toFixed(2)} €</span>
          </div>
          <div style="padding: 10px; background-color: #f0f0f0; border: 1px solid black; font-weight: bold;">
            CLIENTS EN ATTENTE<br/>
            <span style="font-size: 18px; color: #000;">${calculs.nbClientsAttente}</span>
          </div>
          <div style="padding: 10px; background-color: #f0f0f0; border: 1px solid black; font-weight: bold;">
            CHÈQUES TOTAUX<br/>
            <span style="font-size: 18px; color: #000;">${calculs.nbChequesTotal}</span>
          </div>
        </div>

        <table>
          <thead>
            <tr style="background-color: #f0f0f0;">
              <th>VENDEUSE</th>
              <th>CLIENT</th>
              <th class="text-center">NB CHÈQUES</th>
              <th class="text-right">MONTANT/CHÈQUE</th>
              <th class="text-right">TOTAL CLIENT</th>
              <th class="text-center">PROCHAINE ÉCHÉANCE</th>
            </tr>
          </thead>
          <tbody>
            ${reglementsAVenir
              .sort((a, b) => a.vendorName.localeCompare(b.vendorName))
              .map(reglement => {
                const totalClient = reglement.nbCheques * reglement.montantCheque;
                return `
                  <tr>
                    <td class="font-bold">${reglement.vendorName}</td>
                    <td>${reglement.clientName}</td>
                    <td class="text-center font-bold">${reglement.nbCheques}</td>
                    <td class="text-right font-bold">${reglement.montantCheque.toFixed(2)} €</td>
                    <td class="text-right font-bold bg-gray">${totalClient.toFixed(2)} €</td>
                    <td class="text-center">${new Date(reglement.dateProchain).toLocaleDateString('fr-FR')}</td>
                  </tr>
                `;
              }).join('')}
            <tr style="background-color: #f0f0f0; font-weight: bold;">
              <td colspan="4" style="border: 2px solid black; text-align: right;" class="font-bold">
                TOTAL RÈGLEMENTS À VENIR :
              </td>
              <td style="border: 2px solid black;" class="text-right font-bold">${calculsData.totalReglementsAVenir.toFixed(2)} €</td>
              <td style="border: 2px solid black;" class="text-center font-bold">${calculsData.nbChequesTotal} chèques</td>
            </tr>
          </tbody>
        </table>
      </div>
      ` : ''}

      <div style="margin-bottom: 40px;">
        <h3 style="font-size: 20px; font-weight: bold; margin-bottom: 15px; padding-bottom: 5px; border-bottom: 2px solid black;">
          RÉPARTITION PAR MODE DE PAIEMENT
        </h3>
        <table>
          <thead>
            <tr style="background-color: #f0f0f0;">
              <th>MODE DE PAIEMENT</th>
              <th class="text-right">MONTANT (€)</th>
              <th class="text-center">%</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td class="font-bold">CARTE BANCAIRE</td>
              <td class="text-right font-bold">${calculsData.parPaiement.carte.toFixed(2)}</td>
              <td class="text-center">${calculsData.caTotal > 0 ? ((calculsData.parPaiement.carte / calculsData.caTotal) * 100).toFixed(1) : '0.0'}%</td>
            </tr>
            <tr>
              <td class="font-bold">ESPÈCES</td>
              <td class="text-right font-bold">${calculsData.parPaiement.especes.toFixed(2)}</td>
              <td class="text-center">${calculsData.caTotal > 0 ? ((calculsData.parPaiement.especes / calculsData.caTotal) * 100).toFixed(1) : '0.0'}%</td>
            </tr>
            <tr>
              <td class="font-bold">CHÈQUE</td>
              <td class="text-right font-bold">${calculsData.parPaiement.cheque.toFixed(2)}</td>
              <td class="text-center">${calculsData.caTotal > 0 ? ((calculsData.parPaiement.cheque / calculsData.caTotal) * 100).toFixed(1) : '0.0'}%</td>
            </tr>
            <tr>
              <td class="font-bold">MIXTE</td>
              <td class="text-right font-bold">${calculsData.parPaiement.mixte.toFixed(2)}</td>
              <td class="text-center">${calculsData.caTotal > 0 ? ((calculsData.parPaiement.mixte / calculsData.caTotal) * 100).toFixed(1) : '0.0'}%</td>
            </tr>
            <tr style="background-color: #f0f0f0; font-weight: bold;">
              <td style="border: 2px solid black;" class="font-bold">TOTAL</td>
              <td style="border: 2px solid black;" class="text-right font-bold">${calculsData.caTotal.toFixed(2)}</td>
              <td style="border: 2px solid black;" class="text-center font-bold">100.0%</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div style="margin-top: 60px; padding-top: 30px; border-top: 2px solid black;">
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 60px;">
          <div>
            <p style="margin-bottom: 30px; font-size: 16px; font-weight: bold;">RESPONSABLE DE CAISSE :</p>
            <div style="border-bottom: 2px solid black; height: 40px; margin-bottom: 10px;"></div>
            <p style="margin: 0; font-size: 14px;">Signature et date</p>
          </div>
          <div>
            <p style="margin-bottom: 15px; font-size: 16px; font-weight: bold;">CLÔTURE :</p>
            <p style="margin: 0; font-size: 18px; font-weight: bold;">${new Date().toLocaleString('fr-FR', {
              day: '2-digit',
              month: '2-digit', 
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}</p>
          </div>
        </div>
      </div>
    </body>
    </html>
    `;
  };

  const envoyerEmail = () => {
    // Générer le contenu de l'email avec les données de la feuille de caisse
    const dateJour = new Date().toLocaleDateString('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });

    let contenuEmail = `MYCONFORT - FEUILLE DE CAISSE\n`;
    contenuEmail += `${dateJour.toUpperCase()}\n\n`;
    
    contenuEmail += `RÉSUMÉ DU JOUR :\n`;
    contenuEmail += `- Chiffre d'affaires : ${calculs.caTotal.toFixed(2)} €\n`;
    contenuEmail += `- Nombre de ventes : ${calculs.nbVentesTotal}\n`;
    contenuEmail += `- Ticket moyen : ${calculs.ticketMoyen.toFixed(2)} €\n`;
    contenuEmail += `- Vendeuses actives : ${calculs.vendeusesActives}\n\n`;

    contenuEmail += `DÉTAIL PAR VENDEUSE :\n`;
    calculs.vendeusesAvecDetail
      .filter(v => v.totalCalcule > 0)
      .sort((a, b) => b.totalCalcule - a.totalCalcule)
      .forEach(vendeur => {
        contenuEmail += `${vendeur.name} : ${vendeur.totalCalcule.toFixed(2)} € (${vendeur.nbVentesCalcule} ventes)\n`;
        contenuEmail += `  • Carte : ${vendeur.detailPaiements.carte.toFixed(2)} €\n`;
        contenuEmail += `  • Espèces : ${vendeur.detailPaiements.especes.toFixed(2)} €\n`;
        contenuEmail += `  • Chèque : ${vendeur.detailPaiements.cheque.toFixed(2)} €\n`;
        if (vendeur.detailPaiements.mixte > 0) {
          contenuEmail += `  • Mixte : ${vendeur.detailPaiements.mixte.toFixed(2)} €\n`;
        }
        contenuEmail += `\n`;
      });

    contenuEmail += `TOTAUX PAR MODE DE PAIEMENT :\n`;
    contenuEmail += `- Carte bancaire : ${calculs.parPaiement.carte.toFixed(2)} €\n`;
    contenuEmail += `- Espèces : ${calculs.parPaiement.especes.toFixed(2)} €\n`;
    contenuEmail += `- Chèque : ${calculs.parPaiement.cheque.toFixed(2)} €\n`;
    contenuEmail += `- Mixte : ${calculs.parPaiement.mixte.toFixed(2)} €\n\n`;
    
    contenuEmail += `RÈGLEMENTS À VENIR (FACTURIER) :\n`;
    contenuEmail += `Total attendu : ${calculs.totalReglementsAVenir.toFixed(2)} € (${calculs.nbChequesTotal} chèques)\n\n`;
    reglementsAVenir.forEach(reglement => {
      const totalClient = reglement.nbCheques * reglement.montantCheque;
      contenuEmail += `${reglement.vendorName} - ${reglement.clientName} :\n`;
      contenuEmail += `  ${reglement.nbCheques} chèques de ${reglement.montantCheque.toFixed(2)} € = ${totalClient.toFixed(2)} €\n`;
      contenuEmail += `  Prochain échéance : ${new Date(reglement.dateProchain).toLocaleDateString('fr-FR')}\n\n`;
    });
    
    contenuEmail += `Rapport généré automatiquement le ${new Date().toLocaleString('fr-FR')}\n`;
    contenuEmail += `MyConfort - Système de caisse`;

    // Construire l'URL mailto
    const sujet = `MyConfort - Feuille de caisse du ${new Date().toLocaleDateString('fr-FR')}`;
    const mailtoUrl = `mailto:?subject=${encodeURIComponent(sujet)}&body=${encodeURIComponent(contenuEmail)}`;
    
    // Ouvrir le client email par défaut
    window.location.href = mailtoUrl;
  };

  const effectuerRAZ = () => {
    if (window.confirm('⚠️ ATTENTION ⚠️\n\nCette action va supprimer DÉFINITIVEMENT toutes les données du jour :\n- Toutes les ventes\n- Tous les totaux\n- Toutes les statistiques\n\nAvez-vous imprimé la feuille de caisse ?\n\nConfirmer la REMISE À ZÉRO ?')) {
      executeRAZ();
    }
  };

  return (
    <div style={{ fontFamily: 'Arial, sans-serif' }}>
      {/* ===== INTERFACE UTILISATEUR (masquée à l'impression) ===== */}
      <div className="no-print" style={{ padding: '20px', backgroundColor: '#f5f5f5', minHeight: '100vh' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          {/* En-tête */}
          <div style={{ 
            textAlign: 'center', 
            marginBottom: '30px', 
            padding: '20px', 
            backgroundColor: '#477A0C', 
            color: 'white', 
            borderRadius: '10px' 
          }}>
            <h1 style={{ margin: '0', fontSize: '2.5em', fontWeight: 'bold' }}>
              📋 FEUILLE DE CAISSE MYCONFORT
            </h1>
            <p style={{ margin: '10px 0 0 0', fontSize: '1.2em' }}>
              {new Date().toLocaleDateString('fr-FR', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                year: 'numeric'
              })}
            </p>
          </div>

          {/* Résumé rapide avec distinction Caisse/Facturier */}
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', 
            gap: '20px', 
            marginBottom: '30px' 
          }}>
            <div style={{ 
              backgroundColor: 'white', 
              padding: '20px', 
              borderRadius: '10px', 
              textAlign: 'center', 
              boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
              border: '3px solid #477A0C'
            }}>
              <h3 style={{ margin: '0 0 10px 0', color: '#477A0C' }}>💰 CA TOTAL</h3>
              <p style={{ margin: '0', fontSize: '2em', fontWeight: 'bold', color: '#477A0C' }}>
                {calculs.caTotal.toFixed(2)} €
              </p>
              <div style={{ marginTop: '10px', fontSize: '0.9em', color: '#666' }}>
                <span style={{ marginRight: '10px' }}>
                  📱 Caisse: {calculs.caisseTotal.toFixed(2)}€
                </span>
                <span>
                  📋 Facturier: {calculs.facturierTotal.toFixed(2)}€
                </span>
              </div>
            </div>
            
            <div style={{ 
              backgroundColor: 'white', 
              padding: '20px', 
              borderRadius: '10px', 
              textAlign: 'center', 
              boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
              border: '3px solid #C4D144'
            }}>
              <h3 style={{ margin: '0 0 10px 0', color: '#14281D' }}>🛒 VENTES TOTALES</h3>
              <p style={{ margin: '0', fontSize: '2em', fontWeight: 'bold', color: '#14281D' }}>
                {calculs.nbVentesTotal}
              </p>
              <div style={{ marginTop: '10px', fontSize: '0.9em', color: '#666' }}>
                <span style={{ marginRight: '10px' }}>
                  📱 Caisse: {calculs.caisseNbVentes}
                </span>
                <span>
                  📋 Facturier: {calculs.facturierNbVentes}
                </span>
              </div>
            </div>

            <div style={{ 
              backgroundColor: 'white', 
              padding: '20px', 
              borderRadius: '10px', 
              textAlign: 'center', 
              boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
              border: '3px solid #E8E3D3'
            }}>
              <h3 style={{ margin: '0 0 10px 0', color: '#14281D' }}>📱 VENTES CAISSE</h3>
              <p style={{ margin: '0', fontSize: '1.8em', fontWeight: 'bold', color: '#14281D' }}>
                {calculs.caisseTotal.toFixed(2)} €
              </p>
              <div style={{ marginTop: '8px', fontSize: '0.85em', color: '#666' }}>
                <div>{calculs.caisseNbVentes} vente{calculs.caisseNbVentes > 1 ? 's' : ''}</div>
                <div>Ticket moyen: {calculs.caisseTicketMoyen.toFixed(2)}€</div>
              </div>
            </div>

            <div style={{ 
              backgroundColor: 'white', 
              padding: '20px', 
              borderRadius: '10px', 
              textAlign: 'center', 
              boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
              border: '3px solid #E3F2FD'
            }}>
              <h3 style={{ margin: '0 0 10px 0', color: '#1976D2' }}>📋 VENTES FACTURIER</h3>
              <p style={{ margin: '0', fontSize: '1.8em', fontWeight: 'bold', color: '#1976D2' }}>
                {calculs.facturierTotal.toFixed(2)} €
              </p>
              <div style={{ marginTop: '8px', fontSize: '0.85em', color: '#666' }}>
                <div>{calculs.facturierNbVentes} facture{calculs.facturierNbVentes > 1 ? 's' : ''}</div>
                <div>Ticket moyen: {calculs.facturierTicketMoyen.toFixed(2)}€</div>
              </div>
            </div>
            
            <div style={{ 
              backgroundColor: 'white', 
              padding: '20px', 
              borderRadius: '10px', 
              textAlign: 'center', 
              boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
              border: '3px solid #F55D3E'
            }}>
              <h3 style={{ margin: '0 0 10px 0', color: '#F55D3E' }}>👥 VENDEUSES</h3>
              <p style={{ margin: '0', fontSize: '2em', fontWeight: 'bold', color: '#F55D3E' }}>
                {calculs.vendeusesActives}
              </p>
            </div>
            
            <div style={{ 
              backgroundColor: 'white', 
              padding: '20px', 
              borderRadius: '10px', 
              textAlign: 'center', 
              boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
              border: '3px solid #D68FD6'
            }}>
              <h3 style={{ margin: '0 0 10px 0', color: '#14281D' }}>📅 RÈGLEMENTS À VENIR</h3>
              <p style={{ margin: '0', fontSize: '1.5em', fontWeight: 'bold', color: '#14281D' }}>
                {calculs.totalReglementsAVenir.toFixed(2)} €
              </p>
              <p style={{ margin: '5px 0 0 0', fontSize: '0.9em', color: '#6B7280' }}>
                {calculs.nbClientsAttente} clients • {calculs.nbChequesTotal} chèques
              </p>
            </div>
          </div>

          {/* Boutons d'action */}
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
            gap: '15px', 
            marginBottom: '30px' 
          }}>
            <button
              onClick={() => setModeApercu(!modeApercu)}
              style={{
                padding: '15px 25px',
                fontSize: '1.1em',
                fontWeight: 'bold',
                backgroundColor: modeApercu ? '#89BBFE' : '#14281D',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px'
              }}
            >
              {modeApercu ? <EyeOff size={20} /> : <Eye size={20} />}
              {modeApercu ? 'Masquer l\'aperçu' : 'Voir la feuille'}
            </button>

            <button
              onClick={imprimer}
              style={{
                padding: '15px 25px',
                fontSize: '1.1em',
                fontWeight: 'bold',
                backgroundColor: '#477A0C',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px'
              }}
            >
              <Printer size={20} />
              Imprimer
            </button>

            <button
              onClick={envoyerEmail}
              style={{
                padding: '15px 25px',
                fontSize: '1.1em',
                fontWeight: 'bold',
                backgroundColor: '#C4D144',
                color: '#14281D',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px'
              }}
            >
              <Mail size={20} />
              Envoyer par Email
            </button>

            <button
              onClick={exportDataBeforeReset}
              style={{
                padding: '15px 25px',
                fontSize: '1.1em',
                fontWeight: 'bold',
                backgroundColor: '#1d4ed8',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px'
              }}
            >
              <Download size={20} />
              Sauvegarde
            </button>

            <button
              onClick={effectuerRAZ}
              style={{
                padding: '15px 25px',
                fontSize: '1.1em',
                fontWeight: 'bold',
                backgroundColor: '#DC2626',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px'
              }}
            >
              <RefreshCw size={20} />
              RAZ
            </button>
          </div>

          {/* Zone d'aperçu */}
          {modeApercu && (
            <div style={{
              backgroundColor: 'white',
              padding: '20px',
              borderRadius: '10px',
              boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
              border: '2px dashed #477A0C'
            }}>
              <h2 style={{ textAlign: 'center', color: '#477A0C', marginBottom: '20px' }}>
                📄 APERÇU DE LA FEUILLE DE CAISSE
              </h2>
              <div id="feuille-imprimable">
                <FeuilleImprimable calculs={calculs} />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ===== FEUILLE IMPRIMABLE (visible uniquement à l'impression) ===== */}
      <div className="print-only">
        <FeuilleImprimable calculs={calculs} />
      </div>

      {/* ===== STYLES CSS OPTIMISÉS POUR IMPRESSION ===== */}
      <style dangerouslySetInnerHTML={{
        __html: `
          /* ===== SÉPARATION ÉCRAN / IMPRESSION ===== */
          @media print {
            /* Masquer TOTALEMENT l'interface iPad */
            .no-print { 
              display: none !important; 
              visibility: hidden !important;
            }
            
            /* Afficher UNIQUEMENT la feuille imprimable */
            .print-only { 
              display: block !important; 
              visibility: visible !important;
            }
            
            /* Reset complet pour impression pure */
            * {
              color-adjust: exact !important;
              -webkit-print-color-adjust: exact !important;
            }
            
            body {
              margin: 0 !important;
              padding: 0 !important;
              background: white !important;
              color: black !important;
              font-family: Arial, sans-serif !important;
              font-size: 12pt !important;
              line-height: 1.2 !important;
            }
            
            /* Format A4 professionnel */
            @page {
              size: A4 portrait;
              margin: 15mm 15mm 15mm 15mm;
              background: white;
              
              @top-center {
                content: "MyConfort - Feuille de caisse";
              }
              
              @bottom-right {
                content: "Page " counter(page);
              }
            }
            
            /* Optimisation des tableaux pour impression */
            table {
              page-break-inside: auto !important;
              border-collapse: collapse !important;
              width: 100% !important;
            }
            
            tr {
              page-break-inside: avoid !important;
              page-break-after: auto !important;
            }
            
            thead {
              display: table-header-group !important;
            }
            
            /* Éviter les sauts de page dans les sections critiques */
            .print-section {
              page-break-inside: avoid !important;
              margin-bottom: 20pt !important;
            }
            
            /* Titres et en-têtes optimisés */
            h1, h2, h3 {
              page-break-after: avoid !important;
              color: black !important;
              font-weight: bold !important;
            }
            
            /* Supprimer les ombres et effets pour l'impression */
            * {
              box-shadow: none !important;
              text-shadow: none !important;
              background-image: none !important;
            }
          }
          
          /* ===== AFFICHAGE ÉCRAN NORMAL ===== */
          @media screen {
            .print-only { 
              display: none; 
            }
            .no-print { 
              display: block; 
            }
          }
          
          /* ===== STYLES GÉNÉRAUX POUR L'APERÇU ===== */
          .feuille-apercu {
            background: white;
            box-shadow: 0 4px 20px rgba(0,0,0,0.15);
            border: 1px solid #ddd;
            border-radius: 8px;
            overflow: hidden;
            max-width: 210mm;
            margin: 0 auto;
          }
          
          .feuille-apercu .print-content {
            transform: scale(0.8);
            transform-origin: top center;
            padding: 20px;
          }
        `
      }} />
    </div>
  );
}

interface VendeusesAvecDetail extends Vendor {
  detailPaiements: {
    carte: number;
    especes: number;
    cheque: number;
    mixte: number;
  };
  totalCalcule: number;
  nbVentesCalcule: number;
}

interface FeuilleImprimableProps {
  calculs: {
    parPaiement: {
      carte: number;
      especes: number;
      cheque: number;
      mixte: number;
    };
    caTotal: number;
    nbVentesTotal: number;
    ticketMoyen: number;
    vendeusesActives: number;
    vendeusesAvecDetail: VendeusesAvecDetail[];
    totalReglementsAVenir: number;
    nbClientsAttente: number;
    nbChequesTotal: number;
  };
}

function FeuilleImprimable({ calculs }: FeuilleImprimableProps) {
  return (
    <div style={{ 
      backgroundColor: 'white', 
      color: 'black', 
      padding: '30px', 
      fontFamily: 'Arial, sans-serif',
      fontSize: '12pt',
      lineHeight: '1.3',
      maxWidth: '180mm',
      margin: '0 auto',
      minHeight: '250mm'
    }}>
      {/* ===== EN-TÊTE ===== */}
      <div className="print-section" style={{ 
        textAlign: 'center', 
        marginBottom: '30px', 
        paddingBottom: '15px', 
        borderBottom: '3px solid black' 
      }}>
        <h1 style={{ 
          margin: '0', 
          fontSize: '28pt', 
          fontWeight: 'bold', 
          letterSpacing: '2px',
          color: 'black'
        }}>
          MYCONFORT
        </h1>
        <h2 style={{ 
          margin: '8px 0', 
          fontSize: '20pt', 
          fontWeight: 'bold',
          color: 'black'
        }}>
          FEUILLE DE CAISSE
        </h2>
        <p style={{ 
          margin: '0', 
          fontSize: '14pt', 
          fontWeight: 'bold',
          color: 'black'
        }}>
          {new Date().toLocaleDateString('fr-FR', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric'
          }).toUpperCase()}
        </p>
      </div>

      {/* ===== TOTAUX GÉNÉRAUX ===== */}
      <div className="print-section" style={{ 
        display: 'grid', 
        gridTemplateColumns: '1fr 1fr 1fr 1fr', 
        gap: '15px', 
        marginBottom: '30px' 
      }}>
        <div style={{ 
          textAlign: 'center', 
          padding: '15px', 
          border: '2px solid black',
          backgroundColor: '#f8f8f8'
        }}>
          <h3 style={{ margin: '0 0 8px 0', fontSize: '14pt', fontWeight: 'bold', color: 'black' }}>
            CHIFFRE D'AFFAIRES
          </h3>
          <p style={{ 
            margin: '0', 
            fontSize: '22pt', 
            fontWeight: 'bold',
            color: 'black'
          }}>
            {calculs.caTotal.toFixed(2)} €
          </p>
        </div>
        
        <div style={{ 
          textAlign: 'center', 
          padding: '15px', 
          border: '2px solid black',
          backgroundColor: '#f8f8f8'
        }}>
          <h3 style={{ margin: '0 0 8px 0', fontSize: '14pt', fontWeight: 'bold', color: 'black' }}>
            NOMBRE DE VENTES
          </h3>
          <p style={{ 
            margin: '0', 
            fontSize: '22pt', 
            fontWeight: 'bold',
            color: 'black'
          }}>
            {calculs.nbVentesTotal}
          </p>
        </div>
        
        <div style={{ 
          textAlign: 'center', 
          padding: '15px', 
          border: '2px solid black',
          backgroundColor: '#f8f8f8'
        }}>
          <h3 style={{ margin: '0 0 8px 0', fontSize: '14pt', fontWeight: 'bold', color: 'black' }}>
            TICKET MOYEN
          </h3>
          <p style={{ 
            margin: '0', 
            fontSize: '22pt', 
            fontWeight: 'bold',
            color: 'black'
          }}>
            {calculs.ticketMoyen.toFixed(2)} €
          </p>
        </div>
        
        <div style={{ 
          textAlign: 'center', 
          padding: '15px', 
          border: '2px solid black',
          backgroundColor: '#f8f8f8'
        }}>
          <h3 style={{ margin: '0 0 8px 0', fontSize: '14pt', fontWeight: 'bold', color: 'black' }}>
            RÈGLEMENTS À VENIR
          </h3>
          <p style={{ 
            margin: '0', 
            fontSize: '18pt', 
            fontWeight: 'bold',
            color: 'black'
          }}>
            {calculs.totalReglementsAVenir.toFixed(2)} €
          </p>
          <p style={{ 
            margin: '5px 0 0 0', 
            fontSize: '11pt',
            color: 'black'
          }}>
            {calculs.nbChequesTotal} chèques
          </p>
        </div>
      </div>

      {/* ===== TABLEAU VENDEUSES ===== */}
      <div className="print-section" style={{ marginBottom: '30px' }}>
        <h3 style={{ 
          fontSize: '16pt', 
          fontWeight: 'bold', 
          marginBottom: '12px', 
          paddingBottom: '4px', 
          borderBottom: '2px solid black',
          color: 'black'
        }}>
          CHIFFRE D'AFFAIRES PAR VENDEUSE ET MODE DE PAIEMENT
        </h3>
        
        <table style={{ 
          width: '100%', 
          borderCollapse: 'collapse', 
          border: '2px solid black',
          fontSize: '10pt'
        }}>
          <thead>
            <tr style={{ backgroundColor: '#e8e8e8' }}>
              <th style={{ 
                border: '1px solid black', 
                padding: '6px', 
                textAlign: 'left', 
                fontSize: '11pt', 
                fontWeight: 'bold',
                color: 'black'
              }}>
                VENDEUSE
              </th>
              <th style={{ 
                border: '1px solid black', 
                padding: '6px', 
                textAlign: 'center', 
                fontSize: '11pt', 
                fontWeight: 'bold',
                color: 'black'
              }}>
                NB
              </th>
              <th style={{ 
                border: '1px solid black', 
                padding: '6px', 
                textAlign: 'right', 
                fontSize: '11pt', 
                fontWeight: 'bold',
                color: 'black'
              }}>
                CARTE (€)
              </th>
              <th style={{ 
                border: '1px solid black', 
                padding: '6px', 
                textAlign: 'right', 
                fontSize: '11pt', 
                fontWeight: 'bold',
                color: 'black'
              }}>
                ESPÈCES (€)
              </th>
              <th style={{ 
                border: '1px solid black', 
                padding: '6px', 
                textAlign: 'right', 
                fontSize: '11pt', 
                fontWeight: 'bold',
                color: 'black'
              }}>
                CHÈQUE (€)
              </th>
              <th style={{ 
                border: '1px solid black', 
                padding: '6px', 
                textAlign: 'right', 
                fontSize: '11pt', 
                fontWeight: 'bold',
                color: 'black'
              }}>
                MIXTE (€)
              </th>
              <th style={{ 
                border: '1px solid black', 
                padding: '6px', 
                textAlign: 'right', 
                fontSize: '11pt', 
                fontWeight: 'bold',
                color: 'black'
              }}>
                TOTAL (€)
              </th>
            </tr>
          </thead>
          <tbody>
            {calculs.vendeusesAvecDetail
              .filter(v => v.totalCalcule > 0)
              .sort((a, b) => b.totalCalcule - a.totalCalcule)
              .map((vendeur) => (
                <tr key={vendeur.id}>
                  <td style={{ 
                    border: '1px solid black', 
                    padding: '6px', 
                    fontSize: '10pt', 
                    fontWeight: 'bold',
                    color: 'black'
                  }}>
                    {vendeur.name}
                  </td>
                  <td style={{ 
                    border: '1px solid black', 
                    padding: '6px', 
                    textAlign: 'center', 
                    fontSize: '10pt',
                    color: 'black'
                  }}>
                    {vendeur.nbVentesCalcule}
                  </td>
                  <td style={{ 
                    border: '1px solid black', 
                    padding: '6px', 
                    textAlign: 'right', 
                    fontSize: '10pt', 
                    fontWeight: 'bold',
                    color: 'black'
                  }}>
                    {vendeur.detailPaiements.carte > 0 ? vendeur.detailPaiements.carte.toFixed(2) : '-'}
                  </td>
                  <td style={{ 
                    border: '1px solid black', 
                    padding: '6px', 
                    textAlign: 'right', 
                    fontSize: '10pt', 
                    fontWeight: 'bold',
                    color: 'black'
                  }}>
                    {vendeur.detailPaiements.especes > 0 ? vendeur.detailPaiements.especes.toFixed(2) : '-'}
                  </td>
                  <td style={{ 
                    border: '1px solid black', 
                    padding: '6px', 
                    textAlign: 'right', 
                    fontSize: '10pt', 
                    fontWeight: 'bold',
                    color: 'black'
                  }}>
                    {vendeur.detailPaiements.cheque > 0 ? vendeur.detailPaiements.cheque.toFixed(2) : '-'}
                  </td>
                  <td style={{ 
                    border: '1px solid black', 
                    padding: '6px', 
                    textAlign: 'right', 
                    fontSize: '10pt', 
                    fontWeight: 'bold',
                    color: 'black'
                  }}>
                    {vendeur.detailPaiements.mixte > 0 ? vendeur.detailPaiements.mixte.toFixed(2) : '-'}
                  </td>
                  <td style={{ 
                    border: '1px solid black', 
                    padding: '6px', 
                    textAlign: 'right', 
                    fontSize: '10pt', 
                    fontWeight: 'bold',
                    backgroundColor: '#f5f5f5',
                    color: 'black'
                  }}>
                    {vendeur.totalCalcule.toFixed(2)}
                  </td>
                </tr>
              ))}
            <tr style={{ backgroundColor: '#d8d8d8', fontWeight: 'bold' }}>
              <td style={{ 
                border: '2px solid black', 
                padding: '6px', 
                fontSize: '11pt', 
                fontWeight: 'bold',
                color: 'black'
              }}>
                TOTAL
              </td>
              <td style={{ 
                border: '2px solid black', 
                padding: '6px', 
                textAlign: 'center', 
                fontSize: '11pt', 
                fontWeight: 'bold',
                color: 'black'
              }}>
                {calculs.nbVentesTotal}
              </td>
              <td style={{ 
                border: '2px solid black', 
                padding: '6px', 
                textAlign: 'right', 
                fontSize: '11pt', 
                fontWeight: 'bold',
                color: 'black'
              }}>
                {calculs.parPaiement.carte.toFixed(2)}
              </td>
              <td style={{ 
                border: '2px solid black', 
                padding: '6px', 
                textAlign: 'right', 
                fontSize: '11pt', 
                fontWeight: 'bold',
                color: 'black'
              }}>
                {calculs.parPaiement.especes.toFixed(2)}
              </td>
              <td style={{ 
                border: '2px solid black', 
                padding: '6px', 
                textAlign: 'right', 
                fontSize: '11pt', 
                fontWeight: 'bold',
                color: 'black'
              }}>
                {calculs.parPaiement.cheque.toFixed(2)}
              </td>
              <td style={{ 
                border: '2px solid black', 
                padding: '6px', 
                textAlign: 'right', 
                fontSize: '11pt', 
                fontWeight: 'bold',
                color: 'black'
              }}>
                {calculs.parPaiement.mixte.toFixed(2)}
              </td>
              <td style={{ 
                border: '2px solid black', 
                padding: '6px', 
                textAlign: 'right', 
                fontSize: '11pt', 
                fontWeight: 'bold',
                color: 'black'
              }}>
                {calculs.caTotal.toFixed(2)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* ===== TABLEAU RÈGLEMENTS À VENIR ===== */}
      <div className="print-section" style={{ marginBottom: '30px' }}>
        <h3 style={{ 
          fontSize: '16pt', 
          fontWeight: 'bold', 
          marginBottom: '12px', 
          paddingBottom: '4px', 
          borderBottom: '2px solid black',
          color: 'black'
        }}>
          RÈGLEMENTS À VENIR (FACTURIER)
        </h3>
        
        {reglementsAVenir.length > 0 ? (
          <>
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: '1fr 1fr 1fr', 
              gap: '15px', 
              marginBottom: '20px',
              textAlign: 'center' 
            }}>
              <div style={{ 
                padding: '10px', 
                backgroundColor: '#e8e8e8', 
                border: '1px solid black',
                fontWeight: 'bold'
              }}>
                TOTAL ATTENDU<br/>
                <span style={{ fontSize: '14pt', color: 'black' }}>
                  {calculs.totalReglementsAVenir.toFixed(2)} €
                </span>
              </div>
              <div style={{ 
                padding: '10px', 
                backgroundColor: '#e8e8e8', 
                border: '1px solid black',
                fontWeight: 'bold'
              }}>
                CLIENTS EN ATTENTE<br/>
                <span style={{ fontSize: '14pt', color: 'black' }}>
                  {calculs.nbClientsAttente}
                </span>
              </div>
              <div style={{ 
                padding: '10px', 
                backgroundColor: '#e8e8e8', 
                border: '1px solid black',
                fontWeight: 'bold'
              }}>
                CHÈQUES TOTAUX<br/>
                <span style={{ fontSize: '14pt', color: 'black' }}>
                  {calculs.nbChequesTotal}
                </span>
              </div>
            </div>

            <table style={{ 
              width: '100%', 
              borderCollapse: 'collapse', 
              border: '2px solid black',
              fontSize: '10pt'
            }}>
              <thead>
                <tr style={{ backgroundColor: '#e8e8e8' }}>
                  <th style={{ 
                    border: '1px solid black', 
                    padding: '6px', 
                    textAlign: 'left', 
                    fontSize: '11pt', 
                    fontWeight: 'bold',
                    color: 'black'
                  }}>
                    VENDEUSE
                  </th>
                  <th style={{ 
                    border: '1px solid black', 
                    padding: '6px', 
                    textAlign: 'left', 
                    fontSize: '11pt', 
                    fontWeight: 'bold',
                    color: 'black'
                  }}>
                    CLIENT
                  </th>
                  <th style={{ 
                    border: '1px solid black', 
                    padding: '6px', 
                    textAlign: 'center', 
                    fontSize: '11pt', 
                    fontWeight: 'bold',
                    color: 'black'
                  }}>
                    NB CHÈQUES
                  </th>
                  <th style={{ 
                    border: '1px solid black', 
                    padding: '6px', 
                    textAlign: 'right', 
                    fontSize: '11pt', 
                    fontWeight: 'bold',
                    color: 'black'
                  }}>
                    MONTANT/CHÈQUE
                  </th>
                  <th style={{ 
                    border: '1px solid black', 
                    padding: '6px', 
                    textAlign: 'right', 
                    fontSize: '11pt', 
                    fontWeight: 'bold',
                    color: 'black'
                  }}>
                    TOTAL CLIENT
                  </th>
                  <th style={{ 
                    border: '1px solid black', 
                    padding: '6px', 
                    textAlign: 'center', 
                    fontSize: '11pt', 
                    fontWeight: 'bold',
                    color: 'black'
                  }}>
                    PROCHAINE ÉCHÉANCE
                  </th>
                </tr>
              </thead>
              <tbody>
                {reglementsAVenir
                  .sort((a, b) => a.vendorName.localeCompare(b.vendorName))
                  .map((reglement, index) => {
                    const totalClient = reglement.nbCheques * reglement.montantCheque;
                    return (
                      <tr key={index}>
                        <td style={{ 
                          border: '1px solid black', 
                          padding: '6px', 
                          fontSize: '10pt', 
                          fontWeight: 'bold',
                          color: 'black'
                        }}>
                          {reglement.vendorName}
                        </td>
                        <td style={{ 
                          border: '1px solid black', 
                          padding: '6px', 
                          fontSize: '10pt',
                          color: 'black'
                        }}>
                          {reglement.clientName}
                        </td>
                        <td style={{ 
                          border: '1px solid black', 
                          padding: '6px', 
                          textAlign: 'center', 
                          fontSize: '10pt', 
                          fontWeight: 'bold',
                          color: 'black'
                        }}>
                          {reglement.nbCheques}
                        </td>
                        <td style={{ 
                          border: '1px solid black', 
                          padding: '6px', 
                          textAlign: 'right', 
                          fontSize: '10pt', 
                          fontWeight: 'bold',
                          color: 'black'
                        }}>
                          {reglement.montantCheque.toFixed(2)} €
                        </td>
                        <td style={{ 
                          border: '1px solid black', 
                          padding: '6px', 
                          textAlign: 'right', 
                          fontSize: '10pt', 
                          fontWeight: 'bold',
                          backgroundColor: '#f5f5f5',
                          color: 'black'
                        }}>
                          {totalClient.toFixed(2)} €
                        </td>
                        <td style={{ 
                          border: '1px solid black', 
                          padding: '6px', 
                          textAlign: 'center', 
                          fontSize: '9pt',
                          color: 'black'
                        }}>
                          {new Date(reglement.dateProchain).toLocaleDateString('fr-FR')}
                        </td>
                      </tr>
                    );
                  })}
                <tr style={{ backgroundColor: '#d8d8d8', fontWeight: 'bold' }}>
                  <td colSpan={4} style={{ 
                    border: '2px solid black', 
                    padding: '6px', 
                    fontSize: '11pt', 
                    fontWeight: 'bold',
                    textAlign: 'right',
                    color: 'black'
                  }}>
                    TOTAL RÈGLEMENTS À VENIR :
                  </td>
                  <td style={{ 
                    border: '2px solid black', 
                    padding: '6px', 
                    textAlign: 'right', 
                    fontSize: '11pt', 
                    fontWeight: 'bold',
                    color: 'black'
                  }}>
                    {calculs.totalReglementsAVenir.toFixed(2)} €
                  </td>
                  <td style={{ 
                    border: '2px solid black', 
                    padding: '6px', 
                    textAlign: 'center', 
                    fontSize: '10pt', 
                    fontWeight: 'bold',
                    color: 'black'
                  }}>
                    {calculs.nbChequesTotal} chèques
                  </td>
                </tr>
              </tbody>
            </table>
          </>
        ) : (
          <div style={{ 
            textAlign: 'center', 
            padding: '20px', 
            border: '1px solid black',
            backgroundColor: '#f9f9f9'
          }}>
            <p style={{ margin: '0', fontSize: '12pt', fontStyle: 'italic', color: 'black' }}>
              Aucun règlement en attente
            </p>
          </div>
        )}
      </div>

      {/* ===== TABLEAU MODES DE PAIEMENT ===== */}
      <div className="print-section" style={{ marginBottom: '30px' }}>
        <h3 style={{ 
          fontSize: '16pt', 
          fontWeight: 'bold', 
          marginBottom: '12px', 
          paddingBottom: '4px', 
          borderBottom: '2px solid black',
          color: 'black'
        }}>
          RÉPARTITION PAR MODE DE PAIEMENT
        </h3>
        
        <table style={{ 
          width: '100%', 
          borderCollapse: 'collapse', 
          border: '2px solid black' 
        }}>
          <thead>
            <tr style={{ backgroundColor: '#e8e8e8' }}>
              <th style={{ 
                border: '1px solid black', 
                padding: '10px', 
                textAlign: 'left', 
                fontSize: '12pt', 
                fontWeight: 'bold',
                color: 'black'
              }}>
                MODE DE PAIEMENT
              </th>
              <th style={{ 
                border: '1px solid black', 
                padding: '10px', 
                textAlign: 'right', 
                fontSize: '12pt', 
                fontWeight: 'bold',
                color: 'black'
              }}>
                MONTANT (€)
              </th>
              <th style={{ 
                border: '1px solid black', 
                padding: '10px', 
                textAlign: 'center', 
                fontSize: '12pt', 
                fontWeight: 'bold',
                color: 'black'
              }}>
                POURCENTAGE
              </th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={{ border: '1px solid black', padding: '10px', fontSize: '11pt', fontWeight: 'bold', color: 'black' }}>
                CARTE BANCAIRE
              </td>
              <td style={{ border: '1px solid black', padding: '10px', textAlign: 'right', fontSize: '11pt', fontWeight: 'bold', color: 'black' }}>
                {calculs.parPaiement.carte.toFixed(2)}
              </td>
              <td style={{ border: '1px solid black', padding: '10px', textAlign: 'center', fontSize: '11pt', color: 'black' }}>
                {calculs.caTotal > 0 ? ((calculs.parPaiement.carte / calculs.caTotal) * 100).toFixed(1) : '0.0'}%
              </td>
            </tr>
            <tr>
              <td style={{ border: '1px solid black', padding: '10px', fontSize: '11pt', fontWeight: 'bold', color: 'black' }}>
                ESPÈCES
              </td>
              <td style={{ border: '1px solid black', padding: '10px', textAlign: 'right', fontSize: '11pt', fontWeight: 'bold', color: 'black' }}>
                {calculs.parPaiement.especes.toFixed(2)}
              </td>
              <td style={{ border: '1px solid black', padding: '10px', textAlign: 'center', fontSize: '11pt', color: 'black' }}>
                {calculs.caTotal > 0 ? ((calculs.parPaiement.especes / calculs.caTotal) * 100).toFixed(1) : '0.0'}%
              </td>
            </tr>
            <tr>
              <td style={{ border: '1px solid black', padding: '10px', fontSize: '11pt', fontWeight: 'bold', color: 'black' }}>
                CHÈQUE
              </td>
              <td style={{ border: '1px solid black', padding: '10px', textAlign: 'right', fontSize: '11pt', fontWeight: 'bold', color: 'black' }}>
                {calculs.parPaiement.cheque.toFixed(2)}
              </td>
              <td style={{ border: '1px solid black', padding: '10px', textAlign: 'center', fontSize: '11pt', color: 'black' }}>
                {calculs.caTotal > 0 ? ((calculs.parPaiement.cheque / calculs.caTotal) * 100).toFixed(1) : '0.0'}%
              </td>
            </tr>
            <tr>
              <td style={{ border: '1px solid black', padding: '10px', fontSize: '11pt', fontWeight: 'bold', color: 'black' }}>
                MIXTE
              </td>
              <td style={{ border: '1px solid black', padding: '10px', textAlign: 'right', fontSize: '11pt', fontWeight: 'bold', color: 'black' }}>
                {calculs.parPaiement.mixte.toFixed(2)}
              </td>
              <td style={{ border: '1px solid black', padding: '10px', textAlign: 'center', fontSize: '11pt', color: 'black' }}>
                {calculs.caTotal > 0 ? ((calculs.parPaiement.mixte / calculs.caTotal) * 100).toFixed(1) : '0.0'}%
              </td>
            </tr>
            <tr style={{ backgroundColor: '#d8d8d8', fontWeight: 'bold' }}>
              <td style={{ border: '2px solid black', padding: '10px', fontSize: '12pt', fontWeight: 'bold', color: 'black' }}>
                TOTAL GÉNÉRAL
              </td>
              <td style={{ border: '2px solid black', padding: '10px', textAlign: 'right', fontSize: '12pt', fontWeight: 'bold', color: 'black' }}>
                {calculs.caTotal.toFixed(2)}
              </td>
              <td style={{ border: '2px solid black', padding: '10px', textAlign: 'center', fontSize: '12pt', fontWeight: 'bold', color: 'black' }}>
                100.0%
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* ===== PIED DE PAGE AVEC SIGNATURES ===== */}
      <div className="print-section" style={{ 
        marginTop: '40px', 
        paddingTop: '20px', 
        borderTop: '2px solid black' 
      }}>
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: '1fr 1fr', 
          gap: '40px' 
        }}>
          <div>
            <p style={{ 
              marginBottom: '20px', 
              fontSize: '12pt', 
              fontWeight: 'bold',
              color: 'black'
            }}>
              RESPONSABLE DE CAISSE :
            </p>
            <div style={{ 
              borderBottom: '2px solid black', 
              height: '30px', 
              marginBottom: '8px' 
            }}></div>
            <p style={{ 
              margin: '0', 
              fontSize: '10pt',
              color: 'black'
            }}>
              Signature et date
            </p>
          </div>
          
          <div>
            <p style={{ 
              marginBottom: '12px', 
              fontSize: '12pt', 
              fontWeight: 'bold',
              color: 'black'
            }}>
              CLÔTURE :
            </p>
            <p style={{ 
              margin: '0', 
              fontSize: '14pt', 
              fontWeight: 'bold',
              color: 'black'
            }}>
              {new Date().toLocaleString('fr-FR', {
                day: '2-digit',
                month: '2-digit', 
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default FeuilleDeRAZPro;
