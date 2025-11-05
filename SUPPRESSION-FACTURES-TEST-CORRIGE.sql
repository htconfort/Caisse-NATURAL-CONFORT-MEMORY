-- ============================================================================
-- SUPPRESSION FACTURES TEST - TABLE INVOICES (CORRIGÉ)
-- ============================================================================
-- Colonnes corrigées pour la table 'invoices'
-- ============================================================================

-- ============================================================================
-- ÉTAPE 0 : VOIR LA STRUCTURE DE LA TABLE (pour comprendre les colonnes)
-- ============================================================================

SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'invoices'
ORDER BY ordinal_position;

-- ============================================================================
-- ÉTAPE 1 : VÉRIFICATION SIMPLE (sans les colonnes manquantes)
-- ============================================================================

-- Compter les factures de test
SELECT 
  COUNT(*) as "Nombre de factures à supprimer"
FROM invoices
WHERE 
  client_name ILIKE '%Bruno%'
  OR client_name ILIKE '%Priem%'
  OR client_name ILIKE '%test%'
  OR client_name ILIKE '%démo%'
  OR client_name ILIKE '%demo%'
  OR client_email ILIKE '%htconfort%'
  OR client_email ILIKE '%acheter%';

-- Afficher la liste (avec SEULEMENT les colonnes qui existent)
SELECT 
  invoice_number as "Numéro",
  client_name as "Client",
  client_email as "Email",
  total as "Montant",
  TO_CHAR(created_at, 'DD/MM/YYYY HH24:MI') as "Date"
FROM invoices
WHERE 
  client_name ILIKE '%Bruno%'
  OR client_name ILIKE '%Priem%'
  OR client_name ILIKE '%test%'
  OR client_name ILIKE '%démo%'
  OR client_name ILIKE '%demo%'
  OR client_email ILIKE '%htconfort%'
  OR client_email ILIKE '%acheter%'
ORDER BY created_at DESC;

-- ============================================================================
-- ÉTAPE 2 : SUPPRESSION DÉFINITIVE
-- ============================================================================

-- ⚠️⚠️⚠️ ATTENTION : IRRÉVERSIBLE ⚠️⚠️⚠️

DELETE FROM invoices
WHERE 
  client_name ILIKE '%Bruno%'
  OR client_name ILIKE '%Priem%'
  OR client_name ILIKE '%test%'
  OR client_name ILIKE '%démo%'
  OR client_name ILIKE '%demo%'
  OR client_email ILIKE '%htconfort%'
  OR client_email ILIKE '%acheter%';

-- ============================================================================
-- ÉTAPE 3 : VÉRIFICATION FINALE
-- ============================================================================

-- Devrait afficher 0
SELECT COUNT(*) as "Factures test restantes (devrait être 0)"
FROM invoices
WHERE 
  client_name ILIKE '%Bruno%'
  OR client_name ILIKE '%Priem%'
  OR client_name ILIKE '%test%'
  OR client_name ILIKE '%démo%'
  OR client_name ILIKE '%demo%'
  OR client_email ILIKE '%htconfort%'
  OR client_email ILIKE '%acheter%';

-- Compter les factures RÉELLES restantes
SELECT COUNT(*) as "Factures clients réels" FROM invoices;

-- Afficher les dernières factures (pour vérifier que ce sont de vrais clients)
SELECT 
  invoice_number,
  client_name,
  client_email,
  total,
  TO_CHAR(created_at, 'DD/MM/YYYY') as date
FROM invoices
ORDER BY created_at DESC
LIMIT 30;

-- ============================================================================

