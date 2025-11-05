# 🎁 Guide d'utilisation du bouton "Offert"

## ✅ Modifications apportées

### 1. Types mis à jour (`src/types/index.ts`)
```typescript
export interface ExtendedCartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  category: string;
  addedAt: Date;
  offert?: boolean;      // ✨ NOUVEAU
  originalPrice?: number; // ✨ NOUVEAU
}
```

### 2. FloatingCart mis à jour (`src/components/ui/FloatingCart.tsx`)
- ✅ Nouvelle prop `toggleOffert?: (itemId: string) => void`
- ✅ Bouton "🎁 Offert" pour chaque ligne produit
- ✅ Affichage visuel "Offert" avec badge vert
- ✅ Prix affiché à 0€ quand le produit est offert

## 🧩 Intégration dans votre composant principal

### Exemple d'implémentation dans App.tsx ou TabProducts.tsx :

```typescript
// 1️⃣ Fonction pour gérer le toggle "Offert"
const toggleOffert = (itemId: string) => {
  setCart((prevCart) =>
    prevCart.map((item) => {
      if (item.id === itemId) {
        if (!item.offert) {
          // Marquer comme offert : sauvegarder le prix original et mettre à 0
          return {
            ...item,
            offert: true,
            originalPrice: item.originalPrice || item.price,
            price: 0
          };
        } else {
          // Annuler l'offre : restaurer le prix original
          return {
            ...item,
            offert: false,
            price: item.originalPrice || item.price
          };
        }
      }
      return item;
    })
  );
};

// 2️⃣ Ajouter la prop au FloatingCart
<FloatingCart
  activeTab={activeTab}
  cart={cart}
  cartItemsCount={cartItemsCount}
  cartTotal={cartTotal}
  selectedVendor={selectedVendor}
  clearCart={clearCart}
  completeSale={completeSale}
  updateQuantity={updateQuantity}
  toggleOffert={toggleOffert} // ✨ NOUVEAU
/>
```

### Fonction lors de l'ajout au panier (pour préserver originalPrice) :

```typescript
const addToCart = (product: CatalogProduct) => {
  const newItem: ExtendedCartItem = {
    id: generateId(),
    name: product.name,
    price: product.priceTTC,
    originalPrice: product.priceTTC, // ✨ Sauvegarder le prix original
    quantity: 1,
    category: product.category,
    addedAt: new Date(),
    offert: false // ✨ Par défaut non offert
  };
  
  setCart(prev => [...prev, newItem]);
};
```

## 🎨 Comportement visuel

### Produit normal :
- Bouton : `🎁 Offert` (gris)
- Prix : `19.99€ × 2`
- Total ligne : `39.98€`

### Produit offert :
- Badge : `🎁 Offert` (vert)
- Bouton : `🎁 Annuler` (vert)
- Prix : `0.00€ × 2`
- Total ligne : `0.00€`

## 💾 Impact sur les ventes et factures

- ✅ Le `cartTotal` sera automatiquement recalculé (produits offerts = 0€)
- ✅ Dans les factures/RAZ, les lignes offertes apparaîtront avec prix unitaire 0€
- ✅ L'originalPrice est conservé pour pouvoir annuler l'offre

## 🚀 Déploiement

Après ces modifications :
1. Testez la fonctionnalité en local
2. Commitez les changements
3. Déployez sur Netlify pour les iPads

```bash
npm run build
git add .
git commit -m "✨ Ajouter bouton Offert 🎁 dans le panier"
git push
```
