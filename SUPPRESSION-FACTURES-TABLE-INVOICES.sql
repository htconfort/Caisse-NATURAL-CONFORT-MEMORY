-- ============================================================================
-- SUPPRESSION FACTURES TEST - Table: invoices
-- ============================================================================
-- À exécuter dans Supabase SQL Editor
-- Table source identifiée: invoices (vraie table, pas une vue)
-- ============================================================================

-- ============================================================================
-- ÉTAPE 1 : VÉRIFICATION (OBLIGATOIRE - Exécuter en premier)
-- ============================================================================

-- Compter les factures à supprimer dans 'invoices'
SELECT 
  COUNT(*) as "Nombre de factures à supprimer"
FROM invoices
WHERE 
  client_name ILIKE '%Bruno%'
  OR client_name ILIKE '%Priem%'
  OR client_email ILIKE '%htconfort%';

-- Afficher la liste détaillée
SELECT 
  invoice_number as "Numéro",
  client_name as "Client",
  client_email as "Email",
  created_by_device as "Créé par",
  total as "Montant",
  payment_method as "Paiement",
  TO_CHAR(invoice_date, 'DD/MM/YYYY HH24:MI') as "Date"
FROM invoices
WHERE 
  client_name ILIKE '%Bruno%'
  OR client_name ILIKE '%Priem%'
  OR client_email ILIKE '%htconfort%'
ORDER BY invoice_date DESC;

-- ============================================================================
-- ÉTAPE 2 : SUPPRESSION DÉFINITIVE (Après vérification)
-- ============================================================================

-- ⚠️⚠️⚠️ ATTENTION : IRRÉVERSIBLE ⚠️⚠️⚠️
-- Vérifiez la liste ci-dessus AVANT d'exécuter

DELETE FROM invoices
WHERE 
  client_name ILIKE '%Bruno%'
  OR client_name ILIKE '%Priem%'
  OR client_email ILIKE '%htconfort%';

-- ============================================================================
-- ÉTAPE 3 : VÉRIFICATION FINALE
-- ============================================================================

-- Vérifier qu'il ne reste plus de factures Bruno/Priem
SELECT COUNT(*) as "Factures Bruno/Priem restantes (devrait être 0)"
FROM invoices
WHERE 
  client_name ILIKE '%Bruno%'
  OR client_name ILIKE '%Priem%'
  OR client_email ILIKE '%htconfort%';

-- Compter les factures restantes dans 'invoices'
SELECT COUNT(*) as "Total factures restantes" FROM invoices;

-- Vérifier dans la vue factures_full (devrait être mise à jour)
SELECT COUNT(*) as "factures_full (vue) après suppression"
FROM factures_full
WHERE 
  nom_client ILIKE '%Bruno%'
  OR nom_client ILIKE '%Priem%'
  OR email_client ILIKE '%htconfort%';

-- Afficher les 30 dernières factures (pour vérifier)
SELECT 
  invoice_number,
  client_name,
  client_email,
  total,
  payment_method,
  TO_CHAR(invoice_date, 'DD/MM/YYYY') as date
FROM invoices
ORDER BY invoice_date DESC
LIMIT 30;

-- ============================================================================
-- RÉSULTAT ATTENDU
-- ============================================================================

-- ✅ Factures Bruno/Priem/htconfort supprimées de 'invoices'
-- ✅ Vue factures_full mise à jour automatiquement
-- ✅ Application Caisse ne les affiche plus
-- ✅ Badge rouge diminue (16 → nombre réel de vraies factures clients)

-- ============================================================================
-- NOTES
-- ============================================================================

-- 📌 Table 'invoices' = Table principale source
-- 📌 Vue 'factures_full' = Vue combinée (lecture seule, se met à jour auto)
-- 📌 Colonnes invoices différentes de factures_full:
--    - client_name (au lieu de nom_client)
--    - client_email (au lieu de email_client)
--    - invoice_number (au lieu de numero_facture)

