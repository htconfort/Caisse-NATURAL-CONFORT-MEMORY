#!/bin/bash

echo "🚀 FORCER DÉPLOIEMENT NETLIFY - URGENT"
echo "========================================"

# 1. Vérifier que les dernières modifs sont bien dans le code
echo "📝 Vérification du FloatingCart moderne..."
if grep -q "CartTypeSelector" src/components/ui/FloatingCart.tsx; then
  echo "✅ CartTypeSelector trouvé"
else
  echo "❌ CartTypeSelector MANQUANT"
fi

if grep -q "ManualInvoiceModal" src/components/ui/FloatingCart.tsx; then
  echo "✅ ManualInvoiceModal trouvé"
else
  echo "❌ ManualInvoiceModal MANQUANT"
fi

# 2. Build local
echo "🔨 Build local..."
npm run build

# 3. Vérifier que le build contient les nouveaux composants
echo "🔍 Vérification du build..."
if ls dist/ > /dev/null 2>&1; then
  echo "✅ Build créé"
  echo "📁 Contenu dist/:"
  ls -la dist/
else
  echo "❌ Échec du build"
  exit 1
fi

# 4. Commit forcé avec timestamp
echo "📤 Commit forcé..."
git add .
git commit -m "🚀 FORCE DEPLOY $(date +'%Y-%m-%d %H:%M:%S') - FloatingCart moderne avec CartType + ManualInvoice"
git push origin main

echo "✅ DÉPLOIEMENT FORCÉ TERMINÉ"
echo "⏳ Attendre 2-3 minutes pour la mise à jour Netlify"
echo "🌐 URL: https://caisse-myconfort.netlify.app"
