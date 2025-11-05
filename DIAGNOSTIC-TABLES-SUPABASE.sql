-- ============================================================================
-- DIAGNOSTIC : Identifier les VRAIES tables Supabase
-- ============================================================================
-- À exécuter dans Supabase SQL Editor
-- ============================================================================

-- ============================================================================
-- ÉTAPE 1 : Lister TOUTES les tables et vues
-- ============================================================================

SELECT 
  table_name as "Nom",
  table_type as "Type (TABLE ou VIEW)"
FROM information_schema.tables
WHERE table_schema = 'public'
  AND (table_name LIKE '%facture%' OR table_name LIKE '%invoice%')
ORDER BY table_type, table_name;

-- ============================================================================
-- ÉTAPE 2 : Voir la définition de la vue factures_full
-- ============================================================================

SELECT 
  table_name as "Vue",
  view_definition as "Définition SQL"
FROM information_schema.views
WHERE table_name = 'factures_full';

-- ============================================================================
-- ÉTAPE 3 : Compter les factures dans chaque table
-- ============================================================================

-- Table: factures
SELECT 'factures' as table_name, COUNT(*) as nombre FROM factures;

-- Table: factures_ordered
SELECT 'factures_ordered' as table_name, COUNT(*) as nombre FROM factures_ordered;

-- Table: factures_ordre
SELECT 'factures_ordre' as table_name, COUNT(*) as nombre FROM factures_ordre;

-- Table: invoices
SELECT 'invoices' as table_name, COUNT(*) as nombre FROM invoices;

-- Table: invoice_items
SELECT 'invoice_items' as table_name, COUNT(*) as nombre FROM invoice_items;

-- ============================================================================
-- ÉTAPE 4 : Chercher les factures Bruno dans TOUTES les tables
-- ============================================================================

-- Essayer dans 'factures'
SELECT 
  'factures' as source_table,
  COUNT(*) as factures_bruno
FROM factures
WHERE 
  nom_client ILIKE '%Bruno%'
  OR nom_client ILIKE '%Priem%'
  OR email_client ILIKE '%htconfort%';

-- Essayer dans 'factures_ordered'
SELECT 
  'factures_ordered' as source_table,
  COUNT(*) as factures_bruno
FROM factures_ordered
WHERE 
  nom_client ILIKE '%Bruno%'
  OR nom_client ILIKE '%Priem%'
  OR email_client ILIKE '%htconfort%';

-- Essayer dans 'factures_ordre'
SELECT 
  'factures_ordre' as source_table,
  COUNT(*) as factures_bruno
FROM factures_ordre
WHERE 
  nom_client ILIKE '%Bruno%'
  OR nom_client ILIKE '%Priem%'
  OR email_client ILIKE '%htconfort%';

-- Essayer dans 'invoices'
SELECT 
  'invoices' as source_table,
  COUNT(*) as factures_bruno
FROM invoices
WHERE 
  client_name ILIKE '%Bruno%'
  OR client_name ILIKE '%Priem%'
  OR client_email ILIKE '%htconfort%';

-- ============================================================================
-- FIN DIAGNOSTIC
-- ============================================================================

-- Une fois que vous avez identifié la VRAIE table (celle avec le COUNT > 0),
-- remplacez 'factures_full' par le nom de cette table dans le script de suppression.

