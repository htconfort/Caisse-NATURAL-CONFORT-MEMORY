#!/bin/bash
# 🔍 Diagnostic système MyConfort MODE TURBO

echo "🔍 DIAGNOSTIC SYSTÈME MYCONFORT"
echo "================================"
echo ""

# Informations Node.js
echo "📦 NODE.JS:"
echo "  Version: $(node --version)"
echo "  NPM: $(npm --version)"
echo "  Mémoire configurée: $NODE_OPTIONS"
echo ""

# Informations projet
echo "📁 PROJET:"
PROJECT_PATH="/Users/brunopriem/CAISSE MYCONFORT/Caisse-MyConfort-3/mon-projet-vite"
cd "$PROJECT_PATH"

if [ -f "package.json" ]; then
    echo "  ✅ package.json trouvé"
else
    echo "  ❌ package.json manquant"
fi

if [ -d "node_modules" ]; then
    echo "  ✅ node_modules présent"
    echo "  📦 Nombre de packages: $(ls node_modules | wc -l)"
else
    echo "  ❌ node_modules manquant - lance 'npm install'"
fi

if [ -d ".vscode" ]; then
    echo "  ✅ Configuration VS Code présente"
else
    echo "  ❌ Configuration VS Code manquante"
fi

echo ""

# Informations réseau (pour iPad)
echo "🌐 RÉSEAU (pour iPad):"
echo "  IP locale: $(ifconfig | grep "inet " | grep -v 127.0.0.1 | awk '{print $2}' | head -n1)"
echo ""

# Vérification des scripts
echo "🛠️ SCRIPTS:"
if [ -f "scripts/start-turbo.sh" ]; then
    echo "  ✅ start-turbo.sh"
else
    echo "  ❌ start-turbo.sh manquant"
fi

if [ -f "scripts/clean-install.sh" ]; then
    echo "  ✅ clean-install.sh"
else
    echo "  ❌ clean-install.sh manquant"
fi

echo ""

# Vérification des alias
echo "🔧 ALIAS CONFIGURÉS:"
if grep -q "devmyconfort" ~/.zshrc 2>/dev/null; then
    echo "  ✅ devmyconfort configuré"
else
    echo "  ❌ devmyconfort manquant - lance './scripts/setup-turbo.sh'"
fi

echo ""

# Statut Git
echo "📋 GIT STATUS:"
if git status --porcelain 2>/dev/null | grep -q .; then
    echo "  ⚠️  Modifications non commitées"
else
    echo "  ✅ Répertoire propre"
fi

echo "  Branche: $(git branch --show-current 2>/dev/null || echo 'Non initialisé')"
echo ""

# Espace disque
echo "💾 ESPACE DISQUE:"
echo "  Disponible: $(df -h . | tail -1 | awk '{print $4}')"
echo ""

echo "🎯 RECOMMANDATIONS:"
if [ ! -d "node_modules" ]; then
    echo "  1. Lance 'npm install' ou './scripts/clean-install.sh'"
fi

if ! grep -q "devmyconfort" ~/.zshrc 2>/dev/null; then
    echo "  2. Lance './scripts/setup-turbo.sh' pour configurer les alias"
fi

if [ -z "$NODE_OPTIONS" ]; then
    echo "  3. Redémarre ton terminal après setup-turbo.sh"
fi

echo "  4. Utilise 'devmyconfort' pour démarrer en MODE TURBO"
echo ""
echo "✅ Diagnostic terminé !"
