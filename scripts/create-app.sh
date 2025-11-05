#!/usr/bin/env bash
set -euo pipefail

# Script pour créer une nouvelle app dans la structure monorepo
# Usage: ./scripts/create-app.sh <nom-app>

APP_NAME="${1:-}"
if [[ -z "$APP_NAME" ]]; then
  echo "❌ Usage: $0 <nom-app>"
  echo "   Exemple: $0 facturation"
  exit 1
fi

BASE_DIR="apps/$APP_NAME"

# Vérifier que l'app n'existe pas déjà
if [[ -d "$BASE_DIR" ]]; then
  echo "❌ L'app '$APP_NAME' existe déjà dans $BASE_DIR"
  exit 1
fi

echo "🚀 Création de l'app '$APP_NAME'..."

# Créer la structure
mkdir -p "$BASE_DIR"/{src,public,scripts}

# Copier le script de release
cp "scripts/build_and_release.sh" "$BASE_DIR/scripts/"
chmod +x "$BASE_DIR/scripts/build_and_release.sh"

# Créer package.json
cat > "$BASE_DIR/package.json" << EOF
{
  "name": "${APP_NAME}-app",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "engines": {
    "node": ">=20 <21"
  },
  "scripts": {
    "dev": "vite",
    "dev:ipad": "vite --host --port 5174",
    "type-check": "tsc --noEmit",
    "build:verify": "npm run type-check",
    "build": "vite build",
    "preview": "vite preview --host --port 5174",
    "lint": "eslint . --ext .ts,.tsx --max-warnings=0",
    "release": "scripts/build_and_release.sh",
    "release:prod": "NETLIFY_DEPLOY=1 scripts/build_and_release.sh"
  },
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1"
  },
  "devDependencies": {
    "@types/react": "^18.3.23",
    "@types/react-dom": "^18.3.7",
    "@vitejs/plugin-react": "^4.6.0",
    "eslint": "^9.30.1",
    "eslint-plugin-react-hooks": "^5.2.0",
    "eslint-plugin-react-refresh": "^0.4.20",
    "typescript": "~5.8.3",
    "vite": "^7.0.4"
  }
}
EOF

# Créer vite.config.ts
cat > "$BASE_DIR/vite.config.ts" << EOF
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  server: {
    host: true,
    port: 5174, // Port différent pour éviter les conflits
    strictPort: true,
  },
  preview: {
    host: true,
    port: 5174,
    strictPort: true,
  },
  build: {
    outDir: 'dist',
    target: 'es2020',
    sourcemap: false,
    minify: 'esbuild',
  },
});
EOF

# Créer tsconfig.json
cat > "$BASE_DIR/tsconfig.json" << EOF
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    }
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
EOF

# Créer index.html
cat > "$BASE_DIR/index.html" << EOF
<!doctype html>
<html lang="fr">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${APP_NAME^} App</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
EOF

# Créer _redirects pour Netlify
cat > "$BASE_DIR/public/_redirects" << EOF
/*  /index.html  200
EOF

# Créer main.tsx
cat > "$BASE_DIR/src/main.tsx" << EOF
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
EOF

# Créer App.tsx
cat > "$BASE_DIR/src/App.tsx" << EOF
import React from 'react'

function App() {
  return (
    <div style={{ padding: '2rem', textAlign: 'center' }}>
      <h1>${APP_NAME^} App</h1>
      <p>Application ${APP_NAME} prête pour le développement !</p>
      <p>
        <code>cd apps/${APP_NAME} && npm install && npm run dev</code>
      </p>
    </div>
  )
}

export default App
EOF

# Créer index.css
cat > "$BASE_DIR/src/index.css" << EOF
:root {
  font-family: Inter, system-ui, Avenir, Helvetica, Arial, sans-serif;
  line-height: 1.5;
  font-weight: 400;
  color-scheme: light dark;
  color: rgba(255, 255, 255, 0.87);
  background-color: #242424;
}

body {
  margin: 0;
  display: flex;
  place-items: center;
  min-width: 320px;
  min-height: 100vh;
}

#root {
  max-width: 1280px;
  margin: 0 auto;
  padding: 2rem;
  text-align: center;
}
EOF

echo "✅ App '$APP_NAME' créée avec succès !"
echo ""
echo "📁 Structure créée dans: $BASE_DIR"
echo ""
echo "🚀 Prochaines étapes:"
echo "   cd $BASE_DIR"
echo "   npm install"
echo "   npm run dev"
echo ""
echo "📦 Pour un release:"
echo "   cd $BASE_DIR"
echo "   npm run release"
echo ""
echo "🌐 Variables Netlify à configurer:"
echo "   export NETLIFY_SITE_ID_${APP_NAME^^}=\"votre_site_id\""
echo "   export NETLIFY_AUTH_TOKEN=\"votre_token\""
