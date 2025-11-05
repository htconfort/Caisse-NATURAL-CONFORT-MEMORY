#!/bin/bash

echo "🧹 NETTOYAGE COMPLET DES CACHES - CAISSE MYCONFORT"
echo "=================================================="
echo ""

# 1. Cache Vite
echo "🗑️  Suppression cache Vite..."
rm -rf node_modules/.vite
rm -rf .vite
echo "✅ Cache Vite supprimé"

# 2. Cache Netlify local
echo "🗑️  Suppression cache Netlify local..."
rm -rf .netlify
echo "✅ Cache Netlify local supprimé"

# 3. Dist
echo "🗑️  Suppression dist..."
rm -rf dist
echo "✅ Dist supprimé"

# 4. Node modules (optionnel - décommenter si besoin)
# echo "🗑️  Suppression node_modules..."
# rm -rf node_modules
# echo "✅ Node modules supprimé"

echo ""
echo "🎯 Rebuild complet..."
npm install
npm run build

echo ""
echo "✅ NETTOYAGE TERMINÉ !"
echo "📦 Application reconstruite avec succès"
echo ""
echo "🚀 Pour déployer maintenant :"
echo "   netlify deploy --prod --dir=dist"









