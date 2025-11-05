# 🔧 Debug Data Panel - Guide d'utilisation

## Vue d'ensemble
Le **DebugDataPanel** est un outil de diagnostic complet intégré à votre application MyConfort Caisse pour résoudre les problèmes de synchronisation de données entre iPad et desktop.

## Accès au panel

### Méthodes d'ouverture :
1. **Raccourci clavier** : `Ctrl + Alt + D` (ou `⌘ + Alt + D` sur Mac)
2. **Programmation** : `window.dispatchEvent(new CustomEvent('open-debug-panel'))`

## Fonctionnalités

### 🗂️ Onglet "Données"
- **Vue d'ensemble des tables** : Affiche le nombre d'enregistrements dans chaque table IndexedDB
- **Échantillons** : Montre les 3 premiers enregistrements de chaque table
- **Tables surveillées** :
  - `sales` - Ventes enregistrées
  - `vendors` - Données des vendeurs
  - `cartItems` - Articles dans le panier
  - `stock` - Inventaire des produits
  - `sessions` - Sessions utilisateur

### 🛠️ Onglet "Environnement"
- **Variables de build** : MODE, VITE_CONTEXT, VITE_BRANCH, etc.
- **Informations de déploiement** : Commit SHA, heure de build
- **Configuration Firebase** : Projet ID utilisé

### 💾 Onglet "Stockage"
- **Utilisation IndexedDB** : Espace utilisé vs disponible
- **Graphique visuel** : Barre de progression avec codes couleurs
- **Alertes** : Rouge > 80%, Jaune > 60%, Vert < 60%

### ⚡ Onglet "Actions"

#### 📁 Export des données (JSON)
- **Action** : Télécharge toutes les données locales
- **Format** : Fichier JSON avec timestamp
- **Contenu** : Tables, environnement, statistiques de stockage
- **Usage** : Sauvegarde, analyse, transfert vers support technique

#### 🔄 Forcer la synchronisation
- **Action** : Re-synchronise avec la source distante
- **Usage** : Résoudre les inconsistances de données
- **Sécurité** : Demande confirmation avant exécution

#### 🌱 Re-seed données (DEV uniquement)
- **Disponibilité** : Mode développement seulement
- **Action** : Ajoute les données par défaut si tables vides
- **Usage** : Réinitialiser l'environnement de développement

#### ⚠️ Reset base locale (DANGER)
- **Action** : Supprime TOUTES les données locales
- **Sécurité** : Double confirmation requise
- **Effets** :
  - Suppression IndexedDB complète
  - Vidage localStorage et sessionStorage
  - Rechargement automatique de la page

## Résolution des problèmes iPad/Desktop

### Diagnostic rapide
1. **Ouvrir le panel** sur les deux appareils
2. **Comparer les onglets "Données"** :
   - Nombre d'enregistrements par table
   - Échantillons de données récents
3. **Vérifier l'onglet "Environnement"** :
   - Même version de build (VITE_COMMIT_REF)
   - Même configuration

### Solutions courantes

#### Problème : Données manquantes sur iPad
**Solution** :
1. Onglet "Actions" → "Forcer la synchronisation"
2. Si échec → "Export des données" sur desktop → Analyse
3. En dernier recours → "Reset base locale" sur iPad

#### Problème : Doublons entre appareils
**Solution** :
1. Identifier l'appareil avec données correctes via échantillons
2. "Export des données" depuis l'appareil correct
3. "Reset base locale" sur l'appareil problématique
4. Re-synchronisation automatique au redémarrage

#### Problème : Espace de stockage saturé
**Solution** :
1. Onglet "Stockage" → Vérifier l'utilisation
2. Si > 80% → "Export des données" (sauvegarde)
3. "Reset base locale" pour libérer l'espace
4. Re-synchronisation des données essentielles

## Sécurité et bonnes pratiques

### ⚠️ Avant reset complet
1. **TOUJOURS** exporter les données d'abord
2. Vérifier que la synchronisation fonctionne
3. S'assurer d'avoir une sauvegarde récente

### 🔐 Accès restreint
- Panel accessible uniquement aux administrateurs
- Actions destructives demandent confirmation
- Logs automatiques de toutes les actions

### 📊 Surveillance
- Utiliser l'export JSON pour analyser les tendances
- Surveiller l'usage de stockage régulièrement
- Comparer les environnements entre appareils

## Cas d'usage spécifiques

### Nouvel iPad à configurer
1. Export données depuis caisse principale
2. Reset base locale sur nouvel iPad
3. Configuration initiale + synchronisation

### Migration de données
1. Export complet depuis ancien système
2. Analyse du fichier JSON
3. Import sélectif des données nécessaires

### Support technique
1. Export données de l'appareil problématique
2. Envoi du fichier JSON au support
3. Diagnostic détaillé avec environnement complet

---

**Note** : Ce panel est un outil puissant. Utilisez les actions destructives avec précaution et toujours après avoir fait une sauvegarde.
