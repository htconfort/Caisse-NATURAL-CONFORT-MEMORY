# 📋 CAHIER DES CHARGES - TESTS FINAUX
## Caisse MyConfort - Validation Production

**Date :** 26 octobre 2025  
**Version :** Build `c90183c`  
**Objectif :** Validation finale avant déploiement production

---

## 🎯 PROTOCOLE DE TEST COMPLET

### **PHASE 1 : OUVERTURE ET AFFICHAGE SESSION**

#### ✅ 1.1 Ouverture Session
- **Événement :** "Foire de Dijon"
- **Dates :** 1er novembre → 11 novembre (11 jours)
- **Attendu :** Session ouverte avec dates affichées

#### ✅ 1.2 Tableaux Vendeuses (Historique RAZ)
- **Critère :** Tableaux générés pour **11 jours uniquement** (1→11 nov)
- **⚠️ ERREUR À ÉVITER :** Tableaux annuels (toute l'année)
- **Attendu :** 11 lignes par vendeuse (1 ligne par jour)

#### ✅ 1.3 Affichage Session
- **Ouverture :** Date d'ouverture visible (ex: "Ouvert le 26/10/2025")
- **Clôture :** Date de clôture visible (ex: "Clôture prévue 11/11/2025")
- **Événement :** "foire de dijon (01/11 - 11/11)" sur cartes vendeuses

---

### **PHASE 2 : CRÉATION FACTURES VIA APP FACTURATION**

#### ✅ 2.1 Factures Multi-Vendeuses
- Créer des factures pour **chaque vendeuse** via App Facturation
- **Sylvie :** 1 facture test
- **Babette :** 1 facture test
- **Lucia :** 1 facture test
- **Sabrina :** 1 facture test
- **Billy :** 1 facture test
- **Karima :** 1 facture test

#### ✅ 2.2 CA Journalier (Onglet CA)
- **Attendu :** Somme des factures affichée
- **Attendu :** Nombre de ventes = nombre de factures
- **Attendu :** Répartition par mode de paiement correcte

---

### **PHASE 3 : VÉRIFICATIONS ONGLETS**

#### ✅ 3.1 Onglet Stock → Produits Vendus
- **Attendu :** Factures App Facturation **visibles**
- **Attendu :** Produits triés par catégorie
- **Attendu :** Quantités exactes
- **Attendu :** **Mise à jour temps réel** (Sans rechargement)

#### ✅ 3.2 Onglet Ventes
- **Attendu :** Factures App Facturation **liste**
- **Attendu :** Informations complètes (vendeuse, produits, total)
- **Attendu :** Date/heure correctes

#### ✅ 3.3 Onglet Règlements
- **Attendu :** Factures **non payées** affichées
- **Attendu :** Montants restants cohérents

#### ✅ 3.4 Onglet Vendeuses (Cartes)
- **Attendu :** "CA Instant" affiché sur chaque carte
- **Attendu :** Montants cohérents avec les factures
- **Attendu :** Événement "foire de dijon" visible

---

### **PHASE 4 : TEST RAZ COMPLET**

#### ✅ 4.1 RAZ Journée
- **Action :** Bouton "RAZ Journée"
- **Attendu :** Email envoyé (si configuré)
- **Attendu :** Feuille de caisse imprimable

#### ✅ 4.2 Backup Produits Vendus
- **Attendu :** Fichier Markdown envoyé dans email
- **Format :** `stock-vendu-{session}.md`
- **Contenu :**
  - Session : Foire de Dijon (01/11 - 11/11)
  - Export le : 26/10/2025
  - Ventes du Jour (depuis dernière RAZ)
  - Ventes de la Session (complète)
  - Tableaux par catégorie
  - Produits avec quantités (en gras)

---

### **PHASE 5 : ANNULATION VENTE (NOUVELLE FONCTIONNALITÉ)**

#### ✅ 5.1 Contexte
- **Scénario :** Client achète produit le 1er novembre
- **Problème :** Le 3 novembre, demande annulation
- **Impact :** Risque de désynchronisation CA/Stock

#### ✅ 5.2 Attendu (À DÉVELOPPER)
- **Onglet :** Annulation
- **Fonctionnalité :** Bouton "Annuler dernière vente App Facturation"
- **Critères :**
  1. Lister les 10 dernières factures App Facturation
  2. Afficher : Numéro facture, Vendeuse, Date, Montant, Produits
  3. Sélection de la facture à annuler
  4. Confirmation mot de passe (1234)
  5. **Effets :**
     - CA journalier **diminué** du montant
     - Stock vendu **diminué** des produits
     - Facture marquée "ANNULÉE" dans Supabase
     - Notification email (optionnel)

#### ⚠️ 5.3 Contraintes
- **Annulation = RAZ partielle** de la dernière vente
- **Audit :** Enregistrer qui annule + quand + pourquoi
- **Limite :** Impossible d'annuler après RAZ Fin Session

---

## 🚀 FONCTIONNALITÉS À VALIDER

### **A. Impression Tableaux Vendeuses (RAZ Historique)**

#### ✅ Format Portrait (OBLIGATOIRE)
- **Orienté :** A4 Portrait (vertical)
- **Marges :** 10mm
- **Contenu :** 10 jours max sur 1 page

#### ✅ Options Impression
- **Modal :** "Imprimer tous les tableaux" OU "Imprimer un tableau"
- **Sélection :** Liste déroulante par vendeuse
- **Saut de page :** Entre chaque vendeuse (tous les tableaux)

#### ✅ En-tête Chaque Tableau
```
📊 Commission MyConfort
Foire de Dijon (01/11 - 11/11)
Imprimé le 26/10/2025 10:30
```

#### ✅ Colonnes (11 lignes/jour)
| Jour | Chèque | CB | Espèce | Total | VRAI/FAUX | Salaire | Frais | Net à payer |
|------|--------|----|---------|-------|-----------|---------|-------|--------------|
| 1/11 | 50€ | 30€ | 0€ | 80€ | FAUX | 140€ | 0€ | 140€ |
| ... | ... | ... | ... | ... | ... | ... | ... | ... |
| 11/11 | ... | ... | ... | ... | ... | ... | ... | ... |

#### ✅ Calculs
- **Salaire :** 140€ si < 1500€, sinon 20% (17% Sylvie)
- **Forfait logement :** 300€ (0€ Sylvie)
- **Frais transport :** Saisie manuelle
- **Net à payer :** Salaire + Forfait + Frais

---

### **B. Monitoring RAZ à Distance**

#### ✅ Accès
- **URL :** `/monitoring`
- **Onglet :** "🔴 RAZ"
- **Authentification :** Mot de passe (1234)

#### ✅ Fonctions Disponibles
1. **RAZ Journée**
   - Bouton rouge "RAZ Journée"
   - Description : "Reset CA journalier, conserve session"
   - **Effets :**
     - CA → 0€
     - Stock vendu Jour → vidé
     - Emails envoyés
     - Factures Supabase **conservées** (audit)

2. **RAZ Fin Session**
   - Bouton rouge "Clôturer Session"
   - Description : "Vider toutes les données, fermer session"
   - **Effets :**
     - Toutes ventes supprimées
     - CA → 0€
     - Stock vendu vidé
     - Emails envoyés
     - Session fermée

3. **Statut Système** (Lecture seule)
   - Session active : OUI/NON
   - Date ouverture : 26/10/2025
   - Date clôture prévue : 11/11/2025
   - Ventes locales : 0
   - Factures Supabase : 6
   - CA Total : XXXX€

#### ✅ KPIs Masqués
- **Quand onglet RAZ actif :** Pas d'affichage CA Total/Ventes/Sessions

---

## 📊 TABLEAU DE BORD TESTS

### **Checklist Validation**

| # | Test | Statut | Notes |
|---|------|--------|-------|
| 1 | Ouverture session (1→11 nov) | ⏳ | |
| 2 | Tableaux 11 jours (pas annuels) | ⏳ | |
| 3 | Affichage ouverture/clôture | ⏳ | |
| 4 | Factures créées (6 vendeuses) | ⏳ | |
| 5 | CA journalier affiché | ⏳ | |
| 6 | Stock produits temps réel | ⏳ | |
| 7 | Ventes liste facturier | ⏳ | |
| 8 | Règlements à venir | ⏳ | |
| 9 | CA sur cartes vendeuses | ⏳ | |
| 10 | RAZ email envoyé | ⏳ | |
| 11 | Backup produits vendus (email) | ⏳ | |
| 12 | Annulation dernière vente | ❌ | **À DÉVELOPPER** |
| 13 | Impression portrait (10 jours/page) | ⏳ | |
| 14 | Monitoring RAZ distant | ⏳ | |

---

## 🐛 BUGS CONNUS (Non bloquants)

1. **Produits du Jour vides** dans Monitoring (pas de ventes iPad)
2. **Session précédente** (9 produits anciens dans "Top Produits Session")
3. **Factures Supabase après RAZ** (conservées pour audit)

---

## 🎯 CRITÈRES DE VALIDATION FINALE

### ✅ VALIDATION SI :
1. ✅ Tableaux vendeuses = 11 jours (1→11 nov)
2. ✅ Factures App Facturation visibles partout
3. ✅ CA journalier cohérent
4. ✅ Stock produits en temps réel
5. ✅ RAZ envoie emails + backup
6. ✅ Impression portrait fonctionnelle
7. ✅ Monitoring RAZ distant opérationnel

### ❌ REJET SI :
- ❌ Tableaux annuels (au lieu de 11 jours)
- ❌ Factures invisibles dans Ventes/Stock
- ❌ CA incohérent
- ❌ RAZ ne fonctionne pas
- ❌ Emails non envoyés
- ❌ Impression bloquée

---

## 📝 NOTES TECHNIQUES

### **Fonctionnalités À Développer**

#### **1. Annulation Dernière Vente (App Facturation)**

**Fichier :** `src/components/tabs/CancellationTab.tsx`

**Nouveau composant :** `CancelLastSaleButton`

**Logique :**
```typescript
const handleCancelLastSale = async () => {
  // 1. Récupérer les 10 dernières factures Supabase
  const recentInvoices = supabaseInvoices
    .filter(inv => !inv.annulee) // Pas déjà annulée
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(0, 10);
  
  // 2. Afficher modal de sélection
  const selectedInvoice = await showInvoiceSelectionModal(recentInvoices);
  
  // 3. Demander mot de passe
  const password = prompt('Mot de passe pour annulation :');
  if (password !== '1234') return;
  
  // 4. Marquer comme annulée dans Supabase
  await supabase
    .from('factures_full')
    .update({ annulee: true, annulee_le: new Date() })
    .eq('numero_facture', selectedInvoice.numero_facture);
  
  // 5. Recalculer CA journalier (diminuer)
  // 6. Recalculer Stock vendu (diminuer)
  // 7. Notification réussie
  alert('✅ Vente annulée avec succès');
};
```

**Champs Supabase à ajouter :**
```sql
ALTER TABLE factures_full ADD COLUMN annulee BOOLEAN DEFAULT FALSE;
ALTER TABLE factures_full ADD COLUMN annulee_le TIMESTAMP;
```

---

### **2. Feuille de Caisse Imprimable (RAZ Historique)**

**Fichier :** `src/components/raz/RAZHistoryTab.tsx`

**Fonction :** `printCashSheet(entry)`

**Contenu :**
- Titre : "📍 Feuille de Caisse — {sessionName}"
- Date : {date_raz}
- CA Total du jour
- Répartition par mode paiement
- Détails par vendeuse
- **Tableaux vendeuses** (si générés)

**Format :** HTML optimisé A4 Portrait

---

## 🚨 BLOCAGE ACTUEL

**Session affichée après clôture :**
- Cartes vendeuses montrent encore "foire de dijon" après clôture
- **FIX APPLIQUÉ :** Événement 'session-closed' (commit `1417521`)
- **À TESTER :** Recharger page après clôture

---

## 📞 POINTS D'ATTENTION

1. **Tableaux vendeuses = Session, PAS événement**
   - Utiliser `openedAt` (session), pas `eventStart` (événement)

2. **CA Journalier = Depuis dernière RAZ**
   - Réinitialisé à 0€ lors de RAZ Journée

3. **Factures Supabase conservées après RAZ**
   - Pour audit comptable
   - Marqué "annulée" au lieu de supprimée

4. **Mot de passe universel : `1234`**
   - Clôture anticipée
   - RAZ à distance
   - Annulation vente

---

## ✅ LIVRABLE FINAL

**Dépôt :** `https://github.com/htconfort/Caisse-MyConfort`

**Build :** `c90183c`

**Statut :** ✅ Prêt pour tests finaux

**Prochaine étape :** Tests utilisateur selon ce cahier des charges

---

**Document rédigé le :** 26/10/2025 10:35  
**Dernière mise à jour :** 26/10/2025 10:35  
**Version :** 1.0

