#!/bin/bash
# 🔍 Script de vérification du déploiement Netlify

echo "🔍 VÉRIFICATION DÉPLOIEMENT NETLIFY"
echo "=================================="
echo ""

# Informations locales
echo "📍 INFORMATIONS LOCALES:"
LOCAL_COMMIT=$(git log -1 --oneline | cut -d' ' -f1)
LOCAL_BRANCH=$(git branch --show-current)
echo "  Commit: $LOCAL_COMMIT"
echo "  Branche: $LOCAL_BRANCH"
echo "  Message: $(git log -1 --pretty=format:'%s')"
echo ""

# Vérification de la synchronisation
echo "🔗 SYNCHRONISATION:"
git fetch origin >/dev/null 2>&1
REMOTE_COMMIT=$(git log origin/main -1 --oneline | cut -d' ' -f1)
echo "  Origin/main: $REMOTE_COMMIT"

if [ "$LOCAL_COMMIT" == "$REMOTE_COMMIT" ]; then
    echo "  ✅ Local et remote synchronisés"
else
    echo "  ❌ Local et remote désynchronisés"
    echo "     Lance 'git push origin main' si nécessaire"
fi
echo ""

# Test du build local
echo "🔨 BUILD LOCAL:"
if [ -d "dist" ]; then
    echo "  ✅ Dossier dist présent"
    DIST_SIZE=$(du -sh dist | cut -f1)
    echo "  📦 Taille: $DIST_SIZE"
    
    if [ -f "dist/index.html" ]; then
        echo "  ✅ index.html présent"
        # Recherche du numéro de version dans l'index.html
        if grep -q "v3.01" dist/index.html; then
            echo "  ✅ Version 3.01 détectée dans le build"
        else
            echo "  ⚠️  Version 3.01 non trouvée dans le build"
        fi
    else
        echo "  ❌ index.html manquant"
    fi
else
    echo "  ❌ Dossier dist manquant - lance 'npm run build'"
fi
echo ""

# URLs à vérifier
echo "🌐 URLS À VÉRIFIER:"
echo "  Production: https://caissemyconfort2025.netlify.app"
echo "  Admin: https://app.netlify.com/sites/caissemyconfort2025/deploys"
echo ""

# Ce qu'il faut chercher sur Netlify
echo "🎯 SUR NETLIFY, VÉRIFIER:"
echo "  1. Le dernier deploy a le SHA: $LOCAL_COMMIT"
echo "  2. Le status est 'Published' (pas Preview)"
echo "  3. Build command: 'npm ci && npm run build'"
echo "  4. Publish directory: 'dist'"
echo "  5. Branch: 'main'"
echo ""

# Instructions de dépannage
echo "🔧 SI PROBLÈME:"
echo "  1. Aller sur: https://app.netlify.com/sites/caissemyconfort2025/deploys"
echo "  2. Chercher le deploy avec SHA $LOCAL_COMMIT"
echo "  3. Cliquer 'Publish deploy' si il n'est qu'en Preview"
echo "  4. Ou faire 'Clear cache and deploy site' pour forcer un rebuild"
echo ""

# Test de l'URL de production (basique)
echo "🌍 TEST RAPIDE PRODUCTION:"
if command -v curl >/dev/null 2>&1; then
    HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" https://caissemyconfort2025.netlify.app)
    if [ "$HTTP_STATUS" == "200" ]; then
        echo "  ✅ Site accessible (HTTP $HTTP_STATUS)"
    else
        echo "  ⚠️  Site retourne HTTP $HTTP_STATUS"
    fi
else
    echo "  💡 Visite https://caissemyconfort2025.netlify.app manuellement"
fi
echo ""

echo "✅ Vérification terminée !"
echo "💡 Cherche le BuildStamp en bas à gauche de l'app pour confirmer la version."
