# 🔐 Guide de Sécurité - Tokens et Mots de Passe

## ✅ Solution Mise en Place

### **📁 Fichiers Créés**

1. **`CONFIGURATION-COMPLETE.md`** (Public - Sur GitHub)
   - Guide complet de configuration
   - **SANS** les tokens sensibles
   - Instructions pour retrouver les secrets

2. **`SECRETS-REFERENCE.md`** (Privé - Local uniquement)
   - **Contient TOUS les tokens et mots de passe**
   - **N'est JAMAIS sur GitHub** (protégé par .gitignore)
   - À sauvegarder dans un gestionnaire de mots de passe

---

## 🔐 Comment Ça Fonctionne ?

### **Protection Automatique**
Le fichier `.gitignore` a été mis à jour pour **bloquer automatiquement** :
```
SECRETS-REFERENCE.md    ← Votre fichier de mots de passe
.env.local              ← Variables d'environnement locales
.env                    ← Variables d'environnement
.env.production         ← Variables de production
```

### **Vérification**
Vous pouvez vérifier avec :
```bash
git status
```
→ Le fichier `SECRETS-REFERENCE.md` ne doit JAMAIS apparaître

---

## 💾 Sauvegarde des Secrets (IMPORTANT)

### **Option 1 : Gestionnaire de Mots de Passe (RECOMMANDÉ)**

**1Password / Bitwarden / LastPass / Dashlane**

1. Créer une nouvelle note sécurisée nommée "Caisse MyConfort - Secrets"
2. Copier le contenu complet de `SECRETS-REFERENCE.md`
3. Sauvegarder dans le coffre-fort
4. Ajouter des tags : `myconfort`, `tokens`, `développement`

**Avantages :**
- ✅ Synchronisé sur tous vos appareils
- ✅ Chiffré de bout en bout
- ✅ Accessible depuis n'importe où
- ✅ Backup automatique

### **Option 2 : Note Sécurisée iPhone/iPad**
1. Ouvrir l'app **Notes**
2. Créer une nouvelle note
3. Toucher l'icône 🔒 en haut
4. Protéger avec mot de passe ou Face ID
5. Coller le contenu de `SECRETS-REFERENCE.md`

### **Option 3 : Fichier Chiffré**
```bash
# Mac : Créer une image disque chiffrée
# 1. Utilitaire de disque > Fichier > Nouvelle image
# 2. Choisir "Chiffrement AES 256 bits"
# 3. Copier SECRETS-REFERENCE.md dedans
```

---

## 🖥️ Sur Votre Nouvel Ordinateur

### **Étapes à Suivre**

1. **Cloner le projet depuis GitHub**
   ```bash
   git clone https://github.com/htconfort/Caisse-MyConfort.git
   cd Caisse-MyConfort/mon-projet-vite
   ```

2. **Récupérer vos secrets**
   - Ouvrir votre gestionnaire de mots de passe
   - Retrouver la note "Caisse MyConfort - Secrets"
   - Copier le contenu

3. **Créer le fichier local**
   ```bash
   # Créer le fichier SECRETS-REFERENCE.md
   nano SECRETS-REFERENCE.md
   # Coller le contenu
   # Sauvegarder (Ctrl+X, Y, Enter)
   ```

4. **Créer le fichier .env.local**
   ```bash
   nano .env.local
   # Coller les variables d'environnement du guide
   # Sauvegarder
   ```

5. **Installer et démarrer**
   ```bash
   npm install
   npm run dev
   ```

---

## 🔍 Vérification de Sécurité

### **Checklist avant chaque commit**
```bash
# 1. Vérifier qu'aucun secret n'est dans les fichiers à commiter
git status
git diff

# 2. Rechercher les tokens dans les fichiers
grep -r "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9" . --exclude-dir=node_modules

# 3. Vérifier le .gitignore
cat .gitignore | grep SECRETS
```

### **Si vous avez accidentellement commité un secret**
```bash
# URGENT : Révoquer immédiatement le token/clé sur le service
# 1. Aller sur Supabase/N8N/etc.
# 2. Générer une nouvelle clé
# 3. Mettre à jour SECRETS-REFERENCE.md

# Puis nettoyer l'historique Git (avancé)
git filter-branch --force --index-filter \
  "git rm --cached --ignore-unmatch SECRETS-REFERENCE.md" \
  --prune-empty --tag-name-filter cat -- --all
```

---

## 📱 Accès Rapide aux Secrets

### **Depuis Cursor**
1. Ouvrir le projet
2. `Cmd + P` → Taper `SECRETS`
3. Ouvrir `SECRETS-REFERENCE.md`
4. ⚠️ Ne JAMAIS faire `git add` sur ce fichier

### **Depuis Terminal**
```bash
# Voir le fichier
cat SECRETS-REFERENCE.md

# Copier dans le presse-papier (Mac)
cat SECRETS-REFERENCE.md | pbcopy

# Éditer
nano SECRETS-REFERENCE.md
```

---

## 🆘 FAQ Sécurité

### **Q: Puis-je mettre les tokens dans CONFIGURATION-COMPLETE.md ?**
❌ **NON** - Ce fichier est sur GitHub, donc public

### **Q: Le fichier .env.local suffit-il ?**
✅ **OUI** pour l'application, mais **NON** pour sauvegarder  
Le `.env.local` est sur votre PC uniquement. Si vous perdez votre PC, vous perdez les tokens.

### **Q: Quelqu'un peut-il voir mes tokens sur GitHub ?**
✅ **NON** - Tant que `SECRETS-REFERENCE.md` est dans `.gitignore`

### **Q: Que faire si j'ai oublié mes tokens ?**
1. Vérifier votre gestionnaire de mots de passe
2. Vérifier vos notes sécurisées iPhone
3. Si perdu : régénérer sur Supabase/Netlify/N8N

### **Q: Comment partager avec un collègue ?**
- ✅ Via gestionnaire de mots de passe (1Password Teams)
- ✅ Via message chiffré (Signal, WhatsApp)
- ❌ JAMAIS par email non chiffré
- ❌ JAMAIS sur Slack/Teams sans chiffrement

---

## 🎯 Résumé en 3 Points

1. **`SECRETS-REFERENCE.md`** = Tous vos tokens (LOCAL UNIQUEMENT)
2. **Gestionnaire de mots de passe** = Sauvegarde sécurisée
3. **`.gitignore`** = Protection automatique

---

## 📞 En Cas de Problème

Si vous pensez qu'un token a été exposé :

1. **🚨 URGENCE** : Révoquer immédiatement
   - Supabase : Dashboard > Settings > API > Reset key
   - N8N : Générer nouveau webhook
   - Netlify : Environment variables > Regenerate

2. **🔄 Mettre à jour**
   - `SECRETS-REFERENCE.md`
   - `.env.local`
   - Gestionnaire de mots de passe
   - Netlify variables

3. **✅ Tester**
   - `npm run dev`
   - Vérifier que tout fonctionne

---

*Ce fichier est aussi protégé et n'ira pas sur GitHub*  
*Sauvegardez-le dans votre gestionnaire de mots de passe*

