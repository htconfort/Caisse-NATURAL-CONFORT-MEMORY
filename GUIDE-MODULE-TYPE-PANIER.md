# 🛒 Guide du Module Type de Panier

## ✅ Fonctionnalités implémentées

### 🎯 **Sélecteur de Type de Panier**
- **Panier Classique** : Produits standards (Oreillers, Couettes, Accessoires, Plateau)
- **Panier Facturier** : Tous produits y compris Matelas et Sur-matelas

### 🚫 **Blocage Intelligent**
- **Mode Classique** : Matelas et Sur-matelas désactivés automatiquement
- **Catégories bloquées** : Affichage visuel avec icône 🚫
- **Alertes informatives** si tentative d'ajout d'un produit bloqué

### 💾 **Sauvegarde Automatique**
- État du type de panier sauvegardé dans IndexedDB
- Persistance entre les sessions
- Clé de stockage : `'CART_TYPE'`

## 🔧 Architecture Technique

### **Composants modifiés :**

1. **`CartTypeSelector.tsx`** ✨ NOUVEAU
   - Sélecteur visuel avec feedback
   - Design cohérent MyConfort (vert #477A0C)
   - Informations contextuelles

2. **`FloatingCart.tsx`** 🔄 MODIFIÉ
   - Intégration du sélecteur dans le panier
   - Props `cartType` et `onCartTypeChange`

3. **`ProductsTab.tsx`** 🔄 MODIFIÉ
   - Filtrage des produits selon le type de panier
   - Blocage visuel des catégories interdites
   - Alertes utilisateur explicites

4. **`App.tsx`** 🔄 MODIFIÉ
   - État global `cartType` avec IndexedDB
   - Validation dans `addToCart()`
   - Propagation des props

5. **`types/index.ts`** 🔄 MODIFIÉ
   - Nouveau type `CartType = 'classique' | 'facturier'`

## 🎨 Expérience Utilisateur

### **Workflow Normal :**
1. **Sélection du type** dans le panier (FloatingCart)
2. **Navigation vers Produits** → catégories filtrées automatiquement
3. **Ajout au panier** → validation selon le type choisi
4. **Feedback visuel** immédiat en cas de blocage

### **Mode Classique :** 
- ✅ Couettes, Oreillers, Accessoires, Plateau disponibles
- 🚫 Matelas, Sur-matelas bloqués avec message explicite
- 💡 Suggestion de basculer en mode Facturier si besoin

### **Mode Facturier :**
- ✅ Toutes catégories disponibles
- 📄 Information que la vente sera synchronisée avec le facturier
- 🔄 Préparation pour intégration N8N

## 🚀 Avantages Business

### **Continuité d'activité :**
- ✅ Caisse fonctionnelle même sans N8N
- ✅ Pas de blocage en cas de problème réseau
- ✅ Mode dégradé transparent pour les vendeuses

### **Éviter les doublons :**
- ✅ Séparation claire : Matelas = Facturier
- ✅ Autres produits = Caisse directe
- ✅ Cohérence des flux de données

### **Formation simplifiée :**
- ✅ Règle simple : "Matelas → Facturier"
- ✅ Interface guidée avec messages explicites
- ✅ Pas d'erreur possible grâce aux blocages

## 🔌 Intégration Future N8N

Le système est prêt pour :
- **Détection automatique** du type de panier dans les webhooks
- **Routage différencié** selon `cartType`
- **Synchronisation conditionnelle** avec Google Sheets
- **Fallback automatique** en mode classique si N8N indisponible

## 📱 Optimisation iPad

- **Interface tactile** optimisée
- **Boutons suffisamment grands** pour usage tablette
- **Feedback visuel clair** (couleurs, icônes)
- **Messages d'alerte lisibles** et contextuels

---

## 🎯 Utilisation Recommandée

1. **Ventes simples** (oreillers, couettes) → **Panier Classique**
2. **Ventes avec matelas** → **Panier Facturier** 
3. **Problème N8N/réseau** → **Panier Classique** en mode secours
4. **Formation vendeuses** → Montrer les deux modes et leurs usages

**Le module est prêt pour production et déploiement iPad ! 🎉**
