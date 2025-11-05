#!/bin/bash

echo "🚨 SOLUTION RADICALE - REBUILD COMPLET v3.0"
echo "==========================================="

# 1. Nettoyer complètement
echo "🧹 Nettoyage radical..."
rm -rf dist/
rm -rf node_modules/.vite
rm -f tsconfig.tsbuildinfo
rm -rf .vite

# 2. Forcer la réinstallation des dépendances
echo "📦 Réinstallation des dépendances..."
rm -rf node_modules/
npm install

# 3. Rebuild complet
echo "🔨 Build complet..."
npm run build

# 4. Vérification
echo "🔍 Vérification du build..."
if [ -d "dist" ]; then
  echo "✅ Dossier dist créé"
  if grep -r "v3.0" dist/ > /dev/null; then
    echo "✅ v3.0 trouvé dans le build"
  else
    echo "❌ v3.0 NON trouvé dans le build"
  fi
  
  if grep -r "CartTypeSelector" dist/ > /dev/null; then
    echo "✅ CartTypeSelector trouvé dans le build"
  else
    echo "❌ CartTypeSelector NON trouvé dans le build"
  fi
else
  echo "❌ Build échoué"
fi

echo "🎯 Dossier à déployer: $(pwd)/dist"
