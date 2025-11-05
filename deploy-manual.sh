#!/bin/bash

echo "🚀 DÉPLOIEMENT NETLIFY MANUEL - CAISSE MYCONFORT v3.0"
echo "=================================================="

# 1. Vérifications
echo "📋 Vérifications..."
if [ ! -f "package.json" ]; then
  echo "❌ package.json introuvable"
  exit 1
fi

if [ ! -f "netlify.toml" ]; then
  echo "❌ netlify.toml introuvable"
  exit 1
fi

# 2. Build
echo "🔨 Build de production..."
npm run build

if [ ! -d "dist" ]; then
  echo "❌ Build échoué - dossier dist introuvable"
  exit 1
fi

echo "✅ Build réussi"

# 3. Déploiement Netlify
echo "📤 Déploiement sur Netlify..."

# Option 1: Drag & Drop manuel
echo "📁 Votre dossier à déployer: $(pwd)/dist"
echo ""
echo "🌐 ÉTAPES MANUELLES:"
echo "1. Aller sur https://app.netlify.com/"
echo "2. Cliquer 'Add new site' > 'Deploy manually'"
echo "3. Glisser-déposer le dossier: $(pwd)/dist"
echo "4. Attendre le déploiement"
echo ""

# Option 2: CLI si connecté
if command -v netlify &> /dev/null; then
  echo "🔧 Tentative de déploiement automatique..."
  netlify deploy --dir=dist --prod
else
  echo "⚠️  Netlify CLI non trouvé - utiliser le déploiement manuel ci-dessus"
fi

echo "✅ TERMINÉ"
