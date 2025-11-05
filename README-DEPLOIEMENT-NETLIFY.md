# 🚀 Guide de Pré-déploiement Netlify - MyConfort

## 🎯 Objectif

Mettre en place un pré-déploiement Netlify sécurisé pour l'app MyConfort (Vite/React), avec vérifications locales et deploy preview isolé (alias), sans impacter la production.

## ✅ Prérequis

### Node 20.11.1 (aligné Netlify & local)

```bash
# si nvm
nvm use 20.11.1
```

### Vite configuré sur port 5173 avec strictPort: true (dans vite.config.ts)

### CLI Netlify :

```bash
npm i -g netlify-cli
netlify login
```

## 📁 Fichiers de config

### netlify.toml
```toml
[build]
  command = "npm ci && npm run build"
  publish = "dist"

[build.environment]
  NODE_VERSION = "20.11.1"
  NPM_FLAGS = "--no-audit --no-fund"

# ignore: ne publie pas si seuls docs/ ont changé (optionnel)
[build]
  ignore = "git diff --quiet HEAD^ HEAD -- . ':(exclude)docs' || echo 'CHANGED' | grep -q '^$'"

[context.deploy-preview]
  command = "npm ci && npm run build:verify && npm run build"

[context.production]
  command = "npm ci && npm run build:verify && npm run build"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

### _redirects (recommandé, SPA)
```
/*    /index.html   200
```

Place‐le dans `public/_redirects` pour qu'il soit copié dans `dist/`.

### .nvmrc
```
20.11.1
```

### .env.example
```bash
VITE_APP_NAME=MyConfort
# VITE_API_BASE_URL=https://api-preprod.example.com
```

## 📦 Scripts package.json
```json
{
  "scripts": {
    "dev": "vite",
    "dev:ipad": "vite --host --port 5173",
    "type-check": "tsc --noEmit",
    "build:verify": "npm run type-check",
    "build": "vite build",
    "preview": "vite preview --host --port 5173",

    "predeploy:netlify": "npm run build:verify && npm run build",
    "deploy:netlify:preview": "netlify deploy --build --dir=dist --alias=preprod",
    "deploy:netlify:draft": "netlify deploy --dir=dist"
  }
}
```

## 🚀 Workflow de pré-déploiement (safe)

### 1. Vérifier types + build local

```bash
npm run predeploy:netlify
```

### 2. Dry-run Netlify (facultatif, utile pour reproduire)

```bash
netlify build
```

### 3. Déployer un PREVIEW isolé (alias "preprod")

```bash
npm run deploy:netlify:preview
# -> URL fournie par Netlify, ex: https://preprod--ton-site.netlify.app
```

### 4. (Option) Déploiement "brouillon" non publié

```bash
npm run deploy:netlify:draft
# -> URL privée de draft, n'affecte ni preview ni prod
```

**🔒 Tant que tu n'utilises pas "Publish to production" côté Netlify, rien n'impacte la prod.**

## ✅ Checklist avant push

- [ ] `npm run type-check` sans erreurs
- [ ] `npm run build` OK → dossier `dist/` généré
- [ ] `_redirects` présent (via `public/_redirects`)
- [ ] Variables `VITE_*` renseignées dans Netlify → Site settings → Environment variables
- [ ] `NODE_VERSION = 20.11.1` (Netlify & .nvmrc)

## 🧪 Vérifications manuelles

### Local preview :

```bash
npm run preview
# http://localhost:5173
```

### Vérifier l'alias preprod (Netlify) :

- Navigation SPA OK (refresh sur routes → 200)
- Assets versionnés (`/assets/index-xxxxx.js`)

## 🛠️ Dépannage rapide

### Erreur EBADENGINE / Node

Assure-toi d'avoir `NODE_VERSION=20.11.1` dans `netlify.toml` + `.nvmrc` local.

### 404 sur refresh d'une route SPA

`_redirects` manquant → place `public/_redirects` ou garde la section `[[redirects]]` dans `netlify.toml`.

### TypeScript bloque le build

`npm run type-check` localement et corrige les erreurs (évite de déployer tant que ça échoue).

### Port différent de 5173

Vérifie `vite.config.ts` → `server.port = 5173` + `strictPort: true`.

## 🔐 Bonnes pratiques (anti-casse)

- Verrouiller branche = `main` (hooks git pre-push), et utiliser le script `auto-commit.sh`.
- Toujours tester `predeploy:netlify` avant tout `deploy:netlify:*`.
- Garder les redirects dans `public/_redirects` (copié automatiquement dans `dist/`).
- Documenter les variables `VITE_*` nécessaires dans `.env.example`.

## 🧭 Passage en production (plus tard)

Quand tout est validé en preview :

1. Publie via l'interface Netlify ("Publish deploy") ou configure le repo pour build auto sur push main.
2. Conserve `build:verify` pour empêcher un build prod si TS échoue.

---

*Documentation générée pour le projet MyConfort - Version 1.0*
