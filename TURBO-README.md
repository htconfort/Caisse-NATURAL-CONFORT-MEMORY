# 🚀 MyConfort Caisse - MODE TURBO

## 📋 Checklist de Démarrage Rapide

### 1. ⚙️ Configuration initiale (une seule fois)

Ajoute cette ligne à ton `~/.zshrc` pour optimiser Node.js :

```bash
export NODE_OPTIONS=--max-old-space-size=4096
```

Puis recharge ton terminal :
```bash
source ~/.zshrc
```

### 2. 🚀 Démarrage TURBO

**Option A : Script automatique**
```bash
./scripts/start-turbo.sh
```

**Option B : Alias personnalisé**
Ajoute dans ton `~/.zshrc` :
```bash
alias devmyconfort='export NODE_OPTIONS=--max-old-space-size=4096 && cd "/Users/brunopriem/CAISSE MYCONFORT/Caisse-MyConfort-3/mon-projet-vite" && code .'
```

Puis utilise :
```bash
devmyconfort
```

### 3. 🧹 Nettoyage rapide (si problèmes)

```bash
./scripts/clean-install.sh
```

Ou manuellement :
```bash
rm -rf node_modules package-lock.json .vite dist
npm install
```

## 🔧 Tâches VS Code Disponibles

Utilise `Cmd + Shift + P` > `Tasks: Run Task` :

- **🚀 Dev Server (TURBO)** - Serveur de développement optimisé
- **🔨 Build Production (TURBO)** - Build avec mémoire étendue
- **🌐 Deploy Netlify** - Déploiement automatique
- **🧹 Clean Install** - Nettoyage et réinstallation
- **🔍 Type Check** - Vérification TypeScript
- **✨ Format Code** - Formatage automatique

## 🧩 Extensions Recommandées

VS Code te proposera automatiquement d'installer :
- GitHub Copilot & Copilot Chat
- GitLens
- Path Intellisense  
- Tailwind CSS IntelliSense
- Prettier
- Error Lens
- SonarLint

## 📱 Commandes Principales

```bash
# Développement
npm run dev           # Serveur local (iPad accessible)
npm run build         # Build production
npm run deploy        # Déploiement Netlify complet

# Maintenance
npm run clean         # Nettoyage cache
npm run type-check    # Vérification types
npm run format        # Formatage code
```

## 🌐 URLs Importantes

- **Développement :** `http://localhost:5173`
- **iPad Local :** `http://[IP-MAC]:5173` (affiché au démarrage)
- **Production :** `https://caissemyconfort2025.netlify.app`

## 🆘 Dépannage Rapide

### Problème de mémoire Node.js
```bash
export NODE_OPTIONS=--max-old-space-size=4096
```

### VS Code lent
```bash
rm -rf ~/Library/Application\ Support/Code/Cache/*
rm -rf ~/Library/Application\ Support/Code/CachedData/*
```

### Build qui échoue
```bash
./scripts/clean-install.sh
npm run build
```

### Vendeuses non synchronisées
1. Ouvrir l'app sur `caissemyconfort2025.netlify.app`
2. Cliquer sur le bouton diagnostic (coin bas-droite)
3. Utiliser "Forcer la réinitialisation" si nécessaire

## 🎯 Version Actuelle

**Mon Panier Version 3.01**
- Mode Classique & Facturier
- Diagnostic des vendeuses intégré
- Optimisations iPad/Safari
- Cache intelligent
