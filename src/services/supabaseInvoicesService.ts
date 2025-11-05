/**
 * Service de synchronisation des factures depuis Supabase
 * Lit les factures créées dans l'App Facturation
 * Version: 1.0.0 - 2025-01-24
 */

import { createClient } from '@supabase/supabase-js';
import { SUPABASE_CONFIG } from '../config/supabase';

// Types pour les factures Supabase (table: factures_full)
export interface SupabaseInvoice {
  id: number;
  numero_facture: string;
  date_facture: string;
  nom_client: string;
  email_client?: string;
  telephone_client?: string;
  adresse_client?: string;
  client_code_postal?: string;
  client_ville?: string;
  conseiller?: string;
  payment_method?: string;
  status: string;
  canceled?: boolean; // 🆕 Champ pour marquer comme annulée
  montant_ht: number;
  montant_tva: number;
  total_tva?: number;
  montant_ttc: number;
  acompte: number;
  montant_restant: number;
  is_quick_invoice: boolean;
  is_draft: boolean;
  is_sent: boolean;
  produits: Array<{
    nom: string;
    quantite: number;
    prix_ttc: number;
    total_ttc: number;
    remise?: number;
    type_remise?: string;
    statut_livraison?: string;
  }>;
  type_facture: string;
  type_panier?: string;
  source_vente?: string;
  created_at: string;
  updated_at: string;
}

/**
 * Client Supabase configuré
 */
const supabase = createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey);

/**
 * Service de gestion des factures Supabase
 */
class SupabaseInvoicesService {
  /**
   * 🔧 Helper: Parser le champ 'produits' s'il est en string JSON
   */
  private parseInvoiceProducts(invoice: any): SupabaseInvoice {
    let produits = invoice.produits;
    
    // Si produits est une string JSON, la parser
    if (typeof produits === 'string') {
      try {
        produits = JSON.parse(produits);
        console.log(`🔧 Facture ${invoice.numero_facture}: produits parsé (string → array)`);
      } catch (e) {
        console.error(`❌ Facture ${invoice.numero_facture}: Erreur parsing produits`, e);
        produits = [];
      }
    }
    
    // S'assurer que produits est un array
    if (!Array.isArray(produits)) {
      console.warn(`⚠️ Facture ${invoice.numero_facture}: produits n'est pas un array, conversion en []`);
      produits = [];
    }
    
    return {
      ...invoice,
      produits
    } as SupabaseInvoice;
  }

  /**
   * Charger toutes les factures depuis Supabase
   */
  async loadAllInvoices(limit = 100): Promise<SupabaseInvoice[]> {
    try {
      console.log('🔄 Chargement des factures depuis Supabase (table: factures_full)...');
      
      const { data, error } = await supabase
        .from('factures_full')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('❌ Erreur chargement factures Supabase:', error);
        throw error;
      }

      console.log(`✅ ${data?.length || 0} factures chargées depuis Supabase (factures_full)`);
      
      // 🔧 FIX CRITIQUE: Parser le champ 'produits' si c'est une string
      return (data || []).map(invoice => this.parseInvoiceProducts(invoice));
    } catch (error) {
      console.error('❌ Erreur fatale chargement factures:', error);
      throw error;
    }
  }

  /**
   * Charger les factures par vendeur
   */
  async loadInvoicesByVendor(vendorId: string): Promise<SupabaseInvoice[]> {
    try {
      console.log(`🔄 Chargement des factures pour ${vendorId}...`);
      
      const { data, error } = await supabase
        .from('factures_full')
        .select('*')
        .eq('conseiller', vendorId)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) {
        console.error('❌ Erreur chargement factures vendeur:', error);
        throw error;
      }

      console.log(`✅ ${data?.length || 0} factures pour ${vendorId}`);
      
      // 🔧 Parser le champ 'produits' si c'est une string
      return (data || []).map(invoice => this.parseInvoiceProducts(invoice));
    } catch (error) {
      console.error('❌ Erreur fatale:', error);
      throw error;
    }
  }

  /**
   * Charger les factures par date
   */
  async loadInvoicesByDate(date: Date): Promise<SupabaseInvoice[]> {
    try {
      const targetDate = date.toISOString().split('T')[0];
      console.log(`🔄 Chargement des factures du ${targetDate}...`);
      
      const { data, error } = await supabase
        .from('factures_full')
        .select('*')
        .gte('date_facture', targetDate)
        .lt('date_facture', new Date(date.getTime() + 86400000).toISOString().split('T')[0])
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Erreur chargement factures par date:', error);
        throw error;
      }

      console.log(`✅ ${data?.length || 0} factures pour ${targetDate}`);
      
      // 🔧 Parser le champ 'produits' si c'est une string
      return (data || []).map(invoice => this.parseInvoiceProducts(invoice));
    } catch (error) {
      console.error('❌ Erreur fatale:', error);
      throw error;
    }
  }

  /**
   * Charger les factures d'aujourd'hui
   */
  async loadTodayInvoices(): Promise<SupabaseInvoice[]> {
    return this.loadInvoicesByDate(new Date());
  }

  /**
   * Rechercher une facture par numéro
   */
  async getInvoiceByNumber(invoiceNumber: string): Promise<SupabaseInvoice | null> {
    try {
      console.log(`🔍 Recherche facture ${invoiceNumber}...`);
      
      const { data, error } = await supabase
        .from('factures_full')
        .select('*')
        .eq('numero_facture', invoiceNumber)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // Facture non trouvée
          console.log(`⚠️ Facture ${invoiceNumber} non trouvée`);
          return null;
        }
        console.error('❌ Erreur recherche facture:', error);
        throw error;
      }

      console.log(`✅ Facture ${invoiceNumber} trouvée`);
      return data as SupabaseInvoice;
    } catch (error) {
      console.error('❌ Erreur fatale:', error);
      throw error;
    }
  }

  /**
   * Calculer les statistiques des factures
   */
  async getStatistics(): Promise<{
    total: number;
    today: number;
    totalAmount: number;
    todayAmount: number;
    completedCount: number;
    pendingCount: number;
  }> {
    try {
      const allInvoices = await this.loadAllInvoices(1000);
      const todayInvoices = await this.loadTodayInvoices();

      return {
        total: allInvoices.length,
        today: todayInvoices.length,
        totalAmount: allInvoices.reduce((sum, inv) => sum + (inv.montant_ttc || 0), 0),
        todayAmount: todayInvoices.reduce((sum, inv) => sum + (inv.montant_ttc || 0), 0),
        completedCount: allInvoices.filter(inv => inv.status === 'completed').length,
        pendingCount: allInvoices.filter(inv => inv.status === 'pending' || inv.status === 'draft').length
      };
    } catch (error) {
      console.error('❌ Erreur calcul statistiques:', error);
      return {
        total: 0,
        today: 0,
        totalAmount: 0,
        todayAmount: 0,
        completedCount: 0,
        pendingCount: 0
      };
    }
  }

  /**
   * S'abonner aux nouvelles factures en temps réel
   */
  subscribeToNewInvoices(
    onNewInvoice: (invoice: SupabaseInvoice) => void
  ): () => void {
    console.log('🔔 Abonnement aux nouvelles factures Supabase (factures_full)...');
    
    const subscription = supabase
      .channel('factures-full-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'factures_full'
        },
        (payload) => {
          console.log('🆕 Nouvelle facture reçue depuis Supabase:', payload.new);
          onNewInvoice(payload.new as SupabaseInvoice);
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('✅ Abonnement aux factures actif (factures_full)');
        }
      });

    // Retourne une fonction pour se désabonner
    return () => {
      console.log('🔕 Désabonnement des factures Supabase');
      subscription.unsubscribe();
    };
  }

  /**
   * S'abonner aux mises à jour de factures en temps réel
   */
  subscribeToInvoiceUpdates(
    onInvoiceUpdate: (invoice: SupabaseInvoice) => void
  ): () => void {
    console.log('🔔 Abonnement aux mises à jour de factures (factures_full)...');
    
    const subscription = supabase
      .channel('factures-full-updates')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'factures_full'
        },
        (payload) => {
          console.log('📝 Facture mise à jour:', payload.new);
          onInvoiceUpdate(payload.new as SupabaseInvoice);
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }

  /**
   * Ping Supabase pour tester la connexion
   */
  async pingSupabase(): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('factures_full')
        .select('id')
        .limit(1);

      if (error) {
        console.error('❌ Ping Supabase échoué:', error);
        return false;
      }

      console.log('✅ Supabase accessible (factures_full)', data);
      return true;
    } catch (error) {
      console.error('❌ Erreur ping Supabase:', error);
      return false;
    }
  }

  /**
   * 🆕 Marquer une facture comme réglée (chèque reçu)
   * @param numeroFacture Numéro de la facture
   * @returns true si succès, false si erreur
   */
  async markInvoiceAsPaid(numeroFacture: string): Promise<boolean> {
    try {
      console.log('💰 Marquage facture comme réglée:', numeroFacture);
      
      const { error } = await supabase
        .from('factures_full')
        .update({
          montant_restant: 0,
          status: 'paid',
          updated_at: new Date().toISOString()
        })
        .eq('numero_facture', numeroFacture);

      if (error) {
        console.error('❌ Erreur marquage facture:', error);
        return false;
      }

      console.log('✅ Facture marquée comme réglée:', numeroFacture);
      return true;
    } catch (error) {
      console.error('❌ Erreur critique marquage facture:', error);
      return false;
    }
  }

  /**
   * 🆕 Marquer plusieurs factures comme réglées (batch)
   * @param numeroFactures Liste des numéros de factures
   * @returns Nombre de factures marquées avec succès
   */
  async markInvoicesAsPaid(numeroFactures: string[]): Promise<number> {
    try {
      console.log(`💰 Marquage de ${numeroFactures.length} factures comme réglées...`);
      console.log('📋 Factures à marquer:', numeroFactures);
      
      // 🔍 Vérifier la connexion Supabase d'abord
      const pingOk = await this.pingSupabase();
      if (!pingOk) {
        throw new Error('❌ Supabase inaccessible - Vérifiez votre connexion internet');
      }
      
      const { data, error } = await supabase
        .from('factures_full')
        .update({
          montant_restant: 0,
          status: 'paid',
          updated_at: new Date().toISOString()
        })
        .in('numero_facture', numeroFactures)
        .select('numero_facture');

      if (error) {
        console.error('❌ Erreur Supabase détaillée:', error);
        console.error('❌ Code:', error.code);
        console.error('❌ Message:', error.message);
        console.error('❌ Details:', error.details);
        throw new Error(`Erreur Supabase: ${error.message}`);
      }

      const count = data?.length || 0;
      console.log(`✅ ${count} facture(s) marquée(s) comme réglée(s)`);
      console.log('📋 Factures marquées:', data?.map(d => d.numero_facture));
      return count;
    } catch (error) {
      console.error('❌ Erreur critique marquage batch:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('❌ Message erreur:', errorMessage);
      throw error; // Remonter l'erreur pour affichage dans l'UI
    }
  }

  /**
   * 🆕 Annuler une facture (marquer comme canceled)
   */
  async cancelInvoice(invoiceId: number): Promise<void> {
    try {
      console.log(`🗑️ Annulation facture Supabase ID: ${invoiceId}...`);
      
      const { data, error } = await supabase
        .from('factures_full')
        .update({
          status: 'canceled',
          updated_at: new Date().toISOString()
        })
        .eq('id', invoiceId)
        .select();

      if (error) {
        console.error('❌ Erreur annulation facture:', error);
        console.error('❌ Détails erreur:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        });
        throw new Error(`Erreur Supabase: ${error.message || error.details || 'Erreur inconnue'}`);
      }

      console.log('✅ Facture annulée avec succès:', data);
      
      if (!data || data.length === 0) {
        console.warn('⚠️ Aucune facture mise à jour. ID introuvable ?');
      }
    } catch (error) {
      console.error('❌ Erreur critique annulation facture:', error);
      throw error;
    }
  }
}

// Instance singleton
export const supabaseInvoicesService = new SupabaseInvoicesService();

// Exposer dans window pour les tests
if (typeof window !== 'undefined') {
  (window as any).supabaseInvoicesService = supabaseInvoicesService;
  console.log('🔧 SupabaseInvoicesService exposé dans window.supabaseInvoicesService');
}

export default SupabaseInvoicesService;

