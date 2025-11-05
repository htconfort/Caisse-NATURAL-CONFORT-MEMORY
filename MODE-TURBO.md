# 🚀 MYCONFORT MODE TURBO - Guide Complet

## 🎯 Configuration Initiale (à faire une seule fois)

```bash
# 1. Configuration automatique des alias et variables
./scripts/setup-turbo.sh

# 2. Installation des extensions VS Code recommandées
./scripts/install-extensions.sh

# 3. Redémarre ton terminal
source ~/.zshrc
```

## 🚀 Utilisation Quotidienne

### Démarrage Rapide
```bash
devmyconfort        # Ouvre VS Code avec optimisations
```

### Développement
```bash
# Dans VS Code, utilise Cmd+Shift+P > Tasks:
🚀 Dev Server (TURBO)     # npm run dev optimisé
🔨 Build Production       # Build avec 4GB RAM
🌐 Deploy Netlify        # Déploiement automatique
```

### Maintenance
```bash
cleanmyconfort     # Nettoyage complet et réinstallation
deploymyconfort    # Build + déploiement direct
```

## 🔧 Scripts Disponibles

| Script | Usage | Description |
|--------|-------|-------------|
| `./scripts/diagnostic.sh` | Diagnostic | État complet du système |
| `./scripts/setup-turbo.sh` | Configuration | Alias et variables auto |
| `./scripts/clean-install.sh` | Maintenance | Nettoyage et réinstall |
| `./scripts/start-turbo.sh` | Démarrage | Démarrage optimisé |
| `./scripts/install-extensions.sh` | Setup | Extensions VS Code |

## 🎛️ Variables d'Environnement

```bash
# Mémoire Node.js étendue (auto-configurée)
export NODE_OPTIONS=--max-old-space-size=4096
```

## 📱 URLs et Accès

- **Local:** `http://localhost:5173`
- **iPad:** `http://192.168.1.41:5173` *(IP affichée au démarrage)*
- **Production:** `https://caissemyconfort2025.netlify.app`

## 🧩 Extensions VS Code Installées

✅ **Développement:**
- GitHub Copilot & Copilot Chat
- Path Intellisense
- Auto Rename Tag

✅ **Qualité Code:**
- Error Lens
- SonarLint
- Prettier
- TypeScript Next

✅ **Framework:**
- Tailwind CSS IntelliSense
- GitLens

## 🔍 Dépannage Express

### Problème de performance
```bash
# Vérifier la config
./scripts/diagnostic.sh

# Si NODE_OPTIONS vide
source ~/.zshrc
```

### Build qui échoue
```bash
cleanmyconfort
```

### Extensions manquantes
```bash
./scripts/install-extensions.sh
```

### Cache VS Code corrompu
```bash
rm -rf ~/Library/Application\ Support/Code/Cache/*
```

## 🎯 Workflow Optimal

1. **Matin:** `devmyconfort`
2. **Développement:** Utilise les tâches VS Code
3. **Tests:** `Cmd+Shift+P` > `🚀 Dev Server (TURBO)`
4. **Déploiement:** `deploymyconfort`
5. **Fin:** Commit tes changements

## 📊 Métriques de Performance

- **Démarrage VS Code:** ~2-3 secondes
- **Build Time:** ~5-8 secondes (vs 15-20s avant)
- **Hot Reload:** ~200-500ms
- **Mémoire Node:** 4GB disponible

---

**🏆 Tu es maintenant en MODE TURBO !**

Toutes les optimisations sont actives. Utilise `devmyconfort` pour démarrer et profite d'un workflow ultra-rapide ! 🚀
