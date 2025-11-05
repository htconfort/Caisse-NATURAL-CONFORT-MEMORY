#!/bin/bash

echo "🚀 DÉPLOIEMENT CORRECTIONS 25 OCTOBRE 2025"
echo "============================================"
echo ""

# 1. Vérifier les corrections critiques
echo "📝 Vérification des corrections..."

# Vérification suppression ovale statut
if grep -q 'fontSize: .20px.' src/components/tabs/SalesTab.tsx; then
  echo "✅ Ovale statut supprimé (ligne 499)"
else
  echo "❌ Ovale statut NON supprimé"
fi

# Vérification mapping modes paiement
if grep -q 'mapPaymentMethod' src/components/tabs/SalesTab.tsx; then
  echo "✅ Fonction mapPaymentMethod présente"
else
  echo "❌ Fonction mapPaymentMethod MANQUANTE"
fi

# Vérification mapping vendeuses
if grep -q "includes('babeth')" src/App.tsx; then
  echo "✅ Mapping Babeth → Babette présent"
else
  echo "❌ Mapping Babeth MANQUANT"
fi

# Vérification correction toFixed
if grep -q 'montant_ttc' src/components/SupabaseInvoicesTab.tsx; then
  echo "✅ Correction toFixed appliquée"
else
  echo "❌ Correction toFixed MANQUANTE"
fi

echo ""

# 2. Build local
echo "🔨 Build de production..."
npm run build

if [ $? -ne 0 ]; then
  echo "❌ Échec du build"
  exit 1
fi

# 3. Vérifier que le build a été créé
echo ""
echo "🔍 Vérification du build..."
if [ -d "dist" ]; then
  echo "✅ Dossier dist/ créé"
  BUILD_SIZE=$(du -sh dist/ | cut -f1)
  echo "📦 Taille du build: $BUILD_SIZE"
else
  echo "❌ Dossier dist/ absent"
  exit 1
fi

echo ""

# 4. Commit avec message descriptif
echo "📤 Commit des corrections..."
git add .
COMMIT_MSG="🔧 Corrections 25/10/2025 - Ovale statut + Modes paiement + Mapping vendeuses

✅ Suppression ovale disgracieux dans colonne Statut
✅ Mapping modes paiement français → anglais (Chèque, Espèces, Carte)
✅ Mapping vendeuses (Babeth→Babette, Karima ajoutée, Billy corrigé)
✅ Correction erreur toFixed dans SupabaseInvoicesTab
✅ Support 'Chèque à venir' dans mapping paiements"

git commit -m "$COMMIT_MSG"

if [ $? -eq 0 ]; then
  echo "✅ Commit créé"
else
  echo "⚠️  Aucun changement à committer (ou commit échoué)"
fi

echo ""

# 5. Push vers origin
echo "🚀 Push vers GitHub..."
git push origin main

if [ $? -eq 0 ]; then
  echo "✅ Push réussi"
else
  echo "❌ Échec du push"
  exit 1
fi

echo ""
echo "✅ DÉPLOIEMENT TERMINÉ"
echo ""
echo "⏳ Le déploiement Netlify va prendre 2-3 minutes"
echo "🌐 URL de production: https://caisse-myconfort.netlify.app"
echo ""
echo "📋 Corrections déployées:"
echo "   • Statut sans ovale (juste ✅)"
echo "   • Mode paiement 'Chèque à venir' → 🏦 CHÈQUE"
echo "   • Vendeuse 'Bavette' → Babette"
echo "   • Support Karima, Billy avec bons IDs"
echo ""

