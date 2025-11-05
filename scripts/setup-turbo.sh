#!/bin/bash
# 🚀 Configuration automatique MODE TURBO pour MyConfort

echo "🚀 Configuration MODE TURBO MyConfort..."

# Chemin vers le fichier zshrc
ZSHRC_FILE="$HOME/.zshrc"

# Sauvegarde du .zshrc actuel
if [ -f "$ZSHRC_FILE" ]; then
    cp "$ZSHRC_FILE" "$ZSHRC_FILE.backup.$(date +%Y%m%d_%H%M%S)"
    echo "💾 Sauvegarde de .zshrc créée"
fi

# Configuration Node.js
echo "" >> "$ZSHRC_FILE"
echo "# 🚀 MyConfort MODE TURBO Configuration" >> "$ZSHRC_FILE"
echo "export NODE_OPTIONS=--max-old-space-size=4096" >> "$ZSHRC_FILE"

# Alias de démarrage rapide
PROJECT_PATH="/Users/brunopriem/CAISSE MYCONFORT/Caisse-MyConfort-3/mon-projet-vite"
echo "alias devmyconfort='export NODE_OPTIONS=--max-old-space-size=4096 && cd \"$PROJECT_PATH\" && code .'" >> "$ZSHRC_FILE"

# Alias de nettoyage rapide
echo "alias cleanmyconfort='cd \"$PROJECT_PATH\" && ./scripts/clean-install.sh'" >> "$ZSHRC_FILE"

# Alias de déploiement rapide
echo "alias deploymyconfort='cd \"$PROJECT_PATH\" && npm run build && npx netlify deploy --prod'" >> "$ZSHRC_FILE"

echo "" >> "$ZSHRC_FILE"

echo "✅ Configuration terminée !"
echo ""
echo "🎯 Nouveaux alias disponibles :"
echo "   devmyconfort     - Ouvre le projet en mode TURBO"
echo "   cleanmyconfort   - Nettoie et réinstalle"
echo "   deploymyconfort  - Build et déploie en production"
echo ""
echo "💡 Redémarre ton terminal ou tape :"
echo "   source ~/.zshrc"
echo ""
echo "🚀 Puis utilise : devmyconfort"
