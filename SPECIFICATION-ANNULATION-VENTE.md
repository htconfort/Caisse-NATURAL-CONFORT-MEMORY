# 🔄 SPÉCIFICATION : ANNULATION VENTE APP FACTURATION

**Date :** 26 octobre 2025  
**Build :** `c90183c`  
**Statut :** ⏳ **À DÉVELOPPER**

---

## 🎯 OBJECTIF

Permettre l'annulation d'une vente effectuée via l'App Facturation **après coup**, pour gérer les retours clients ou les erreurs de facturation.

---

## 📋 SCÉNARIO D'USAGE

### **Cas d'usage 1 : Retour client**
- **1er novembre 2025 :** Client achète un matelas (500€)
- **3 novembre 2025 :** Client demande retour (produit défectueux)
- **Action :** Annuler la facture via onglet "Annulation"

### **Cas d'usage 2 : Erreur facturation**
- **Vendeuse :** Erreur de saisie dans App Facturation
- **Problème :** Produit facturé au mauvais prix
- **Solution :** Annuler et refaire la facture

---

## 🚨 CONTRAINTES CRITIQUES

### ✅ **Autorisé :**
- Annulation dans les **7 jours** suivant la vente
- Annulation **avant** RAZ Fin Session
- Annulation **après** RAZ Journée (si toujours dans délai)

### ❌ **Interdit :**
- Annulation **après** clôture session
- Annulation si déjà remboursée
- Annulation de facture > 7 jours

---

## 🔧 IMPLÉMENTATION TECHNIQUE

### **1. Base de données Supabase**

#### **Nouveaux champs dans `factures_full`**

```sql
-- Ajouter colonnes pour suivi annulation
ALTER TABLE factures_full 
ADD COLUMN annulee BOOLEAN DEFAULT FALSE,
ADD COLUMN annulee_le TIMESTAMP,
ADD COLUMN annulee_par VARCHAR(255),
ADD COLUMN motif_annulation TEXT;
```

#### **Index pour performance**

```sql
CREATE INDEX idx_factures_full_annulee ON factures_full(annulee);
CREATE INDEX idx_factures_full_created_at ON factures_full(created_at DESC);
```

---

### **2. Interface Utilisateur**

#### **Fichier :** `src/components/tabs/CancellationTab.tsx`

#### **Nouveau composant :** `CancelLastInvoiceSection`

```typescript
interface CancelLastInvoiceSectionProps {
  recentInvoices: SupabaseInvoice[];
  onCancelSuccess: () => void;
}

const CancelLastInvoiceSection: React.FC<CancelLastInvoiceSectionProps> = ({
  recentInvoices,
  onCancelSuccess
}) => {
  const [showModal, setShowModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<SupabaseInvoice | null>(null);
  
  // ... implementation
};
```

#### **Modal de sélection d'invoice**

**Critères d'affichage :**
- ✅ Pas déjà annulée (`annulee = false`)
- ✅ Créée dans les 7 derniers jours
- ✅ Session encore active
- ✅ Tri par date descendante (plus récente en haut)

**Informations affichées :**
- Numéro facture (`numero_facture`)
- Date et heure (`created_at`)
- Vendeuse (`conseiller`)
- Montant (`montant_ttc`)
- Produits (liste complète)
- Mode de paiement (`payment_method`)

---

### **3. Logique d'annulation**

#### **Fichier :** `src/services/invoiceCancellationService.ts` (NOUVEAU)

```typescript
export class InvoiceCancellationService {
  /**
   * Annuler une facture Supabase
   * @param invoiceNumber Numéro de la facture à annuler
   * @param canceledBy Qui annule (ex: "Bruno")
   * @param reason Raison de l'annulation (optionnel)
   * @returns true si succès, false si erreur
   */
  static async cancelInvoice(
    invoiceNumber: string,
    canceledBy: string,
    reason?: string
  ): Promise<boolean> {
    try {
      // 1. Vérifier que la facture n'est pas déjà annulée
      const { data: invoice, error: fetchError } = await supabase
        .from('factures_full')
        .select('*')
        .eq('numero_facture', invoiceNumber)
        .single();
      
      if (fetchError) throw new Error('Facture introuvable');
      if (invoice.annulee) throw new Error('Facture déjà annulée');
      
      // 2. Vérifier délai de 7 jours
      const invoiceDate = new Date(invoice.created_at);
      const now = new Date();
      const daysDiff = Math.floor((now.getTime() - invoiceDate.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysDiff > 7) {
        throw new Error('Impossible d\'annuler une facture de plus de 7 jours');
      }
      
      // 3. Vérifier session active
      const { data: currentSession } = await supabase
        .from('sessions')
        .select('*')
        .eq('active', true)
        .single();
      
      if (!currentSession) {
        throw new Error('Aucune session active - Annulation impossible');
      }
      
      // 4. Marquer facture comme annulée
      const { error: updateError } = await supabase
        .from('factures_full')
        .update({
          annulee: true,
          annulee_le: new Date().toISOString(),
          annulee_par: canceledBy,
          motif_annulation: reason || 'Non spécifié'
        })
        .eq('numero_facture', invoiceNumber);
      
      if (updateError) throw updateError;
      
      // 5. Recalculer CA journalier et Stock vendu (via événement personnalisé)
      window.dispatchEvent(new CustomEvent('invoice-canceled', {
        detail: { invoice }
      }));
      
      console.log('✅ Facture annulée avec succès:', invoiceNumber);
      return true;
      
    } catch (error) {
      console.error('❌ Erreur annulation facture:', error);
      throw error;
    }
  }
}
```

---

### **4. Recalcul automatique CA et Stock**

#### **Dans App.tsx :**

```typescript
// 🔄 Écouter événement annulation facture
useEffect(() => {
  const handleInvoiceCanceled = async (event: CustomEvent) => {
    const canceledInvoice = event.detail.invoice;
    console.log('🔄 Facture annulée détectée:', canceledInvoice);
    
    // 1. Recalculer CA journalier (diminuer du montant)
    // 2. Recalculer Stock vendu (diminuer des produits)
    // 3. Rafraîchir l'affichage
    
    // Forcer refresh des stats
    setSessionReloadTrigger(prev => prev + 1);
    
    // Alerte succès
    alert(`✅ Facture ${canceledInvoice.numero_facture} annulée avec succès\n\nLes calculs CA et Stock ont été mis à jour.`);
  };
  
  window.addEventListener('invoice-canceled', handleInvoiceCanceled as EventListener);
  return () => window.removeEventListener('invoice-canceled', handleInvoiceCanceled as EventListener);
}, []);
```

---

### **5. Affichage dans Monitoring**

#### **Marquer factures annulées**

Dans `RealtimeMonitoring.tsx` :

```typescript
// Filtrer les factures annulées
const validInvoices = supabaseInvoices.filter(inv => !inv.annulee);

// Afficher badge "ANNULÉE" si annulee=true
{invoice.annulee && (
  <span style={{ 
    backgroundColor: '#dc2626', 
    color: 'white',
    padding: '4px 8px',
    borderRadius: '4px',
    fontSize: '11px',
    fontWeight: 'bold'
  }}>
    🚫 ANNULÉE
  </span>
)}
```

---

## 📊 IMPACT SUR CALCULS

### **CA Journalier**

**AVANT annulation :**
```
CA = 1000€ (Sylvie) + 500€ (Babette) = 1500€
```

**APRÈS annulation facture Babette (500€) :**
```
CA = 1000€ (Sylvie) + 0€ (Babette) = 1000€ ✅
```

### **Stock Vendu**

**AVANT annulation :**
```
Matelas : 2 vendus
Oreillers : 3 vendus
```

**APRÈS annulation :**
```
Matelas : 1 vendu (1 annulé)
Oreillers : 2 vendus (1 annulé) ✅
```

---

## 🛡️ SÉCURITÉ

### **Authentification**

**Mot de passe requis :** `1234` (identique à clôture session)

**Prompt :**
```typescript
const password = prompt(
  `⚠️ ANNULATION DE VENTE\n\n` +
  `Facture : ${invoice.numero_facture}\n` +
  `Montant : ${invoice.montant_ttc}€\n` +
  `Vendeuse : ${invoice.conseiller}\n\n` +
  `Pour confirmer, entrez le mot de passe :`
);

if (password !== '1234') {
  alert('🚫 Mot de passe incorrect - Annulation refusée');
  return;
}
```

---

## 📧 NOTIFICATION EMAIL (Optionnel)

### **Template email**

**Objet :** `🚫 VENTE ANNULÉE - Facture {numero_facture}`

**Corps :**
```html
<h2>🚫 Annulation de vente</h2>

<p><strong>Facture :</strong> {numero_facture}</p>
<p><strong>Date :</strong> {created_at}</p>
<p><strong>Vendeuse :</strong> {conseiller}</p>
<p><strong>Montant :</strong> {montant_ttc}€</p>

<p><strong>Annulée le :</strong> {annulee_le}</p>
<p><strong>Annulée par :</strong> {annulee_par}</p>
<p><strong>Raison :</strong> {motif_annulation}</p>

<h3>Produits concernés :</h3>
<ul>
  {produits.map(p => (
    <li>{p.nom} (x{p.quantite})</li>
  ))}
</ul>

<h3>⚠️ Impact CA :</h3>
<p>CA journalier diminué de {montant_ttc}€</p>

<h3>📦 Impact Stock :</h3>
<p>Stock vendu mis à jour (produits retirés)</p>
```

---

## 🎯 TESTS À RÉALISER

### **Test 1 : Annulation normale**
1. Créer facture via App Facturation
2. Ouvrir onglet "Annulation"
3. Sélectionner la facture
4. Entrer mot de passe `1234`
5. Vérifier :
   - ✅ Facture marquée "ANNULÉE" dans Supabase
   - ✅ CA diminué du montant
   - ✅ Stock vendu diminué des produits
   - ✅ Badge rouge "ANNULÉE" dans Monitoring

### **Test 2 : Refus (délai > 7 jours)**
1. Créer facture ancienne (modifier `created_at` en Supabase)
2. Tenter annulation
3. Vérifier :
   - ❌ Message erreur "Impossible d'annuler facture > 7 jours"
   - ❌ Annulation refusée

### **Test 3 : Double annulation**
1. Annuler une facture
2. Tenter de la ré-annuler
3. Vérifier :
   - ❌ Message "Facture déjà annulée"
   - ❌ Ré-annulation impossible

### **Test 4 : Mot de passe incorrect**
1. Créer facture
2. Entrer mot de passe `0000` (incorrect)
3. Vérifier :
   - ❌ "Mot de passe incorrect - Annulation refusée"
   - ❌ Facture non annulée

---

## 📋 FICHIERS À CRÉER/MODIFIER

### **Nouveaux fichiers**
1. `src/services/invoiceCancellationService.ts` - Service d'annulation
2. `src/components/tabs/CancellationTab.tsx` - Interface annulation (à compléter)

### **Modifications**
1. `src/App.tsx` - Listener événement `invoice-canceled`
2. `src/components/RealtimeMonitoring.tsx` - Badge "ANNULÉE"
3. `src/components/tabs/CancellationTab.tsx` - Section annulation facturier

### **Base de données**
1. Migration Supabase : Ajouter colonnes `annulee`, `annulee_le`, `annulee_par`, `motif_annulation`
2. Index pour performance

---

## ✅ CRITÈRES DE VALIDATION

**Validation SI :**
- ✅ Annulation facture App Facturation fonctionnelle
- ✅ CA diminué correctement
- ✅ Stock vendu diminué correctement
- ✅ Badge "ANNULÉE" affiché dans Monitoring
- ✅ Mot de passe requis
- ✅ Refus si délai > 7 jours
- ✅ Refus si double annulation

**Rejet SI :**
- ❌ Annulation ne fonctionne pas
- ❌ CA/Stock pas recalculés
- ❌ Pas de sécurité (mot de passe)
- ❌ Pas de limite temporelle

---

**Document rédigé le :** 26/10/2025 10:45  
**Statut :** ⏳ Non développé (attente validation)  
**Priorité :** 🔴 Haute (demande utilisateur explicite)

