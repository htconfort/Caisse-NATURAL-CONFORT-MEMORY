# 🚀 AUTO-GÉNÉRATION TABLEAUX COMMISSION À L'OUVERTURE

**Date :** 26 octobre 2025  
**Build :** En cours  
**Statut :** ✅ Implémenté

---

## 🎯 OBJECTIF

Générer automatiquement les tableaux de commission **dès l'ouverture de session**, avec des données vides (0€), pour permettre leur affichage immédiat dans "Historique des RAZ".

---

## ⚙️ FONCTIONNEMENT

### **1. Ouverture de session**

Quand l'utilisateur ouvre une session avec :
- **Nom événement :** "Foire de Dijon 2025"
- **Date début :** 1er novembre 2025
- **Date fin :** 11 novembre 2025

### **2. Auto-génération (automatique)**

Le système génère automatiquement **6 tableaux** (1 par vendeuse) :
- Sylvie
- Babette
- Lucia
- Sabrina
- Billy
- Karima

Chaque tableau contient **11 lignes** (1 par jour) :
- Date : 01/11, 02/11, ..., 11/11
- Chèque : 0€
- CB : 0€
- Espèce : 0€
- Total : 0€
- VRAI/FAUX : FAUX (car 0€ < 1500€)
- Salaire : 140€ (minimum garanti)

### **3. Sauvegarde**

Les tableaux sont sauvegardés dans IndexedDB :
- Table : `vendorCommissionArchives`
- Type : `'opening'` (pour distinguer des RAZ)
- Visibles dans "Historique des RAZ" → "📊 Tableau Vendeuses"

---

## 📊 EXEMPLE DE TABLEAU GÉNÉRÉ

### **Sylvie (Commission: 17%)**

| Jour | Chèque | CB | Espèce | Total | VRAI/FAUX | Salaire |
|------|--------|-------|---------|-------|-----------|---------|
| 01/11 | 0€ | 0€ | 0€ | 0€ | FAUX | 140€ |
| 02/11 | 0€ | 0€ | 0€ | 0€ | FAUX | 140€ |
| 03/11 | 0€ | 0€ | 0€ | 0€ | FAUX | 140€ |
| ... | ... | ... | ... | ... | ... | ... |
| 11/11 | 0€ | 0€ | 0€ | 0€ | FAUX | 140€ |

**Total ventes :** 0.00 €  
**Total salaires :** 1,540.00 € (11 jours × 140€)  
**Forfait logement :** 300.00 € (0€ pour Sylvie)  
**Frais transport :** 0.00 €  
**Net à payer :** 1,540.00 €

---

## 🔧 IMPLÉMENTATION TECHNIQUE

### **Fichiers créés/modifiés**

#### **1. Nouveau service : `commissionTableGenerator.ts`**

```typescript
export class CommissionTableGenerator {
  /**
   * Générer les tableaux de commission vides pour une session
   */
  static async generateEmptyTables(
    session: SessionDB,
    vendors: Vendor[]
  ): Promise<VendorCommissionTable[]>

  /**
   * Sauvegarder les tableaux dans IndexedDB
   */
  static async saveToHistory(
    session: SessionDB,
    tables: VendorCommissionTable[]
  ): Promise<void>

  /**
   * Générer et sauvegarder les tableaux à l'ouverture de session
   */
  static async generateAndSaveOnSessionOpen(
    session: SessionDB
  ): Promise<void>
}
```

#### **2. Modification : `FeuilleDeRAZPro.tsx`**

**Ligne 440-455 :** Ajout de l'auto-génération après ouverture de session

```typescript
const openSession = useCallback(async () => {
  // ... ouverture session ...
  
  // 🆕 AUTO-GÉNÉRATION TABLEAUX COMMISSION
  try {
    const { CommissionTableGenerator } = await import('@/services/commissionTableGenerator');
    const currentSession = await getCurrentSession();
    
    if (currentSession && currentSession.eventStart && currentSession.eventEnd) {
      console.log('📊 Génération automatique des tableaux de commission...');
      await CommissionTableGenerator.generateAndSaveOnSessionOpen(currentSession);
      console.log('✅ Tableaux de commission générés et sauvegardés');
    }
  } catch (tableError) {
    console.error('❌ Erreur génération tableaux (non bloquant):', tableError);
  }
}, [eventName, eventStart, eventEnd, refreshSession]);
```

#### **3. Modification : `RAZHistoryTab.tsx`**

**Ligne 71-85 :** Vérification de l'existence des tableaux générés

```typescript
// 🆕 Vérifier si des tableaux ont été générés à l'ouverture
const commissionArchives = await db.table('vendorCommissionArchives').toArray();
const currentSessionArchive = commissionArchives.find(
  archive => archive.sessionId === session?.id && archive.type === 'opening'
);

if (currentSessionArchive) {
  console.log('✅ Tableaux d\'ouverture trouvés pour cette session');
} else if (session && session.eventStart && session.eventEnd) {
  console.log('⚠️ Aucun tableau d\'ouverture trouvé, génération recommandée');
}
```

---

## 📋 LOGIQUE DE CALCUL

### **Nombre de jours**

```typescript
const startDate = new Date(session.eventStart); // 01/11/2025
const endDate = new Date(session.eventEnd);     // 11/11/2025

const daysDiff = Math.floor(
  (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
) + 1; // +1 pour inclure le jour de fin

// Résultat : 11 jours
```

### **Salaire par jour**

```typescript
const dailyRow: DailyCommissionRow = {
  date: '01/11',
  cheque: 0,
  cb: 0,
  espece: 0,
  total: 0,
  isAboveThreshold: false, // 0€ < 1500€
  salary: 140 // Minimum garanti
};
```

### **Totaux**

```typescript
const table: VendorCommissionTable = {
  vendorId: vendor.id,
  vendorName: vendor.name,
  commissionRate: vendor.name === 'Sylvie' ? 17 : 20,
  dailyRows: [...], // 11 lignes
  grandTotal: 0,
  totalSalary: daysDiff * 140, // 11 × 140€ = 1,540€
  forfaitLogement: vendor.name === 'Sylvie' ? 0 : 300,
  fraisTransport: 0,
  netAPayer: (daysDiff * 140) + forfaitLogement
};
```

---

## ✅ AVANTAGES

1. **Visibilité immédiate** : Les tableaux sont visibles dès l'ouverture
2. **Structure pré-remplie** : 11 jours prêts à recevoir les données
3. **Cohérence** : Format identique aux tableaux de RAZ
4. **Non bloquant** : En cas d'erreur, l'ouverture de session continue

---

## 🔄 MISE À JOUR DES DONNÉES

### **Après création de factures**

Les tableaux générés à l'ouverture **ne sont pas mis à jour** en temps réel. Ils restent à 0€.

### **Après RAZ Journée**

Un **nouveau tableau** est généré avec les **données réelles** du jour et sauvegardé avec `type: 'raz'`.

### **Affichage dans Historique RAZ**

L'utilisateur peut voir :
- **Tableaux d'ouverture** (type: `'opening'`) : Vides (0€)
- **Tableaux de RAZ** (type: `'raz'`) : Avec données réelles

---

## 🐛 GESTION DES ERREURS

### **Session sans dates**

```typescript
if (!session.eventStart || !session.eventEnd) {
  console.warn('⚠️ Session sans dates événement, impossible de générer tableaux');
  return []; // Pas de tableaux générés
}
```

### **Aucune vendeuse active**

```typescript
if (activeVendors.length === 0) {
  console.warn('⚠️ Aucune vendeuse active trouvée');
  return; // Arrêt de la génération
}
```

### **Erreur lors de la sauvegarde**

```typescript
try {
  await CommissionTableGenerator.generateAndSaveOnSessionOpen(currentSession);
} catch (tableError) {
  console.error('❌ Erreur génération tableaux (non bloquant):', tableError);
  // L'ouverture de session continue normalement
}
```

---

## 📊 STRUCTURE DE DONNÉES

### **Interface `VendorCommissionTable`**

```typescript
export interface VendorCommissionTable {
  vendorId: string;            // "1"
  vendorName: string;          // "Sylvie"
  commissionRate: number;      // 17 ou 20
  dailyRows: DailyCommissionRow[];  // 11 lignes
  grandTotal: number;          // 0€
  totalSalary: number;         // 1540€
  forfaitLogement: number;     // 300€ ou 0€
  fraisTransport: number;      // 0€
  netAPayer: number;           // 1540€ + 300€
}
```

### **Interface `DailyCommissionRow`**

```typescript
export interface DailyCommissionRow {
  date: string;           // "01/11"
  dateMs: number;         // Timestamp
  cheque: number;         // 0€
  cb: number;             // 0€
  espece: number;         // 0€
  total: number;          // 0€
  isAboveThreshold: boolean;  // false
  salary: number;         // 140€
}
```

### **Sauvegarde IndexedDB**

```typescript
const archiveEntry = {
  id: `commission-${session.id}-${Date.now()}`,
  sessionId: session.id,
  sessionName: 'Foire de Dijon 2025',
  sessionStart: 1730419200000, // 01/11/2025 00:00
  sessionEnd: 1731283200000,   // 11/11/2025 00:00
  archivedAt: Date.now(),
  tables: JSON.stringify(tables), // Sérialisation
  type: 'opening' // Type d'archive
};
```

---

## 🎯 TESTS À RÉALISER

### **Test 1 : Ouverture normale**
1. Ouvrir session : "Foire de Dijon" (01/11 → 11/11)
2. Vérifier console : "✅ Tableaux de commission générés et sauvegardés"
3. Aller dans "Historique des RAZ" → "📊 Tableau Vendeuses"
4. Vérifier : 6 tableaux affichés
5. Vérifier : Chaque tableau a 11 lignes
6. Vérifier : Toutes les données sont à 0€
7. Vérifier : Salaires = 140€ par jour

### **Test 2 : Session sans dates**
1. Ouvrir session sans dates événement
2. Vérifier console : "⚠️ Impossible de générer tableaux (dates manquantes)"
3. Vérifier : Pas de tableaux dans Historique RAZ

### **Test 3 : Erreur génération**
1. Simuler erreur IndexedDB
2. Vérifier console : "❌ Erreur génération tableaux (non bloquant)"
3. Vérifier : Session ouverte malgré tout

---

## 📝 NOTES IMPORTANTES

### **⚠️ NON-PERSISTENCE DES MISES À JOUR**

Les tableaux générés à l'ouverture **NE SONT PAS** mis à jour quand des factures sont créées. Ils restent figés à 0€ jusqu'au prochain RAZ.

### **✅ AVANTAGE : AUDIT**

Permet de comparer :
- **Tableaux ouverture** : État initial (0€)
- **Tableaux RAZ** : État après ventes réelles

### **🔄 CYCLE DE VIE**

1. **Ouverture session** → Tableaux vides générés (`type: 'opening'`)
2. **Création factures** → Tableaux vides **non mis à jour**
3. **RAZ Journée** → Nouveaux tableaux avec données réelles (`type: 'raz'`)
4. **Clôture session** → Tableaux conservés dans historique

---

**Document rédigé le :** 26/10/2025 11:00  
**Dernière mise à jour :** 26/10/2025 11:00  
**Version :** 1.0

