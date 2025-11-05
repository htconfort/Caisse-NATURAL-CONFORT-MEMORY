#!/usr/bin/env bash
set -euo pipefail

# ─────────────────────────────────────────────────────────────────────────────
# 🔧 Réglages
ICLOUD_DESK="$HOME/Library/Mobile Documents/com~apple~CloudDocs/Desktop"
TARGET="$HOME/Desktop"
[ -d "$TARGET" ] || TARGET="$ICLOUD_DESK"

STAMP="$(date +%F_%H%M)"
ZIP_NAME="dist_${STAMP}.zip"
ZIP_PATH="${TARGET}/${ZIP_NAME}"

# ─────────────────────────────────────────────────────────────────────────────
# ✅ Build Vite
echo "➡️  Build Vite…"
npm run build

# ─────────────────────────────────────────────────────────────────────────────
# 🗜️ Zip horodaté vers Bureau (iCloud ou local)
echo "➡️  Archive vers: ${ZIP_PATH}"
ditto -c -k --sequesterRsrc --keepParent "dist" "${ZIP_PATH}"

# ─────────────────────────────────────────────────────────────────────────────
# 🚀 (Optionnel) Déploiement Netlify si NETLIFY_DEPLOY=1
if [[ "${NETLIFY_DEPLOY:-0}" == "1" ]]; then
  echo "➡️  Déploiement Netlify…"
  # Vérifie la CLI
  if ! command -v netlify >/dev/null 2>&1; then
    echo "ℹ️  Netlify CLI non trouvée. Installation locale…"
    npm i -D netlify-cli >/dev/null 2>&1
    PATH="./node_modules/.bin:$PATH"
  fi

  # Deux modes :
  # - Prod direct si NETLIFY_AUTH_TOKEN + NETLIFY_SITE_ID présents
  # - Sinon, déploiement interactif (choix du site et confirmation)
  if [[ -n "${NETLIFY_AUTH_TOKEN:-}" && -n "${NETLIFY_SITE_ID:-}" ]]; then
    echo "➡️  Déploiement PROD (site préconfiguré)…"
    NETLIFY_AUTH_TOKEN="$NETLIFY_AUTH_TOKEN" NETLIFY_SITE_ID="$NETLIFY_SITE_ID" \
      netlify deploy --prod --dir=dist --message "release ${STAMP}"
  else
    echo "➡️  Déploiement interactif (non-prod par défaut)."
    netlify deploy --dir=dist --message "preview ${STAMP}"
    echo "ℹ️  Pour un déploiement direct en prod, exporte NETLIFY_AUTH_TOKEN et NETLIFY_SITE_ID puis relance avec NETLIFY_DEPLOY=1"
  fi
fi

# ─────────────────────────────────────────────────────────────────────────────
# 📂 Ouvre le dossier cible
open "${TARGET}"

echo "✅ Terminé."
echo "📦 Archive: ${ZIP_PATH}"
