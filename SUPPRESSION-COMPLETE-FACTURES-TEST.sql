-- ============================================================================
-- SUPPRESSION COMPLÈTE - TOUTES FACTURES DE TEST
-- ============================================================================
-- Table: invoices (table source principale)
-- Critères: Bruno, Priem, htconfort, Client démo, test, acheter
-- ============================================================================

-- ============================================================================
-- ÉTAPE 1 : VÉRIFICATION COMPLÈTE
-- ============================================================================

-- Compter TOUTES les factures de test
SELECT 
  COUNT(*) as "Nombre TOTAL de factures à supprimer"
FROM invoices
WHERE 
  client_name ILIKE '%Bruno%'
  OR client_name ILIKE '%Priem%'
  OR client_name ILIKE '%test%'
  OR client_name ILIKE '%démo%'
  OR client_name ILIKE '%demo%'
  OR client_name ILIKE '%Client démo%'
  OR client_email ILIKE '%htconfort%'
  OR client_email ILIKE '%acheter%';

-- Afficher la liste COMPLÈTE avec tous les détails
SELECT 
  invoice_number as "Numéro Facture",
  client_name as "Nom Client",
  client_email as "Email Client",
  created_by_device as "Créé par",
  total as "Montant €",
  payment_method as "Mode Paiement",
  TO_CHAR(invoice_date, 'DD/MM/YYYY HH24:MI') as "Date/Heure"
FROM invoices
WHERE 
  client_name ILIKE '%Bruno%'
  OR client_name ILIKE '%Priem%'
  OR client_name ILIKE '%test%'
  OR client_name ILIKE '%démo%'
  OR client_name ILIKE '%demo%'
  OR client_name ILIKE '%Client démo%'
  OR client_email ILIKE '%htconfort%'
  OR client_email ILIKE '%acheter%'
ORDER BY invoice_date DESC;

-- ============================================================================
-- ÉTAPE 2 : SUPPRESSION DÉFINITIVE
-- ============================================================================

-- ⚠️⚠️⚠️ ATTENTION : CETTE ACTION EST IRRÉVERSIBLE ⚠️⚠️⚠️
-- Vérifiez la liste ci-dessus AVANT d'exécuter cette commande

DELETE FROM invoices
WHERE 
  client_name ILIKE '%Bruno%'
  OR client_name ILIKE '%Priem%'
  OR client_name ILIKE '%test%'
  OR client_name ILIKE '%démo%'
  OR client_name ILIKE '%demo%'
  OR client_name ILIKE '%Client démo%'
  OR client_email ILIKE '%htconfort%'
  OR client_email ILIKE '%acheter%';

-- ============================================================================
-- ÉTAPE 3 : VÉRIFICATION FINALE
-- ============================================================================

-- Vérifier qu'il ne reste AUCUNE facture de test
SELECT COUNT(*) as "Factures test restantes (DEVRAIT ÊTRE 0)"
FROM invoices
WHERE 
  client_name ILIKE '%Bruno%'
  OR client_name ILIKE '%Priem%'
  OR client_name ILIKE '%test%'
  OR client_name ILIKE '%démo%'
  OR client_name ILIKE '%demo%'
  OR client_name ILIKE '%Client démo%'
  OR client_email ILIKE '%htconfort%'
  OR client_email ILIKE '%acheter%';

-- Compter les factures RÉELLES restantes
SELECT COUNT(*) as "Factures CLIENTS RÉELS restantes" FROM invoices;

-- Vérifier dans la vue factures_full
SELECT COUNT(*) as "factures_full (vue) - factures test restantes"
FROM factures_full
WHERE 
  nom_client ILIKE '%Bruno%'
  OR nom_client ILIKE '%Priem%'
  OR nom_client ILIKE '%test%'
  OR nom_client ILIKE '%démo%'
  OR nom_client ILIKE '%demo%'
  OR email_client ILIKE '%htconfort%'
  OR email_client ILIKE '%acheter%';

-- Afficher les 30 dernières factures RÉELLES (pour vérifier)
SELECT 
  invoice_number as "N° Facture",
  client_name as "Client",
  client_email as "Email",
  total as "Montant",
  payment_method as "Paiement",
  TO_CHAR(invoice_date, 'DD/MM/YYYY') as "Date"
FROM invoices
ORDER BY invoice_date DESC
LIMIT 30;

-- ============================================================================
-- RÉSUMÉ DES CRITÈRES DE SUPPRESSION
-- ============================================================================

-- Seront SUPPRIMÉES toutes les factures avec :
-- ✅ Nom client contenant : "Bruno", "Priem", "test", "démo", "demo", "Client démo"
-- ✅ Email contenant : "htconfort", "acheter"

-- Seront CONSERVÉES toutes les factures de VRAIS clients :
-- ✅ Urbe isabelle
-- ✅ Le coz jean marie
-- ✅ Vasseur Claude
-- ✅ JACQUET Eva
-- ✅ Séverine Deschuyteneer
-- ✅ etc.

-- ============================================================================
-- APRÈS SUPPRESSION
-- ============================================================================

-- 1. Recharger l'iPad Caisse (Cmd+R)
-- 2. Badge rouge "Règlements" diminue (16 → nombre réel)
-- 3. Onglet "Factures" : Plus de factures test
-- 4. Onglet "Règlements" : Seulement vrais clients
-- 5. ✅ PRÊT POUR PRODUCTION

-- ============================================================================

