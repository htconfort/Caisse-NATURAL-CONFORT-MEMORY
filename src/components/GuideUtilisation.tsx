import { Book, ChevronDown, ChevronRight, ExternalLink, FileText } from 'lucide-react';
import React, { useState } from 'react';

interface GuideUtilisationProps {
  onClose?: () => void;
}

export const GuideUtilisation: React.FC<GuideUtilisationProps> = () => {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());

  const toggleSection = (sectionId: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(sectionId)) {
      newExpanded.delete(sectionId);
    } else {
      newExpanded.add(sectionId);
    }
    setExpandedSections(newExpanded);
  };

  const sections = [
    {
      id: 'presentation',
      title: '📱 Présentation générale',
      content: `
        **Caisse MyConfort** est une application de caisse événementielle moderne construite avec React, TypeScript et Vite.
        
        **Technologies utilisées :**
        - Frontend : React 18 + TypeScript + Vite
        - Stockage : Dexie (IndexedDB) pour la persistance locale
        - Intégration : N8N pour la synchronisation des factures
        - UI : Lucide React (icônes) + CSS moderne
        
        **Application accessible sur :** http://localhost:5173 (ou port alternatif 5174)
        
        **Nouvelles fonctionnalités v3.0+ :**
        - Panier full-height avec interface simplifiée
        - Bouton panier minimisé rouge pour meilleure visibilité
        - Sélecteur de type de panier intégré à l'onglet Gestion
        - Interface de paiement améliorée avec options étendues
      `
    },
    {
      id: 'navigation',
      title: '🧭 Navigation et onglets',
      content: `
        L'application dispose de **10 onglets principaux** :
        
        1. **👩‍💼 Vendeuse** - Sélection obligatoire de la vendeuse active
        2. **📦 Produits** - Catalogue de 49 produits (recherche + ajout panier)
        3. **📄 Factures** - Consultation factures N8N + mode élégant
        4. **💰 Règlements** - Gestion des paiements et échéanciers
        5. **📊 Stock** - Gestion inventaires (4 sous-onglets + 3 modes vue)
        6. **🛒 Ventes** - Historique des transactions
        7. **➕ Diverses** - Articles personnalisés hors catalogue
        8. **❌ Annulation** - Gestion panier + annulation ventes
        9. **💰 CA** - Chiffre d'affaires et classement vendeuses
        10. **⚙️ Gestion** - Administration (3 sous-onglets)
        11. **🔄 RAZ** - Remise à zéro et rapports
        
        **Sous-onglets de Gestion :**
        - **👥 Gestion des Vendeuses** - Ajout/modification/suppression vendeuses
        - **📖 Guide d'Utilisation** - Documentation interactive (ici)
        - **🛒 Type de Panier** - Configuration panier classique/facturier
        
        **Monitoring Temps Réel (PC/Mac) :**
        - **📊 Dashboard Monitoring** - https://1caisse-myconfort.netlify.app/monitoring
        - Visualisez toutes les ventes en temps réel depuis un ordinateur
        - Surveillez les statistiques vendeurs et le CA en direct
      `
    },
    {
      id: 'panier',
      title: '🛒 Panier et types de vente',
      content: `
        **Panier flottant amélioré v3.0+ :**
        - Interface full-height (de haut en bas de l'écran)
        - Bouton de minimisation rouge pour meilleure visibilité
        - Badge blanc avec bordure rouge sur panier minimisé
        - Gestion des articles offerts et quantités
        - Calcul automatique des économies (produits matelas)
        
        **Types de panier (configurable via Gestion > Type de Panier) :**
        
        **� Panier Classique** (par défaut) :
        - Ticket de caisse standard
        - Gestion automatique des numéros
        - Idéal pour les ventes courantes
        - Impression rapide
        
        **📄 Panier Facturier** :
        - Facture personnalisée
        - Saisie client obligatoire
        - Numérotation manuelle
        - Traçabilité complète
        
        **Règle spéciale :** Les produits matelas/sur-matelas en panier classique forcent la saisie manuelle client/facture.
      `
    },
    {
      id: 'workflow',
      title: '🔄 Workflow de vente',
      content: `
        **Processus standard :**
        
        1. **Configurer le type de panier** (Gestion > Type de Panier) - OPTIONNEL
        2. **Sélectionner une vendeuse** (onglet Vendeuse) - OBLIGATOIRE
        3. **Ajouter des produits** (onglet Produits ou Diverses)
        4. **Vérifier le panier** (visible en permanence à droite)
        5. **Finaliser la vente** (bouton "Mode de paiement" dans le panier)
        6. **Choisir le règlement** (interface de paiement complète)
        
        **Options de paiement étendues :**
        - Espèces, Carte bleue, Virement
        - Chèque comptant, Chèques à venir (configurables)
        - Alma 2x/3x/4x avec calcul automatique
        - Gestion d'acomptes avec saisie suggérée (20%, 30%, 40%, 50%)
      `
    },
    {
      id: 'panier-facturier-n8n',
      title: '📄 Panier facturier via N8N',
      content: `
        **Objectif**
        Synchroniser automatiquement les ventes avec N8N pour une traçabilité complète, éviter les doublons (notamment sur Matelas / Sur‑matelas) et centraliser les statuts de livraison/règlement.

        **Types de panier**
        - **Classique** : toutes les catégories disponibles, vente immédiate en caisse, enregistrement direct dans les stats.
        - **Facturier** : Matelas / Sur‑matelas bloqués, autres catégories autorisées, saisie client obligatoire, synchronisation via N8N. Si le workflow N8N est indisponible, repasser en classique.

        **Quand la synchronisation N8N s’active**
        - Uniquement en **mode facturier** (cartType = 'facturier').
        - À la finalisation d’une vente, la fonction 
          
          triggerN8NSync(sale)
          
          envoie la vente au webhook N8N (voir service n8nSyncService).

        **Structure des données envoyées (extrait)**
        - Client: nom, email, téléphone, adresse, etc.
        - Produits: nom, quantité, prix HT/TTC, taux TVA, remise éventuelle, statut livraison.
        - Totaux: montant_ht, montant_tva, montant_ttc.
        - Paiement: mode_paiement, acompte, montant_restant (si applicable).
        - Métadonnées: numero_facture, date_facture, idempotencyKey.

        **Gestion du stock**
        - La "déduction automatique" depuis N8N est **une vue calculée** basée sur les statuts des lignes (pending / delivered / cancelled), pas une écriture physique directe en base.
        - Les ventes locales (caisse) ne modifient pas non plus le stock physique automatiquement – logique centralisée et traçable.

        **Sécurité & robustesse**
        - Si N8N est en panne → revenir en **Panier Classique** pour garantir la continuité de vente.
        - Outils de nettoyage disponibles pour purger les factures parasites en cas de données corrompues.

        **Processus résumé**
        1) Vente en mode facturier → ajout au panier.
        2) Saisie client obligatoire.
        3) Envoi au workflow N8N (webhook).
        4) Stock: vue calculée selon statuts.
        5) Factures visibles dans l’onglet dédié avec traçabilité.
      `
    },
    {
      id: 'gestion',
      title: '⚙️ Onglet Gestion',
      content: `
        **3 sous-sections disponibles :**
        
        **👥 Gestion des Vendeuses :**
        - Ajout de nouvelles vendeuses (nom + email + couleur)
        - Modification en ligne (double-clic)
        - Suppression avec confirmation
        - Compteur automatique des vendeuses actives
        
        **📖 Guide d'Utilisation :**
        - Documentation interactive (cette page)
        - Sections extensibles/réductibles
        - Liens vers guides externes
        
        **🛒 Type de Panier :**
        - Interface visuelle pour changer le mode de panier
        - Cartes interactives avec descriptions détaillées
        - Indication du mode actuel
        - Changement immédiat pour tous les nouveaux paniers
        - Informations sur l'impact de chaque mode
      `
    },
    {
      id: 'stock',
      title: '📦 Gestion du stock',
      content: `
        **4 types de stock disponibles :**
        
        - **Général** : Stock principal avec déductions automatiques N8N
        - **Stand** : Stock physique sur le stand
        - **Remorque** : Stock en attente dans la remorque
        - **Physique** : Inventaire physique et comptages
        
        **3 modes de vue :**
        - **Vue Cartes** : Navigation avec cartes élégantes (par défaut)
        - **Vue Compacte** : Cartes plus petites sans descriptions
        - **Vue Horizontale** : Boutons compacts sur une ligne
        
        **Déduction automatique :** Les factures N8N déduisent automatiquement du stock général.
        **Synchronisation :** Mise à jour temps réel entre les différents types de stock.
      `
    },
    {
      id: 'factures',
      title: '📄 Factures et N8N',
      content: `
        **Synchronisation automatique :**
        - Toutes les 30 secondes si N8N est activé
        - Endpoint : /sync/invoices
        - Proxy vers http://localhost:5678
        
        **Mode élégant ✨**
        Un bouton en haut à droite permet de basculer vers un mode élégant avec :
        - Interface modernisée (glassmorphism)
        - Animations fluides
        - Design sophistiqué
        
        **Configuration N8N :**
        - VITE_N8N_ENABLED=true/false
        - VITE_N8N_URL=/api/n8n
        - VITE_N8N_TARGET=http://localhost:5678
        
        **Intégration avec types de panier :**
        - Panier facturier : synchronisation automatique
        - Panier classique : génération de factures simples
      `
    },
    {
      id: 'raz',
      title: '🔄 RAZ et sauvegarde',
      content: `
        **Options de remise à zéro :**
        
        1. **Ventes du jour** : Remet à zéro les CA quotidiens
        2. **Panier actuel** : Vide le panier en cours
        3. **Factures N8N** : Efface les factures synchronisées
        4. **Vendeuse sélectionnée** : Désélectionne la vendeuse active
        5. **Statistiques vendeuses** : ⚠️ Remet à zéro TOUTES les stats
        6. **RAZ COMPLÈTE** : 🚨 DANGER - Supprime TOUTES les données
        
        **Export automatique :** Sauvegarde JSON proposée avant chaque RAZ.
        **Gestion des sessions :** Clôture/ouverture automatique avec totaux.
        **Conservation :** Le type de panier configuré est préservé lors des RAZ.
      `
    },
    {
      id: 'monitoring',
      title: '📊 Monitoring Temps Réel',
      content: `
        **Vue d'ensemble :**
        Le Monitoring Temps Réel vous permet de visualiser instantanément toutes les ventes effectuées sur vos iPads de caisse depuis un ordinateur central.
        
        **Fonctionnalités principales :**
        - 📱 **Multi-appareils** : Suivez plusieurs iPads/magasins depuis un seul écran
        - ⚡ **Temps réel** : Les ventes apparaissent instantanément (< 1 seconde)
        - 📊 **Statistiques live** : CA par vendeur, total du jour, moyennes
        - 🌐 **À distance** : Surveillez vos magasins depuis n'importe où
        - 💾 **Historique** : Toutes les ventes sauvegardées dans Supabase
        
        **Accès au monitoring :**
        - **URL Monitoring** : https://1caisse-myconfort.netlify.app/monitoring
        - **URL Caisse** : https://1caisse-myconfort.netlify.app/
        
        **Sur l'iPad (Caisse) :**
        1. Vérifier l'indicateur de sync 🟢 vert en haut de l'écran
        2. Utiliser normalement l'application
        3. Chaque vente est synchronisée automatiquement
        4. Si 🔴 rouge "Hors ligne" : prévenir le responsable
        
        **Sur l'Ordinateur (Monitoring) :**
        1. Ouvrir l'URL du monitoring dans un navigateur
        2. Laisser ouvert pendant les heures d'activité
        3. Observer les ventes en temps réel
        4. Surveiller les statistiques vendeurs
        5. Consulter les sessions actives
        
        **Indicateurs visuels :**
        - 🟢 **Vert "Synchronisé"** : Tout fonctionne normalement
        - 🟠 **Orange "Sync en cours"** : Synchronisation en cours
        - 🔴 **Rouge "Hors ligne"** : Pas de connexion Internet
        
        **Gestion offline/online :**
        - Les ventes fonctionnent même sans connexion
        - Stockage local automatique en cas de déconnexion
        - Synchronisation automatique au retour de la connexion
        - Compteur de syncs en attente affiché
        
        **Technologies utilisées :**
        - Base de données : Supabase PostgreSQL
        - Temps réel : WebSocket (Supabase Realtime)
        - Synchronisation : Service custom RealtimeSyncService
        - Hébergement : Netlify
        
        **Tables Supabase :**
        1. **realtime_sales** : Toutes les ventes avec détails
        2. **realtime_vendor_stats** : Statistiques par vendeur
        3. **realtime_sessions** : Sessions actives des vendeuses
        
        **Configuration technique :**
        Les variables d'environnement Netlify sont déjà configurées :
        - VITE_SUPABASE_URL : URL Supabase
        - VITE_SUPABASE_ANON_KEY : Clé API publique
        
        **En cas de problème :**
        1. Vérifier l'indicateur de sync (doit être 🟢)
        2. Rafraîchir la page du monitoring
        3. Vider le cache Safari sur iPad
        4. Consulter la documentation complète
        
        **Documentation complète :**
        Un guide détaillé est disponible dans le projet :
        - README-MONITORING-TEMPS-REEL.md (guide principal)
        - INDEX-DOCUMENTATION-MONITORING.md (navigation)
        - DIAGNOSTIC-SYNC-REALTIME.md (dépannage)
        
        **Support multi-magasins :**
        Chaque iPad/magasin a un ID unique généré automatiquement.
        Cela permet de différencier les ventes et filtrer par magasin.
        
        **Avantages :**
        ✅ Suivez vos ventes en direct depuis n'importe où
        ✅ Surveillez la performance de vos vendeurs
        ✅ Gérez plusieurs magasins simultanément
        ✅ Analysez votre activité en temps réel
        ✅ Historique complet dans Supabase
        
        **La synchronisation est automatique, transparente et fiable.**
      `
    },
    {
      id: 'nouveautes',
      title: '🆕 Nouveautés récentes',
      content: `
        **Version 3.0+ - Améliorations majeures :**
        
        **🆕 Monitoring Temps Réel (Octobre 2025) :**
        - Dashboard de monitoring accessible depuis un PC/Mac
        - Visualisation instantanée de toutes les ventes (< 1 seconde)
        - Statistiques vendeurs en temps réel
        - Support multi-appareils (plusieurs iPads/magasins)
        - Indicateur de synchronisation 🟢🟠🔴
        - Gestion automatique offline/online
        - Historique complet dans Supabase
        - URL : https://1caisse-myconfort.netlify.app/monitoring
        
        **Interface Panier :**
        - Panier full-height pour maximiser l'espace d'affichage
        - Bouton minimisé rouge (#F55D3E) pour meilleure visibilité
        - Badge blanc avec bordure rouge pour contraste optimal
        - Suppression des éléments complexes (dock mode)
        
        **Gestion centralisée :**
        - Sélecteur de type de panier déplacé vers Gestion
        - Interface visuelle avec cartes interactives
        - Documentation des différences entre modes
        - Configuration persistante
        
        **Paiements étendus :**
        - Interface de paiement redessinée
        - Support Alma 2x/3x/4x avec calculs automatiques
        - Chèques à venir configurables (2 à 10 chèques)
        - Gestion avancée des acomptes
        
        **Expérience utilisateur :**
        - Navigation plus fluide entre les onglets
        - Feedback visuel amélioré
        - Guide d'utilisation mis à jour en temps réel
        - Synchronisation transparente et automatique
      `
    },
    {
      id: 'depannage',
      title: '🔧 Dépannage',
      content: `
        **Problèmes courants :**
        
        - **Port occupé :** lsof -ti:5173 puis kill -9 <PID> (ou utiliser port 5174)
        - **Panier rouge invisible :** Vérifier le contraste du badge (maintenant blanc sur rouge)
        - **Type de panier non sauvé :** Aller dans Gestion > Type de Panier pour configurer
        - **N8N ECONNREFUSED :** Normal si N8N pas démarré
        - **Cache Vite :** rm -rf node_modules/.vite puis npm run dev --force
        - **Données perdues :** Vérifier IndexedDB (F12 → Application → IndexedDB)
        
        **Logs utiles :**
        - Console navigateur : Logs Dexie, Session, RAZ, Panier
        - Variables debug : VITE_LOG_LEVEL=debug
        - Debug panier : Logs préfixés "🛒 FloatingCart Debug"
        
        **Reset complet :** indexedDB.deleteDatabase('MyConfortCaisseV2')
        **Configuration panier :** Persistent dans CART_TYPE (IndexedDB)
      `
    }
  ];

  const openGuideFile = (filename: string) => {
    const baseUrl = window.location.origin;
    const guidePath = `/guide-d-utilisation/${filename}`;
    window.open(baseUrl + guidePath, '_blank');
  };

  return (
    <div style={{
      background: 'white',
      border: '1px solid #ddd',
      borderRadius: '8px',
      padding: '20px',
      marginBottom: '20px'
    }}>
      {/* En-tête du guide */}
      <div style={{
        background: 'linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)',
        color: 'white',
        padding: '20px',
        borderRadius: '8px',
        marginBottom: '20px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '24px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Book size={28} />
            Guide d'Utilisation
          </h2>
          <p style={{ margin: '8px 0 0 0', opacity: 0.9 }}>
            Documentation interactive de Caisse MyConfort
          </p>
        </div>
        
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={() => openGuideFile('Guide-utilisation-Caisse-MyConfort.md')}
            style={{
              background: 'rgba(255,255,255,0.2)',
              color: 'white',
              border: '2px solid rgba(255,255,255,0.3)',
              borderRadius: '6px',
              padding: '8px 12px',
              cursor: 'pointer',
              fontSize: '14px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.3s ease'
            }}
            title="Ouvrir le guide utilisateur complet"
          >
            <FileText size={16} />
            Guide Utilisateur
          </button>
          
          <button
            onClick={() => openGuideFile('Guide-utilisation-Caisse-MyConfort-Complet.md')}
            style={{
              background: 'rgba(255,255,255,0.2)',
              color: 'white',
              border: '2px solid rgba(255,255,255,0.3)',
              borderRadius: '6px',
              padding: '8px 12px',
              cursor: 'pointer',
              fontSize: '14px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.3s ease'
            }}
            title="Ouvrir le guide technique complet"
          >
            <ExternalLink size={16} />
            Guide Technique
          </button>
        </div>
      </div>

      {/* Sections du guide */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {sections.map((section) => {
          const isExpanded = expandedSections.has(section.id);
          
          return (
            <div
              key={section.id}
              style={{
                border: '1px solid #e9ecef',
                borderRadius: '8px',
                overflow: 'hidden'
              }}
            >
              {/* Header de section */}
              <button
                onClick={() => toggleSection(section.id)}
                style={{
                  width: '100%',
                  background: isExpanded ? '#f8f9fa' : 'white',
                  border: 'none',
                  padding: '15px 20px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  cursor: 'pointer',
                  fontSize: '16px',
                  fontWeight: 'bold',
                  color: '#495057',
                  transition: 'all 0.2s ease'
                }}
              >
                <span>{section.title}</span>
                {isExpanded ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
              </button>
              
              {/* Contenu de section */}
              {isExpanded && (
                <div style={{
                  padding: '20px',
                  background: '#fafbfc',
                  borderTop: '1px solid #e9ecef'
                }}>
                  <div style={{
                    fontSize: '14px',
                    lineHeight: '1.6',
                    color: '#495057',
                    whiteSpace: 'pre-line'
                  }}>
                    {section.content}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Pied de page */}
      <div style={{
        marginTop: '20px',
        padding: '15px',
        background: '#e9ecef',
        borderRadius: '8px',
        textAlign: 'center',
        fontSize: '14px',
        color: '#6c757d'
      }}>
        <div style={{ marginBottom: '10px', fontWeight: 'bold' }}>
          📁 Documentation complète disponible dans le dossier projet
        </div>
        <div>
          <strong>Emplacement :</strong> /guide-d-utilisation/ 
          • <strong>Version :</strong> Caisse MyConfort v3.x 
          • <strong>Dernière mise à jour :</strong> 19 octobre 2025
        </div>
      </div>
    </div>
  );
};

export default GuideUtilisation;
