import { createClient } from '@supabase/supabase-js'

// Variables d'environnement avec valeurs par défaut pour le développement
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://doxvtfojavrjrmwpafnf.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRveHZ0Zm9qYXZyanJtd3BhZm5mIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ4MDkzODMsImV4cCI6MjA3MDM4NTM4M30.P_Idhpdp8m53VeIV9vOuSMbbQLaaSVUuhxPUto03ZZ0'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)



