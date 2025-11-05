# 🚀 Système de Release Automatisé Multi-Apps

## Scripts disponibles

```bash
# Structure actuelle (app principale)
npm run release       # Build + ZIP automatique
npm run release:prod  # Build + ZIP + Déploiement Netlify  
npm run preview       # Test en local avant déploiement

# Structure monorepo future
cd apps/facturation
npm run release       # Build + ZIP app Facturation
npm run release:prod  # Build + ZIP + Deploy app Facturation

cd apps/caisse  
npm run release       # Build + ZIP app Caisse
npm run release:prod  # Build + ZIP + Deploy app Caisse
```

## Création de nouvelles apps

```bash
# Créer une nouvelle app dans la structure monorepo
./scripts/create-app.sh facturation
./scripts/create-app.sh caisse
```

## Hooks Git Automatiques (Multi-Apps)

### Post-commit (automatique)
- ✅ Détecte automatiquement quelle(s) app(s) ont été modifiées
- ✅ Build + ZIP uniquement des apps concernées
- ✅ Compatible structure actuelle ET structure monorepo future
- ✅ Ignore les merge commits
- ✅ Archives horodatées par app

### Pre-push (automatique) 
- ✅ Se déclenche avant `git push` sur la branche `main`
- ✅ Déploie automatiquement les apps modifiées depuis le dernier push
- ✅ Variables Netlify spécifiques par app
- ✅ Ignore les autres branches

## Désactiver temporairement

```bash
# Désactiver pour toutes les apps
SKIP_RELEASE=1 git commit -m "docs: update [skip release]"
SKIP_RELEASE=1 git push

# Désactiver pour une app spécifique
cd apps/facturation
SKIP_RELEASE=1 npm run release
```

## Configuration Netlify Multi-Apps

### Structure Actuelle (app principale)
```bash
export NETLIFY_AUTH_TOKEN="votre_token_ici"
export NETLIFY_SITE_ID="site_id_app_principale"
```

### Structure Monorepo (multi-apps)
```bash
# Token commun pour toutes les apps
export NETLIFY_AUTH_TOKEN="votre_token_ici"

# IDs de site spécifiques par app
export NETLIFY_SITE_ID_FACTU="site_id_facturation"
export NETLIFY_SITE_ID_CAISSE="site_id_caisse"

# App principale (compatibilité)
export NETLIFY_SITE_ID="site_id_principale"
```

### Obtenir les credentials
```bash
# 1. Se connecter à Netlify
netlify login

# 2. Obtenir le token
netlify token  # copier le token

# 3. Lister les sites
netlify sites:list  # copier les IDs des sites

# 4. Configurer les variables (dans ~/.zshrc ou ~/.bash_profile)
echo 'export NETLIFY_AUTH_TOKEN="votre_token"' >> ~/.zshrc
echo 'export NETLIFY_SITE_ID_FACTU="site_id_facturation"' >> ~/.zshrc
echo 'export NETLIFY_SITE_ID_CAISSE="site_id_caisse"' >> ~/.zshrc
source ~/.zshrc
```

## Archives générées

- **Format** : `dist_AAAA-MM-JJ_HHMM.zip`
- **Localisation** : Bureau ou iCloud Drive Desktop
- **Contenu** : Build de production optimisé

## Workflow complet

1. **Développement** : `npm run dev`
2. **Modifications** : éditer le code
3. **Commit** : `git commit -m "feat: nouvelle fonctionnalité"`
   → ✅ Build + ZIP automatique via hook post-commit
4. **Push** : `git push origin main`
   → ✅ Déploiement automatique via hook pre-push
5. **Archive disponible** sur le Bureau pour distribution manuelle

## Dépannage

- **Hook ne se déclenche pas** : Vérifier que les fichiers modifiés sont dans `src/`, `public/`, `package.json`, etc.
- **Déploiement échoue** : Vérifier les variables `NETLIFY_AUTH_TOKEN` et `NETLIFY_SITE_ID`
- **Désactiver complètement** : `mv .git/hooks/post-commit .git/hooks/post-commit.disabled`
