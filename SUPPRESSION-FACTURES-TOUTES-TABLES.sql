-- ============================================================================
-- SUPPRESSION FACTURES TEST - TOUTES TABLES
-- ============================================================================
-- Exécuter dans Supabase SQL Editor
-- Essaie de supprimer dans TOUTES les tables possibles
-- ============================================================================

-- ============================================================================
-- ÉTAPE 1 : VÉRIFICATION - Compter dans chaque table
-- ============================================================================

-- Vue factures_full (lecture seule)
SELECT 'factures_full (VIEW)' as table_name, COUNT(*) as factures_bruno
FROM factures_full
WHERE 
  nom_client ILIKE '%Bruno%'
  OR nom_client ILIKE '%Priem%'
  OR email_client ILIKE '%htconfort%';

-- Table factures
SELECT 'factures (TABLE)' as table_name, COUNT(*) as factures_bruno
FROM factures
WHERE 
  nom_client ILIKE '%Bruno%'
  OR nom_client ILIKE '%Priem%'
  OR email_client ILIKE '%htconfort%';

-- Table factures_ordered
SELECT 'factures_ordered (TABLE)' as table_name, COUNT(*) as factures_bruno
FROM factures_ordered
WHERE 
  nom_client ILIKE '%Bruno%'
  OR nom_client ILIKE '%Priem%'
  OR email_client ILIKE '%htconfort%';

-- Table factures_ordre
SELECT 'factures_ordre (TABLE)' as table_name, COUNT(*) as factures_bruno
FROM factures_ordre
WHERE 
  nom_client ILIKE '%Bruno%'
  OR nom_client ILIKE '%Priem%'
  OR email_client ILIKE '%htconfort%';

-- ============================================================================
-- ÉTAPE 2 : SUPPRESSION - Dans TOUTES les tables (pas la vue)
-- ============================================================================

-- ⚠️ ATTENTION : IRRÉVERSIBLE
-- Vérifiez ÉTAPE 1 avant d'exécuter

-- Supprimer dans 'factures'
DELETE FROM factures
WHERE 
  nom_client ILIKE '%Bruno%'
  OR nom_client ILIKE '%Priem%'
  OR email_client ILIKE '%htconfort%';

-- Supprimer dans 'factures_ordered'
DELETE FROM factures_ordered
WHERE 
  nom_client ILIKE '%Bruno%'
  OR nom_client ILIKE '%Priem%'
  OR email_client ILIKE '%htconfort%';

-- Supprimer dans 'factures_ordre'
DELETE FROM factures_ordre
WHERE 
  nom_client ILIKE '%Bruno%'
  OR nom_client ILIKE '%Priem%'
  OR email_client ILIKE '%htconfort%';

-- ============================================================================
-- ÉTAPE 3 : VÉRIFICATION FINALE
-- ============================================================================

-- Vérifier dans la vue factures_full (devrait être 0 maintenant)
SELECT COUNT(*) as "Factures Bruno restantes (devrait être 0)"
FROM factures_full
WHERE 
  nom_client ILIKE '%Bruno%'
  OR nom_client ILIKE '%Priem%'
  OR email_client ILIKE '%htconfort%';

-- Afficher les 20 dernières factures restantes
SELECT 
  numero_facture,
  nom_client,
  email_client,
  conseiller,
  montant_ttc,
  TO_CHAR(created_at, 'DD/MM/YYYY HH24:MI') as date
FROM factures_full
ORDER BY created_at DESC
LIMIT 20;

-- ============================================================================
-- RÉSULTAT ATTENDU
-- ============================================================================

-- ✅ Factures Bruno/Priem/htconfort supprimées de TOUTES les tables
-- ✅ Vue factures_full mise à jour automatiquement
-- ✅ Application Caisse ne les affiche plus
-- ✅ Badge rouge diminue (16 → nombre réel)

