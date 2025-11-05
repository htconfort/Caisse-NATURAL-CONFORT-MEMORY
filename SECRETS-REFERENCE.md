# 🔐 RÉFÉRENCE DES SECRETS - CONFIDENTIEL

> ⚠️ **ATTENTION** : Ce fichier est dans `.gitignore` et ne sera JAMAIS sur GitHub  
> Conservez une copie dans un endroit sûr (gestionnaire de mots de passe)

---

## 🔑 Tokens et Clés d'API

### **Supabase**
```
URL: https://ryttyzkpbpuqrdlxweth.supabase.co
Anon Key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ5dHR5emtwYnB1cXJkbHh3ZXRoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIzMDgxNTQsImV4cCI6MjA3Nzg4NDE1NH0.rFqtgMW0QtgaPYENH-f67mQSQQcudcl_8Ac8vQzMyQk
```

### **Tokens d'Authentification**
```
Invoice Auth Token: myconfort-secret-2025
External API Token: your-api-token-here
```

---

## 📋 Copier dans `.env.local`

Créez le fichier `.env.local` à la racine du projet et copiez :

```env
# Supabase
VITE_SUPABASE_URL=https://ryttyzkpbpuqrdlxweth.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ5dHR5emtwYnB1cXJkbHh3ZXRoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIzMDgxNTQsImV4cCI6MjA3Nzg4NDE1NH0.rFqtgMW0QtgaPYENH-f67mQSQQcudcl_8Ac8vQzMyQk

# N8N
VITE_N8N_WEBHOOK_URL=/api/n8n
VITE_N8N_ENABLED=true

# Tokens
VITE_INVOICE_AUTH_TOKEN=myconfort-secret-2025

# App
VITE_DEMO_MODE=false
VITE_DISABLE_DEMO_DATA=true
```

---

## 🌐 Netlify Variables

Configurer dans Netlify Dashboard > Site Settings > Environment Variables :

```
VITE_SUPABASE_URL = https://ryttyzkpbpuqrdlxweth.supabase.co
VITE_SUPABASE_ANON_KEY = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ5dHR5emtwYnB1cXJkbHh3ZXRoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIzMDgxNTQsImV4cCI6MjA3Nzg4NDE1NH0.rFqtgMW0QtgaPYENH-f67mQSQQcudcl_8Ac8vQzMyQk
VITE_INVOICE_AUTH_TOKEN = myconfort-secret-2025
VITE_N8N_ENABLED = true
NODE_VERSION = 20.19.0
```

---

## 📱 Accès Comptes

### **GitHub**
- Repository: https://github.com/htconfort/Caisse-MyConfort.git
- Compte: [Votre compte GitHub]

### **Supabase**
- Dashboard: https://supabase.com
- Projet: ryttyzkpbpuqrdlxweth
- Compte: htconfort@gmail.com

### **Netlify**
- Dashboard: https://app.netlify.com
- Site: [Nom de votre site]
- Compte: [Votre compte Netlify]

---

## 🔐 Sauvegardes Recommandées

1. **Gestionnaire de mots de passe** (1Password, Bitwarden, LastPass)
2. **Note sécurisée** sur votre téléphone
3. **Fichier chiffré** sur votre ordinateur
4. **USB chiffrée** pour backup physique

---

*Ce fichier est ignoré par Git - Gardez-le précieusement*

