/**
 * Service de génération automatique des tableaux de commission
 * Crée des tableaux vides à l'ouverture de session
 */

import { getDB } from '@/db/index';
import type { SessionDB, Vendor } from '@/types';

export interface DailyCommissionRow {
  date: string; // Format: "01/11"
  dateMs: number; // Timestamp pour tri
  cheque: number;
  cb: number;
  espece: number;
  total: number;
  isAboveThreshold: boolean; // >= 1500€
  salary: number; // 140€ ou 20%/17%
}

export interface VendorCommissionTable {
  vendorId: string;
  vendorName: string;
  commissionRate: number; // 20% ou 17% (Sylvie)
  dailyRows: DailyCommissionRow[];
  grandTotal: number;
  totalSalary: number;
  forfaitLogement: number; // 300€ ou 0€ (Sylvie)
  fraisTransport: number; // Modifiable manuellement
  netAPayer: number;
}

export class CommissionTableGenerator {
  /**
   * Générer les tableaux de commission vides pour une session
   * @param session Session active
   * @param vendors Liste des vendeuses actives
   * @returns Tableaux de commission pour chaque vendeuse
   */
  static async generateEmptyTables(
    session: SessionDB,
    vendors: Vendor[]
  ): Promise<VendorCommissionTable[]> {
    console.log('📊 Génération tableaux commission vides...');
    
    if (!session.eventStart || !session.eventEnd) {
      console.warn('⚠️ Session sans dates événement, impossible de générer tableaux');
      return [];
    }

    // Calculer le nombre de jours entre eventStart et eventEnd
    const startDate = new Date(session.eventStart);
    startDate.setHours(0, 0, 0, 0);
    
    const endDate = new Date(session.eventEnd);
    endDate.setHours(0, 0, 0, 0);
    
    const daysDiff = Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    
    console.log(`📅 Session: ${daysDiff} jours (${startDate.toLocaleDateString('fr-FR')} → ${endDate.toLocaleDateString('fr-FR')})`);

    const tables: VendorCommissionTable[] = [];

    // Générer un tableau pour chaque vendeuse
    for (const vendor of vendors) {
      const commissionRate = vendor.name === 'Sylvie' ? 17 : 20;
      const forfaitLogement = vendor.name === 'Sylvie' ? 0 : 300;

      // Générer les lignes vides pour chaque jour
      const dailyRows: DailyCommissionRow[] = [];
      
      for (let i = 0; i < daysDiff; i++) {
        const currentDate = new Date(startDate);
        currentDate.setDate(currentDate.getDate() + i);
        
        const dayRow: DailyCommissionRow = {
          date: currentDate.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }),
          dateMs: currentDate.getTime(),
          cheque: 0,
          cb: 0,
          espece: 0,
          total: 0,
          isAboveThreshold: false, // 0€ < 1500€
          salary: 140 // Salaire minimum par défaut
        };
        
        dailyRows.push(dayRow);
      }

      const table: VendorCommissionTable = {
        vendorId: vendor.id,
        vendorName: vendor.name,
        commissionRate,
        dailyRows,
        grandTotal: 0,
        totalSalary: daysDiff * 140, // 140€ par jour par défaut
        forfaitLogement,
        fraisTransport: 0,
        netAPayer: (daysDiff * 140) + forfaitLogement
      };

      tables.push(table);
      console.log(`✅ Tableau généré: ${vendor.name} (${daysDiff} jours)`);
    }

    return tables;
  }

  /**
   * Sauvegarder les tableaux dans IndexedDB (pour affichage dans Historique RAZ)
   * @param session Session active
   * @param tables Tableaux de commission
   */
  static async saveToHistory(
    session: SessionDB,
    tables: VendorCommissionTable[]
  ): Promise<void> {
    try {
      const db = await getDB();
      
      // Sauvegarder dans vendorCommissionArchives
      const archiveEntry = {
        id: `commission-${session.id}-${Date.now()}`,
        sessionId: session.id,
        sessionName: session.eventName || 'Session',
        sessionStart: session.eventStart || session.openedAt,
        sessionEnd: session.eventEnd || Date.now(),
        archivedAt: Date.now(),
        tables: JSON.stringify(tables), // Sérialiser les tableaux
        type: 'opening' // Type: 'opening' (ouverture) ou 'raz' (RAZ)
      };

      await db.table('vendorCommissionArchives').add(archiveEntry);
      console.log('✅ Tableaux sauvegardés dans historique (type: opening)');
    } catch (error) {
      console.error('❌ Erreur sauvegarde tableaux:', error);
      throw error;
    }
  }

  /**
   * Générer et sauvegarder les tableaux à l'ouverture de session
   * @param session Session nouvellement ouverte
   */
  static async generateAndSaveOnSessionOpen(session: SessionDB): Promise<void> {
    try {
      console.log('🚀 Auto-génération tableaux commission (ouverture session)...');
      
      // Récupérer les vendeuses actives
      const db = await getDB();
      const allVendors = await db.table('vendors').toArray();
      
      // Filtrer les vendeuses actives (même liste que RAZHistoryTab - SANS Billy)
      const activeVendorIds = ['1', '2', '3', '6', '8']; // Sylvie, Babette, Lucia, Sabrina, Karima (pas Billy)
      const activeVendors = allVendors.filter(v => {
        // Si le champ active existe, l'utiliser
        if (v.active !== undefined) {
          return v.active === true;
        }
        // Sinon, utiliser la liste en dur (rétrocompatibilité)
        return activeVendorIds.includes(v.id);
      });
      
      if (activeVendors.length === 0) {
        console.warn('⚠️ Aucune vendeuse active trouvée');
        return;
      }

      console.log(`📊 Génération tableaux pour ${activeVendors.length} vendeuses:`, activeVendors.map(v => v.name).join(', '));

      // Générer tableaux vides
      const tables = await this.generateEmptyTables(session, activeVendors);
      
      if (tables.length === 0) {
        console.warn('⚠️ Impossible de générer tableaux (dates session manquantes)');
        return;
      }

      // Sauvegarder dans historique
      await this.saveToHistory(session, tables);
      
      console.log(`✅ ${tables.length} tableaux générés et sauvegardés`);
    } catch (error) {
      console.error('❌ Erreur auto-génération tableaux:', error);
      // Ne pas bloquer l'ouverture de session en cas d'erreur
    }
  }
}

