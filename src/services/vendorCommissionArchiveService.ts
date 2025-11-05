/**
 * Service pour archiver et récupérer les tableaux de commission des vendeuses
 */
import { getDB } from '@/db/index';

export interface VendorDailyCommission {
  date: string;
  dateTimestamp: number;
  cheque: number;
  cb: number;
  espece: number;
  total: number;
  isAboveThreshold: boolean;
  salary: number;
}

export interface VendorCommissionArchive {
  vendorId: string;
  vendorName: string;
  dailyStats: VendorDailyCommission[];
  totalCheque: number;
  totalCB: number;
  totalEspece: number;
  grandTotal: number;
  totalSalary: number;
  housingFee: number;
  transportFee: number;
  netAmount: number;
  commissionRate: number;
}

export interface CommissionArchiveEntry {
  id: string; // session_TIMESTAMP
  sessionId: string;
  sessionName: string;
  sessionStart: number;
  sessionEnd: number;
  archivedAt: number;
  vendorCommissions: VendorCommissionArchive[];
  totalVentes: number;
  totalSalaires: number;
  totalFrais: number;
  totalNet: number;
}

class VendorCommissionArchiveService {
  private readonly TABLE_NAME = 'vendorCommissionArchives';

  /**
   * Sauvegarder les tableaux de commission d'une session
   */
  async saveCommissionArchive(entry: CommissionArchiveEntry): Promise<void> {
    try {
      const db = await getDB();
      
      // Vérifier si la table existe, sinon la créer
      if (!db.tables.some(t => t.name === this.TABLE_NAME)) {
        console.warn(`⚠️ Table ${this.TABLE_NAME} n'existe pas encore, elle sera créée à la prochaine version de la DB`);
      }
      
      await db.table(this.TABLE_NAME).put(entry);
      console.log(`✅ Tableaux de commission sauvegardés pour session ${entry.sessionId}`);
    } catch (error) {
      console.error('❌ Erreur sauvegarde tableaux commission:', error);
      throw error;
    }
  }

  /**
   * Récupérer tous les archives de tableaux de commission
   */
  async getAllArchives(): Promise<CommissionArchiveEntry[]> {
    try {
      const db = await getDB();
      
      if (!db.tables.some(t => t.name === this.TABLE_NAME)) {
        console.warn(`⚠️ Table ${this.TABLE_NAME} n'existe pas`);
        return [];
      }
      
      const archives = await db.table(this.TABLE_NAME)
        .reverse()
        .toArray();
      
      console.log(`📊 ${archives.length} archives de tableaux de commission chargés`);
      return archives;
    } catch (error) {
      console.error('❌ Erreur chargement archives:', error);
      return [];
    }
  }

  /**
   * Récupérer un archive spécifique par ID
   */
  async getArchiveById(id: string): Promise<CommissionArchiveEntry | undefined> {
    try {
      const db = await getDB();
      
      if (!db.tables.some(t => t.name === this.TABLE_NAME)) {
        return undefined;
      }
      
      return await db.table(this.TABLE_NAME).get(id);
    } catch (error) {
      console.error('❌ Erreur récupération archive:', error);
      return undefined;
    }
  }

  /**
   * Supprimer un archive
   */
  async deleteArchive(id: string): Promise<void> {
    try {
      const db = await getDB();
      
      if (!db.tables.some(t => t.name === this.TABLE_NAME)) {
        console.warn(`⚠️ Table ${this.TABLE_NAME} n'existe pas`);
        return;
      }
      
      await db.table(this.TABLE_NAME).delete(id);
      console.log(`🗑️ Archive ${id} supprimé`);
    } catch (error) {
      console.error('❌ Erreur suppression archive:', error);
      throw error;
    }
  }

  /**
   * Supprimer tous les archives
   */
  async clearAllArchives(): Promise<void> {
    try {
      const db = await getDB();
      
      if (!db.tables.some(t => t.name === this.TABLE_NAME)) {
        console.warn(`⚠️ Table ${this.TABLE_NAME} n'existe pas`);
        return;
      }
      
      await db.table(this.TABLE_NAME).clear();
      console.log('🧹 Tous les archives de tableaux de commission supprimés');
    } catch (error) {
      console.error('❌ Erreur nettoyage archives:', error);
      throw error;
    }
  }

  /**
   * Exporter un archive en CSV
   */
  exportToCSV(archive: CommissionArchiveEntry): string {
    let csv = '\uFEFF'; // UTF-8 BOM pour Excel
    
    // En-tête global
    csv += `"TABLEAUX DE COMMISSION - ${archive.sessionName}"\n`;
    csv += `"Période: ${new Date(archive.sessionStart).toLocaleDateString('fr-FR')} - ${new Date(archive.sessionEnd).toLocaleDateString('fr-FR')}"\n`;
    csv += `"Archivé le: ${new Date(archive.archivedAt).toLocaleDateString('fr-FR')}"\n`;
    csv += '\n';
    
    // Pour chaque vendeuse
    archive.vendorCommissions.forEach(vendor => {
      csv += `\n"${vendor.vendorName}","Commission: ${vendor.commissionRate}%","Total ventes: ${vendor.grandTotal.toFixed(2)} €"\n`;
      csv += '"Date","Chèque","CB","Espèce","Total","Statut","Salaire"\n';
      
      // Lignes quotidiennes
      vendor.dailyStats.forEach(day => {
        csv += `"${day.date}",`;
        csv += `"${day.cheque.toFixed(2)}",`;
        csv += `"${day.cb.toFixed(2)}",`;
        csv += `"${day.espece.toFixed(2)}",`;
        csv += `"${day.total.toFixed(2)}",`;
        csv += `"${day.isAboveThreshold ? 'VRAI' : 'FAUX'}",`;
        csv += `"${day.salary.toFixed(2)}"\n`;
      });
      
      // Totaux
      csv += '"TOTAL",';
      csv += `"${vendor.totalCheque.toFixed(2)}",`;
      csv += `"${vendor.totalCB.toFixed(2)}",`;
      csv += `"${vendor.totalEspece.toFixed(2)}",`;
      csv += `"${vendor.grandTotal.toFixed(2)}",`;
      csv += '"",';
      csv += `"${vendor.totalSalary.toFixed(2)}"\n`;
      
      // Frais et net
      csv += '\n';
      csv += `"Total salaire","${vendor.totalSalary.toFixed(2)} €"\n`;
      csv += `"Forfait logement","${vendor.housingFee.toFixed(2)} €"\n`;
      csv += `"Frais transport","${vendor.transportFee.toFixed(2)} €"\n`;
      csv += `"Net à payer","${vendor.netAmount.toFixed(2)} €"\n`;
      csv += '\n';
    });
    
    // Récapitulatif général
    csv += '\n"RÉCAPITULATIF GÉNÉRAL"\n';
    csv += `"Total ventes session","${archive.totalVentes.toFixed(2)} €"\n`;
    csv += `"Total salaires","${archive.totalSalaires.toFixed(2)} €"\n`;
    csv += `"Total frais","${archive.totalFrais.toFixed(2)} €"\n`;
    csv += `"Total net à payer","${archive.totalNet.toFixed(2)} €"\n`;
    
    return csv;
  }
}

export const vendorCommissionArchiveService = new VendorCommissionArchiveService();
export default vendorCommissionArchiveService;


