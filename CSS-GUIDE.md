# 🎨 Guide CSS MyConfort - Système de Design

## 📋 Vue d'ensemble

Ce guide présente le système de design CSS moderne de l'application Caisse MyConfort, basé sur les meilleures pratiques de développement front-end.

## 🎯 Architecture CSS

### 📁 Structure des fichiers
```
src/styles/
├── variables.css      # Variables CSS globales
├── utilities.css      # Classes utilitaires réutilisables
├── index-modern.css   # Styles de base et reset
└── invoices-modern.css # Styles spécifiques aux factures
```

## 🎨 Système de variables

### 🎨 Couleurs
```css
/* Couleurs principales */
--primary-color: #477A0C;    /* Vert MyConfort */
--secondary-color: #14281D;  /* Vert foncé */
--accent-color: #F55D3E;     /* Rouge accent */

/* Couleurs vendeuses */
--vendor-sylvie: #477A0C;
--vendor-babette: #F55D3E;
--vendor-lucia: #14281D;
--vendor-billy: #FFFF99;
/* ... */
```

### 📏 Typographie
```css
/* Tailles de police */
--font-size-xs: 0.75rem;     /* 12px */
--font-size-sm: 0.875rem;    /* 14px */
--font-size-base: 1rem;      /* 16px */
--font-size-lg: 1.125rem;    /* 18px */
--font-size-xl: 1.25rem;     /* 20px */
--font-size-2xl: 1.5rem;     /* 24px */
--font-size-3xl: 1.875rem;   /* 30px */
--font-size-4xl: 2.25rem;    /* 36px */
```

### 📐 Espacement
```css
/* Système d'espacement cohérent */
--spacing-1: 0.25rem;  /* 4px */
--spacing-2: 0.5rem;   /* 8px */
--spacing-3: 0.75rem;  /* 12px */
--spacing-4: 1rem;     /* 16px */
--spacing-6: 1.5rem;   /* 24px */
--spacing-8: 2rem;     /* 32px */
```

## 🧩 Classes utilitaires

### 🔲 Boutons
```css
.btn              /* Bouton de base */
.btn-primary      /* Bouton principal */
.btn-secondary    /* Bouton secondaire */
.btn-accent       /* Bouton accent */
.btn-sm           /* Petit bouton */
.btn-lg           /* Grand bouton */
```

**Exemple d'utilisation :**
```jsx
<button className="btn btn-primary btn-lg">
  Valider la facture
</button>
```

### 🎴 Cartes
```css
.card             /* Carte de base */
.card-header      /* En-tête de carte */
.card-body        /* Corps de carte */
.card-footer      /* Pied de carte */
```

**Exemple d'utilisation :**
```jsx
<div className="card">
  <div className="card-header">
    <h3>Facture #001</h3>
  </div>
  <div className="card-body">
    <p>Contenu de la facture...</p>
  </div>
</div>
```

### 🏷️ Badges
```css
.badge            /* Badge de base */
.badge-primary    /* Badge principal */
.badge-success    /* Badge succès */
.badge-warning    /* Badge attention */
.badge-error      /* Badge erreur */
.badge-discount   /* Badge remise */
```

**Exemple d'utilisation :**
```jsx
<span className="badge badge-discount">-20%</span>
<span className="badge badge-success">Payé</span>
```

### 📝 Typographie
```css
.text-xs .text-sm .text-base .text-lg .text-xl .text-2xl
.font-light .font-normal .font-medium .font-semibold .font-bold
.text-primary .text-secondary .text-accent .text-success
```

### 📐 Layout et espacement
```css
.flex .inline-flex .grid .block .hidden
.flex-col .flex-row
.items-center .items-start .items-end
.justify-center .justify-between .justify-around
.gap-1 .gap-2 .gap-3 .gap-4 .gap-6 .gap-8
.p-1 .p-2 .p-3 .p-4 .p-6 .p-8
.m-1 .m-2 .m-3 .m-4 .m-6 .m-8
```

## 🎨 Thème couleurs vendeuses

### 🎯 Usage automatique
```jsx
// Le composant InvoiceCard applique automatiquement
// les couleurs selon la vendeuse
<InvoiceCard invoice={invoice} />
```

### 🎨 Classes spéciales
```css
.vendor-header     /* Header coloré par vendeuse */
.vendor-border     /* Bordure colorée par vendeuse */
```

## 🔄 Animations et transitions

### ⚡ Transitions
```css
.transition-all    /* Transition sur toutes les propriétés */
--transition-fast: all 0.15s ease-in-out;
--transition-normal: all 0.3s ease-in-out;
--transition-slow: all 0.5s ease-in-out;
```

### 🎬 Animations
```css
.animate-fadeIn     /* Fondu d'entrée */
.animate-slideUp    /* Glissement vers le haut */
.animate-bounce     /* Rebond */
.animate-pulse      /* Pulsation */
```

## 📱 Responsive Design

### 📏 Breakpoints
```css
--breakpoint-sm: 640px;   /* Mobile */
--breakpoint-md: 768px;   /* Tablette */
--breakpoint-lg: 1024px;  /* Desktop */
--breakpoint-xl: 1280px;  /* Large desktop */
```

### 📱 Classes responsive
```css
.sm\:hidden         /* Masqué sur mobile */
.md\:flex           /* Flex sur tablette+ */
.lg\:grid-cols-3    /* 3 colonnes sur desktop+ */
```

## 💰 Gestion des prix et remises

### 💸 Classes spécialisées
```css
.price-original     /* Prix original (barré) */
.price-current      /* Prix actuel */
.price-discount     /* Informations de remise */
```

**Exemple complet :**
```jsx
<div className="price-comparison">
  <span className="price-original">199.00€</span>
  <span className="price-current">159.20€</span>
  <span className="price-discount">Remise: -39.80€</span>
</div>
```

## 🏷️ Statuts et badges

### 📊 Classes de statut
```css
.status-pending     /* En attente */
.status-available   /* Disponible */
.status-delivered   /* Livré */
.status-cancelled   /* Annulé */
```

## 🎯 Bonnes pratiques

### ✅ À faire
- Utiliser les variables CSS pour la cohérence
- Privilégier les classes utilitaires pour l'espacement
- Respecter la hiérarchie typographique
- Tester sur tous les breakpoints

### ❌ À éviter
- Styles inline (sauf couleurs vendeuses dynamiques)
- Valeurs hardcodées au lieu des variables
- Classes CSS trop spécifiques
- Animations trop agressives

## 🚀 Exemples d'utilisation

### 📄 Carte de facture complète
```jsx
<div className="card hover:shadow-lg transition-all">
  <div className="vendor-header" style={{backgroundColor: vendorColor}}>
    <h3 className="text-2xl font-bold">Sophie Dubois</h3>
  </div>
  
  <div className="card-body">
    <div className="flex justify-between items-start mb-6">
      <div>
        <h3 className="text-3xl font-bold mb-2">Client Name</h3>
        <p className="text-lg">contact@email.com</p>
      </div>
      <div className="text-right">
        <span className="badge badge-success">Payé</span>
        <p className="text-4xl font-bold mt-2">1,498.00€</p>
      </div>
    </div>
    
    <div className="products-list">
      <div className="product-item vendor-border">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-2xl font-bold">Matelas Premium</span>
            <span className="badge badge-discount">-20%</span>
          </div>
          <div className="price-comparison">
            <span className="price-original">1,200.00€</span>
            <span className="price-current">960.00€</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>
```

### 🎨 Formulaire avec classes utilitaires
```jsx
<form className="card">
  <div className="card-header">
    <h2 className="text-2xl font-bold">Nouvelle facture</h2>
  </div>
  
  <div className="card-body">
    <div className="grid gap-4 md:grid-cols-2">
      <div className="flex flex-col gap-2">
        <label className="font-semibold">Client</label>
        <input className="p-3 border-2 rounded-lg" />
      </div>
      
      <div className="flex flex-col gap-2">
        <label className="font-semibold">Montant</label>
        <input className="p-3 border-2 rounded-lg" />
      </div>
    </div>
  </div>
  
  <div className="card-footer">
    <div className="flex gap-4 justify-end">
      <button className="btn btn-secondary">Annuler</button>
      <button className="btn btn-primary">Créer</button>
    </div>
  </div>
</form>
```

---

## 🔗 Ressources utiles

- [Documentation CSS Variables](https://developer.mozilla.org/fr/docs/Web/CSS/Using_CSS_custom_properties)
- [Guide Flexbox](https://css-tricks.com/snippets/css/a-guide-to-flexbox/)
- [Guide CSS Grid](https://css-tricks.com/snippets/css/complete-guide-grid/)
- [Responsive Design](https://developer.mozilla.org/fr/docs/Learn/CSS/CSS_layout/Responsive_Design)

**🎯 Ce système garantit une interface cohérente, accessible et maintenable pour l'application Caisse MyConfort.**
