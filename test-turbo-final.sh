#!/bin/bash

# 🚀 Test final optimisation VS Code + Responsive iPad
# Vérifie que toutes les optimisations sont actives

echo "⚡ TEST FINAL - VS Code Turbo + iPad Responsive"
echo "================================================="

# 1. Vérification fichiers de config
echo "✅ 1. Vérification fichiers configuration..."
if [ -f ".vscode/settings.json" ]; then
    echo "   ✅ .vscode/settings.json - Optimisations VS Code"
else
    echo "   ❌ .vscode/settings.json manquant"
fi

if grep -q "optimizeDeps" vite.config.ts; then
    echo "   ✅ vite.config.ts - Optimisations dépendances"
else
    echo "   ❌ vite.config.ts - optimizeDeps manquant"
fi

if [ -f "src/styles/ipad-responsive.css" ]; then
    echo "   ✅ CSS responsive iPad présent"
else
    echo "   ❌ CSS responsive iPad manquant"
fi

# 2. Vérification composants
echo ""
echo "✅ 2. Vérification composants..."
if [ -f "src/components/ui/FloatingCartSimple.tsx" ]; then
    echo "   ✅ FloatingCartSimple.tsx - Version fonctionnelle"
else
    echo "   ❌ FloatingCartSimple.tsx manquant"
fi

if [ -f "src/components/ui/FloatingCart.tsx.backup" ]; then
    echo "   ✅ FloatingCart.tsx.backup - Version originale sauvée"
else
    echo "   ⚠️  FloatingCart.tsx.backup - pas trouvé (normal si supprimé)"
fi

# 3. Test serveur
echo ""
echo "✅ 3. Test serveur de développement..."
if pgrep -f "vite" > /dev/null; then
    echo "   ✅ Serveur Vite actif"
    echo "   📱 iPad: http://$(ipconfig getifaddr en0 2>/dev/null || echo "IP-LOCAL"):5173/"
    echo "   💻 Local: http://localhost:5173/"
else
    echo "   ⚠️  Serveur Vite non démarré - lancement..."
    npm run dev &
    sleep 3
fi

# 4. Test responsive
echo ""
echo "✅ 4. Instructions test responsive iPad..."
echo "   1. Ouvrir http://localhost:5173 dans navigateur"
echo "   2. F12 → Mode responsive → iPad"
echo "   3. Tester Portrait (768×1024) et Landscape (1024×768)"
echo "   4. Vérifier navigation visible en landscape"
echo "   5. Ajouter produits au panier → vérifier position"

# 5. Extensions recommandées
echo ""
echo "✅ 5. Extensions VS Code recommandées à installer:"
echo "   - ESLint"
echo "   - Prettier"
echo "   - Tailwind CSS IntelliSense"
echo "   - Error Lens"
echo "   - Import Cost"
echo "   - Path Intellisense"
echo "   - GitLens"

echo ""
echo "🚀 OPTIMISATION TERMINÉE !"
echo "================================================="
echo "Performance attendue: startup 1-2s, HMR ultra-rapide"
echo "iPad responsive: navigation visible landscape + portrait"
echo "VS Code: formatage auto, Copilot optimisé, cache intelligent"
