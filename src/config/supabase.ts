/**
 * Configuration Supabase pour NATUREL CONFORT
 * 
 * IMPORTANT : Pour la production, ajoutez ces variables dans Netlify :
 * - VITE_SUPABASE_URL=https://kxhbwnuenafcynctgkfu.supabase.co
 * - VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt4aGJ3bnVlbmFmY3luY3Rna2Z1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIzMzQ4OTYsImV4cCI6MjA3NzkxMDg5Nn0.buCm_CL19vcd3NM9aSjTEtEkzglz5Tofz4Xbt1H7p5o
 */

export const SUPABASE_CONFIG = {
  url: import.meta.env.VITE_SUPABASE_URL || 'https://kxhbwnuenafcynctgkfu.supabase.co',
  anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt4aGJ3bnVlbmFmY3luY3Rna2Z1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIzMzQ4OTYsImV4cCI6MjA3NzkxMDg5Nn0.buCm_CL19vcd3NM9aSjTEtEkzglz5Tofz4Xbt1H7p5o'
};

export const N8N_WEBHOOK_URL = import.meta.env.VITE_N8N_WEBHOOK_URL || 'https://n8n.myconfort.fr/webhook/facture-universelle';

