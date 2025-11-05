#!/bin/bash
# 🧩 Installation automatique des extensions VS Code MODE TURBO

echo "🧩 Installation des extensions VS Code MODE TURBO..."

# Extensions essentielles pour MyConfort
EXTENSIONS=(
    "github.copilot"
    "github.copilot-chat" 
    "eamodio.gitlens"
    "christian-kohler.path-intellisense"
    "bradlc.vscode-tailwindcss"
    "esbenp.prettier-vscode"
    "usernamehw.errorlens"
    "sonarsource.sonarlint-vscode"
    "ms-vscode.vscode-typescript-next"
    "formulahendry.auto-rename-tag"
)

# Vérifier si VS Code CLI est disponible
if ! command -v code &> /dev/null; then
    echo "❌ VS Code CLI non trouvé"
    echo "💡 Installe VS Code CLI :"
    echo "   1. Ouvre VS Code"
    echo "   2. Cmd+Shift+P > 'Shell Command: Install code command in PATH'"
    exit 1
fi

echo "📦 Installation des extensions..."

for extension in "${EXTENSIONS[@]}"; do
    echo "  🔧 Installation de $extension..."
    code --install-extension "$extension" --force
done

echo ""
echo "✅ Toutes les extensions sont installées !"
echo ""
echo "🔄 Redémarre VS Code pour activer toutes les extensions."
echo ""
echo "🎯 Extensions installées :"
for extension in "${EXTENSIONS[@]}"; do
    echo "  ✅ $extension"
done
echo ""
echo "💡 Utilise maintenant 'devmyconfort' pour démarrer !"
