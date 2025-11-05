# 🚀 Turbo Mode MyConfort - Guide d'utilisation

## 🔧 Scripts disponibles

### 1. Activation du Turbo Mode
```bash
./turbo-mode.sh
```
Active la configuration VS Code optimisée pour React + Vite + TypeScript

### 2. Reset Vite en cas de problème
```bash
./vite-reset.sh
```
Résout les problèmes de port 5173 bloqué

### 3. Lancement normal du projet
```bash
npm run dev
```

## ⚡ Optimisations incluses

- **Interface allégée** : Pas de minimap, pas de prévisualisation
- **Formatage automatique** : ESLint + Prettier à chaque sauvegarde
- **Copilot optimisé** : Suggestions uniquement pour le code
- **TypeScript rapide** : Logs désactivés, diagnostics optimisés
- **Tailwind IntelliSense** : Autocomplétion des classes CSS
- **Exclusions de fichiers** : Cache et dossiers inutiles masqués

## 🎯 Commandes utiles

| Action | Commande |
|--------|----------|
| Activer Turbo Mode | `./turbo-mode.sh` |
| Résoudre port bloqué | `./vite-reset.sh` |
| Linter le code | `npm run lint` |
| Corriger automatiquement | `npm run lint:fix` |
| Formater tous les fichiers | `npm run format` |

## 🧠 Tips pour Flow (dictée)

Pour éviter les interférences avec la dictée vocale :
- Smart formatting : **Désactivé**
- Command Mode : **Désactivé** 
- IDE Recognition : **Désactivé**
- VS Code dans Ignore List : **Ajouté**

## 🔄 Restaurer l'ancienne config

Si tu veux revenir à l'ancienne configuration :
```bash
mv .vscode/settings.json.backup .vscode/settings.json
```

---

🎉 **Enjoy coding at light speed!** ⚡
