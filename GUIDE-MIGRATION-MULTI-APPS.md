# 🏗️ Guide Migration vers Architecture Multi-Apps

## Structure Monorepo Cible

```
/monorepo
  /apps
    /facturation
      package.json
      scripts/build_and_release.sh
      src/
      public/
      vite.config.ts
      tsconfig.json
    /caisse
      package.json  
      scripts/build_and_release.sh
      src/
      public/
      vite.config.ts
      tsconfig.json
  .git/
  .gitignore
  README.md
```

## Migration depuis Structure Actuelle

### 1. Créer la structure apps/

```bash
mkdir -p apps/facturation apps/caisse

# Déplacer l'app actuelle vers facturation
cp -r mon-projet-vite/* apps/facturation/
# ou
mv mon-projet-vite apps/facturation

# Dupliquer pour caisse (à adapter ensuite)
cp -r apps/facturation apps/caisse
```

### 2. Script build_and_release.sh (dans chaque app)

Le script actuel fonctionne déjà parfaitement pour chaque app :

```bash
# apps/facturation/scripts/build_and_release.sh
# apps/caisse/scripts/build_and_release.sh
# (contenu identique au script actuel)
```

### 3. Package.json de chaque app

```json
{
  "name": "facturation-app",
  "scripts": {
    "dev": "vite",
    "build": "vite build", 
    "preview": "vite preview --host",
    "release": "scripts/build_and_release.sh",
    "release:prod": "NETLIFY_DEPLOY=1 scripts/build_and_release.sh"
  }
}
```

### 4. Variables d'environnement

```bash
# Token commun Netlify
export NETLIFY_AUTH_TOKEN="votre_token_ici"

# IDs de site par app
export NETLIFY_SITE_ID_FACTU="site_id_facturation"
export NETLIFY_SITE_ID_CAISSE="site_id_caisse"

# App principale (structure actuelle)
export NETLIFY_SITE_ID="site_id_principal"
```

## Hooks Git Multi-Apps

Les hooks ont été adaptés pour supporter :

### ✅ Structure Actuelle
- Détecte les changements dans `mon-projet-vite/src/`, `package.json`, etc.
- Fonctionne avec la structure existante

### ✅ Structure Monorepo Future
- Détecte séparément `apps/facturation/` et `apps/caisse/`
- Build et déploie uniquement les apps modifiées
- Variables Netlify spécifiques par app

## Commandes par App

### Structure actuelle (racine)
```bash
npm run release          # App principale
npm run release:prod     # App principale + deploy
```

### Structure monorepo future
```bash
# Facturation
cd apps/facturation
npm run release
npm run release:prod

# Caisse  
cd apps/caisse
npm run release
npm run release:prod
```

## Automation Git

### Post-commit
- ✅ Détecte automatiquement quelle(s) app(s) ont changé
- ✅ Build + ZIP uniquement les apps concernées
- ✅ Compatible structure actuelle ET future

### Pre-push (sur main)
- ✅ Déploie automatiquement les apps modifiées
- ✅ Variables Netlify par app (`NETLIFY_SITE_ID_FACTU`, `NETLIFY_SITE_ID_CAISSE`)
- ✅ Fallback intelligent si variables manquantes

## Test de Migration

1. **Garder structure actuelle** → tout fonctionne déjà
2. **Ajouter apps/ en parallèle** → hooks détectent les deux
3. **Migrer progressivement** → désactiver l'ancienne quand prêt

## Désactivation Ponctuelle

```bash
# Skip pour toutes les apps
SKIP_RELEASE=1 git commit -m "docs: update [skip release]"
SKIP_RELEASE=1 git push

# App-specific (dans le futur)
cd apps/facturation
SKIP_RELEASE=1 npm run release
```

## Avantages Architecture Multi-Apps

- 🚀 **Build sélectif** : seules les apps modifiées sont buildées
- 🎯 **Déploiement ciblé** : deploy indépendant par app
- 📦 **Archives séparées** : ZIP par app avec horodatage
- ⚡ **Performance** : pas de rebuild inutile
- 🔧 **Maintenance** : configuration par app
- 📱 **Évolutivité** : ajouter facilement de nouvelles apps
