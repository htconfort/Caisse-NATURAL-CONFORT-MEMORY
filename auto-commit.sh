#!/usr/bin/env bash
set -euo pipefail

BRANCH="main"
MSG="${1:-🔄 Sauvegarde auto - $(date +'%Y-%m-%d %H:%M:%S')}"

# Couleurs jolies
GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; NC='\033[0m'

# Vérif repo
git rev-parse --is-inside-work-tree >/dev/null 2>&1 || {
  echo -e "${RED}❌ Pas un dépôt Git ici.${NC}"; exit 1;
}

# Force la branche main
CURRENT_BRANCH="$(git rev-parse --abbrev-ref HEAD)"
if [ "$CURRENT_BRANCH" != "$BRANCH" ]; then
  echo -e "${YELLOW}🔁 Basculage vers ${BRANCH} (depuis ${CURRENT_BRANCH}).${NC}"
  git stash push -u -m "auto-stash-before-switch" >/dev/null 2>&1 || true
  git checkout "$BRANCH"
  git stash pop >/dev/null 2>&1 || true
fi

# Pull de sécurité
git pull --rebase origin "$BRANCH" || true

# Add + commit + push
git add -A
if git diff --cached --quiet; then
  echo -e "${YELLOW}ℹ️  Rien à committer.${NC}"
else
  git commit -m "$MSG"
fi

# Push sur main uniquement
echo -e "${GREEN}⬆️  Push sur ${BRANCH}…${NC}"
git push origin "$BRANCH"

echo -e "${GREEN}✅ Terminé.${NC}"
