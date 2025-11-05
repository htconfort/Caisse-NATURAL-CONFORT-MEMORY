# ⚙️ Configuration VS Code Optimisée – MyConfort Dev

## ✅ Extensions actives

| Extension        | Fonction | Statut |
|------------------|----------|--------|
| **Tabnine**       | Suggestions IA complémentaires à Copilot | ✅ Activée |
| **IntelliCode**   | Suggestions AI Microsoft | ✅ Activée |
| **ESLint**        | Vérifie et corrige automatiquement ton code | ✅ "onSave" |
| **Prettier**      | Formate automatiquement le code | ✅ "onSave" |

---

## 🛠️ Comportement des outils

### 🔧 ESLint (onSave)
- ✅ Exécuté uniquement à la **sauvegarde** (`Ctrl+S`)
- ✅ Pas de déclenchement à chaque frappe (meilleure perf)
- ✅ Correction automatique des erreurs simples (`--fix`)

### 🎨 Prettier (onSave)
- ✅ Formatage automatique
- 🧠 Adapté à :
  - `React`
  - `TypeScript`
  - `TailwindCSS` (si présent)
- ⚙️ Cohérent avec les règles ESLint pour éviter les conflits

---

## 📦 Scripts `package.json` ajoutés

```json
{
  "scripts": {
    "dev": "vite",
    "lint": "eslint . --ext .ts,.tsx --max-warnings=0",
    "lint:fix": "eslint . --ext .ts,.tsx --fix",
    "format": "prettier --write \"src/**/*.{ts,tsx,js,jsx,json,css,md}\"",
    "format:check": "prettier --check \"src/**/*.{ts,tsx,js,jsx,json,css,md}\""
  }
}
```

---

## 🚀 Commandes disponibles

| Commande         | Description |
|------------------|-------------|
| `npm run dev`     | Lance Vite (dev server) |
| `npm run lint`    | Analyse le code avec ESLint |
| `npm run lint:fix`| Corrige automatiquement les erreurs ESLint |
| `npm run format`  | Formate tous les fichiers avec Prettier |
| `npm run format:check` | Vérifie le formatage sans modifier |

---

## 🤖 Environnement AI fluide

- ⚡ **Copilot** et **Tabnine** cohabitent sans ralentissement
- 🤝 ESLint + Prettier travaillent ensemble sans se marcher dessus
- 🧘‍♂️ Zéro lag même sur fichiers longs

---

## 🧠 Recommandations

- ✅ Garde tes fichiers < 300 lignes si possible
- ✅ Fractionne les composants (`/components`)
- ✅ Utilise `// Copilot: off` dans les blocs lourds
- 🚨 Si ça lag : `Cmd+Shift+P → Developer: Reload Window`

---

## 📁 Fichiers de configuration créés

```
mon-projet-vite/
├── .vscode/
│   └── settings.json          # Configuration workspace VS Code
├── .prettierrc                # Configuration Prettier
├── .prettierignore           # Fichiers ignorés par Prettier
├── eslint.config.js          # Configuration ESLint (flat config)
└── docs/
    └── Configuration_VSCode_MyConfort.md  # Cette documentation
```

---

## 🔧 Configuration VS Code (.vscode/settings.json)

- **Format on Save** : Activé pour tous les types de fichiers
- **ESLint on Save** : Corrections automatiques appliquées
- **Performance optimisée** : ESLint s'exécute uniquement à la sauvegarde
- **Extensions recommandées** : Liste pour les nouveaux développeurs

---

## ⚡ Performance & Optimisation

### Extensions installées automatiquement :
- `esbenp.prettier-vscode`
- `dbaeumer.vscode-eslint` 
- `visualstudioexptteam.vscodeintellicode`
- `tabnine.tabnine-vscode`
- `rvest.vs-code-prettier-eslint`
- `dsznajder.es7-react-js-snippets`

### Configuration optimisée :
- Pas de linting en temps réel (seulement onSave)
- Auto-fix ESLint à chaque sauvegarde
- Formatage Prettier automatique
- Suggestions IA intelligentes (Tabnine + IntelliCode)
