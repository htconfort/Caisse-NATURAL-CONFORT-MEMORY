#!/bin/bash
# 🚀 Script de nettoyage rapide MyConfort

echo "🧹 Nettoyage des node_modules et cache..."

# Supprimer node_modules et package-lock.json
rm -rf node_modules
rm -f package-lock.json

# Supprimer les caches Vite et autres
rm -rf .vite
rm -rf dist
rm -rf .turbo

echo "📦 Réinstallation des dépendances..."
npm install

echo "✅ Nettoyage terminé ! Prêt pour le développement."
echo "💡 Utilise 'npm run dev' pour démarrer le serveur de développement."
