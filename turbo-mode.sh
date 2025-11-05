#!/bin/bash

echo "🚀 Activation du Turbo Mode MyConfort..."

# Vérification du répertoire .vscode
if [ ! -d ".vscode" ]; then
    mkdir .vscode
    echo "📁 Dossier .vscode créé"
fi

# Sauvegarde de la config existante
if [ -f ".vscode/settings.json" ]; then
    cp .vscode/settings.json .vscode/settings.json.backup
    echo "💾 Configuration existante sauvegardée"
fi

# Application de la configuration Turbo
cat > .vscode/settings.json << 'EOF'
{
  "workbench.startupEditor": "none",
  "workbench.editor.enablePreview": false,
  "editor.minimap.enabled": false,
  "editor.cursorSmoothCaretAnimation": "on",
  "editor.smoothScrolling": true,
  "editor.inlineSuggest.enabled": true,

  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll": "explicit",
    "source.organizeImports": "explicit"
  },

  "github.copilot.inlineSuggest.enable": true,
  "github.copilot.enable": {
    "*": true,
    "markdown": false,
    "plaintext": false
  },

  "typescript.tsserver.log": "off",
  "typescript.tsserver.experimental.enableProjectDiagnostics": false,
  "typescript.preferences.importModuleSpecifier": "relative",

  "eslint.validate": ["javascript", "javascriptreact", "typescript", "typescriptreact"],
  "eslint.format.enable": true,
  "eslint.run": "onSave",

  "prettier.requireConfig": true,

  "explorer.confirmDelete": false,
  "explorer.confirmDragAndDrop": false,
  "files.exclude": {
    "**/.git": true,
    "**/.DS_Store": true,
    "**/node_modules": true,
    "**/dist": true,
    "**/.vite": true
  },

  "vite.enableProjectAutoDetection": true,
  "vite.autoStart": false,

  "editor.accessibilitySupport": "off",
  
  "editor.suggest.snippetsPreventQuickSuggestions": false,
  "editor.suggest.localityBonus": true,
  "editor.parameterHints.enabled": true,
  
  "tailwindCSS.includeLanguages": {
    "typescript": "typescript",
    "typescriptreact": "typescriptreact"
  },
  
  "emmet.includeLanguages": {
    "typescript": "typescriptreact",
    "typescriptreact": "typescriptreact"
  }
}
EOF

echo "⚡ Configuration Turbo Mode appliquée !"
echo "🎯 Optimisations actives :"
echo "   ✅ Formatage automatique (ESLint + Prettier)"
echo "   ✅ Copilot optimisé pour React/TS"
echo "   ✅ Interface allégée"
echo "   ✅ TypeScript ultra-rapide"
echo "   ✅ Tailwind IntelliSense"
echo ""
echo "💡 Pour revenir à l'ancienne config: mv .vscode/settings.json.backup .vscode/settings.json"
echo ""
echo "🚀 Redémarre VS Code pour appliquer les changements !"
