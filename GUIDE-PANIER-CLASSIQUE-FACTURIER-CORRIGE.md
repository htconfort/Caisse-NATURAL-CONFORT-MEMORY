# 🛒 Guide Panier Classique vs Facturier - LOGIQUE CORRIGÉE

## 🎯 **Logique de fonctionnement :**

### 🛒 **Mode "Classique"** (par défaut)
- ✅ **Toutes les catégories** disponibles
- ✅ **Matelas et Sur-matelas** vendables directement
- 💰 Vente immédiate via la caisse
- 📊 Enregistrement direct dans les stats quotidiennes

### 📄 **Mode "Facturier"**  
- ⚠️ **Matelas et Sur-matelas BLOQUÉS**
- ✅ Autres catégories (Couettes, Oreillers, etc.) disponibles
- 🔄 Évite les doublons avec les factures N8N
- 🛡️ Mode sécurisé quand le workflow facturier est actif

## 🚨 **Cas d'usage stratégiques :**

### 💡 **Continuité d'activité**
- **N8N en panne ou connexion coupée** ➜ Basculer en **"Classique"**
- **Workflow facturier opérationnel** ➜ Utiliser **"Facturier"** 
- **Vente urgente** ➜ Mode **"Classique"** pour débloquer

### 🎯 **Prévention des doublons**
- Mode **"Facturier"** = Matelas gérés par l'app externe + N8N
- Mode **"Classique"** = Tout géré localement par la caisse

## ✅ **Fonctionnalités intégrées :**

1. **Sélecteur visuel** dans le panier (2 boutons)
2. **Blocage intelligent** des catégories selon le mode
3. **Messages d'erreur explicites** si tentative d'ajout bloqué
4. **Sauvegarde du choix** dans le localStorage
5. **Interface iPad-friendly** avec feedback visuel

## 🔧 **Intégration technique :**

- **Type TypeScript** : `CartType = 'classique' | 'facturier'`
- **Composant** : `CartTypeSelector` dans le FloatingCart
- **Filtrage** : Logique dans ProductsTab et addToCart
- **Persistance** : État sauvé avec useIndexedStorage

## 🎮 **Usage pour les vendeuses :**

1. **Par défaut** : Mode "Classique" (tout disponible)
2. **Si workflow N8N actif** : Basculer en "Facturier" 
3. **En cas de panne** : Revenir en "Classique"
4. **Message clair** : Explication à chaque blocage

---

✅ **Cette logique évite les doublons tout en gardant la flexibilité opérationnelle !**
