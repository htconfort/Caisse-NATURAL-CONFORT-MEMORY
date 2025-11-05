#!/bin/bash

echo "🔧 Vérification du port 5173..."
if lsof -i :5173 > /dev/null 2>&1; then
    echo "⚠️  Port 5173 occupé - fermeture des processus..."
    lsof -ti:5173 | xargs kill -9
    sleep 1
    echo "✅ Processus fermés"
else
    echo "✅ Port 5173 libre"
fi

echo "🚀 Redémarrage du serveur Vite..."
node_modules/.bin/vite --port 5173 --host
