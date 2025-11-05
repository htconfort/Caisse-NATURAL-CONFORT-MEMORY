import { supabase } from '../lib/supabaseClient';

export type SupabaseTestResult = { data: any; error: any }

export async function testInsert(): Promise<SupabaseTestResult> {
  try {
    const { data, error } = await supabase
      .from('factures')
      .upsert([
        {
          numero_facture: 'TEST-001',
          date_facture: new Date().toISOString().slice(0, 10),
          nom_client: 'Client Demo',
          email_client: 'demo@example.com',
          telephone_client: '0600000000',
          montant_ht: 100,
          montant_ttc: 120,
          produits: [{ nom: 'Service A', quantite: 1, prix_ht: 100 }],
          status: 'pending',
        },
      ], { onConflict: 'numero_facture', ignoreDuplicates: false })
      .select()

    console.log('insert:', { data, error })
    return { data, error }
  } catch (e: any) {
    console.error('insert network error:', e)
    return { data: null, error: e }
  }
}


