#!/bin/bash

# ⚡ Script de nettoyage ultra-rapide VS Code + Vite
# Usage: ./turbo-clean.sh

echo "🧹 Nettoyage cache Vite..."
rm -rf node_modules/.vite
rm -rf dist
rm -rf .vite

echo "🔄 Nettoyage cache VS Code TypeScript..."
rm -rf .vscode/settings.json.backup 2>/dev/null
find . -name "*.tsbuildinfo" -delete 2>/dev/null

echo "🚀 Redémarrage serveur optimisé..."
echo "Serveur sera accessible sur:"
echo "  Local:   http://localhost:5173/"
echo "  iPad:    http://$(ipconfig getifaddr en0):5173/"

npm run dev
