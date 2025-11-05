#!/bin/bash

echo "🔍 Fermeture du port 5173 s'il est occupé..."
lsof -ti:5173 | xargs kill -9 2>/dev/null

echo "🚀 Lancement de Vite en foreground sur le port 5173..."
node_modules/.bin/vite --port 5173 --host
