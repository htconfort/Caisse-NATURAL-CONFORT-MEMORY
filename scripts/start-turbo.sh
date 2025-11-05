#!/bin/bash
# 🚀 Script de démarrage MODE TURBO pour MyConfort

echo "🚀 Démarrage MyConfort en MODE TURBO..."

# Configuration Node.js pour plus de mémoire
export NODE_OPTIONS=--max-old-space-size=4096

# Se déplacer vers le répertoire du projet
cd "/Users/brunopriem/CAISSE MYCONFORT/Caisse-MyConfort-3/mon-projet-vite"

# Vérifier si node_modules existe
if [ ! -d "node_modules" ]; then
    echo "📦 Installation des dépendances..."
    npm install
fi

echo "🔥 Configuration TURBO activée :"
echo "   - Mémoire Node : 4GB"
echo "   - Auto-save activé"
echo "   - Extensions optimisées"
echo "   - Cache Vite optimisé"

# Ouvrir VS Code
echo "💻 Ouverture de VS Code..."
code .

echo "✅ MyConfort prêt en MODE TURBO !"
echo "💡 Commandes utiles :"
echo "   npm run dev    - Serveur de développement"
echo "   npm run build  - Build de production"
echo "   npm run deploy - Déploiement Netlify"
