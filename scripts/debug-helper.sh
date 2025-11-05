#!/bin/bash

# ==========================
# 🔧 Debug Data Panel Helper
# ==========================
# Script utilitaire pour diagnostiquer et résoudre les problèmes de données
# entre iPad et desktop dans MyConfort Caisse

set -e

# Couleurs pour l'affichage
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Fonction d'affichage avec couleurs
print_header() {
    echo -e "${BLUE}╔══════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║${NC} ${CYAN}🔧 Debug Data Panel Helper - MyConfort Caisse${NC}           ${BLUE}║${NC}"
    echo -e "${BLUE}╚══════════════════════════════════════════════════════════════╝${NC}"
    echo ""
}

print_section() {
    echo -e "${PURPLE}▶ $1${NC}"
    echo ""
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# Vérifier que nous sommes dans le bon répertoire
check_project_directory() {
    if [[ ! -f "package.json" ]] || [[ ! -d "src" ]]; then
        print_error "Ce script doit être exécuté depuis la racine du projet MyConfort Caisse"
        exit 1
    fi
    
    if ! grep -q "mon-projet-vite" package.json 2>/dev/null; then
        print_warning "Répertoire de projet détecté mais package.json semble différent"
    fi
}

# Vérifier que l'application est en cours d'exécution
check_app_running() {
    local ports=("5173" "5174" "3000" "8080")
    local running_port=""
    
    for port in "${ports[@]}"; do
        if lsof -i ":$port" &>/dev/null; then
            running_port="$port"
            break
        fi
    done
    
    if [[ -n "$running_port" ]]; then
        print_success "Application détectée sur le port $running_port"
        echo "🌐 URL: http://localhost:$running_port"
        return 0
    else
        print_warning "Aucune application détectée sur les ports standard"
        return 1
    fi
}

# Démarrer l'application si nécessaire
start_app() {
    print_section "Démarrage de l'application"
    
    if check_app_running; then
        return 0
    fi
    
    print_info "Démarrage de l'application en mode développement..."
    
    # Essayer sur différents ports
    local ports=("5173" "5174" "3000")
    for port in "${ports[@]}"; do
        if ! lsof -i ":$port" &>/dev/null; then
            echo -e "${CYAN}Démarrage sur le port $port...${NC}"
            npm run dev -- --port "$port" &
            local pid=$!
            
            # Attendre que l'application démarre
            sleep 3
            
            if kill -0 "$pid" 2>/dev/null && lsof -i ":$port" &>/dev/null; then
                print_success "Application démarrée sur le port $port (PID: $pid)"
                echo "🌐 URL: http://localhost:$port"
                return 0
            else
                print_warning "Échec du démarrage sur le port $port"
            fi
        fi
    done
    
    print_error "Impossible de démarrer l'application"
    return 1
}

# Afficher les instructions pour accéder au Debug Panel
show_debug_instructions() {
    print_section "Instructions d'accès au Debug Data Panel"
    
    echo -e "${CYAN}Méthodes pour ouvrir le panel :${NC}"
    echo ""
    echo -e "  ${GREEN}1. Raccourci clavier :${NC}"
    echo -e "     • Sur PC : ${YELLOW}Ctrl + Alt + D${NC}"
    echo -e "     • Sur Mac : ${YELLOW}⌘ + Alt + D${NC}"
    echo ""
    echo -e "  ${GREEN}2. Console développeur :${NC}"
    echo -e "     ${YELLOW}window.dispatchEvent(new CustomEvent('open-debug-panel'))${NC}"
    echo ""
    echo -e "  ${GREEN}3. Marque-page JavaScript :${NC}"
    echo -e "     ${YELLOW}javascript:window.dispatchEvent(new CustomEvent('open-debug-panel'))${NC}"
    echo ""
}

# Afficher les onglets et fonctionnalités disponibles
show_panel_features() {
    print_section "Fonctionnalités du Debug Data Panel"
    
    echo -e "${CYAN}📊 Onglets disponibles :${NC}"
    echo ""
    echo -e "  ${GREEN}🗂️  Données${NC}      - Tables IndexedDB, compteurs, échantillons"
    echo -e "  ${GREEN}🛠️  Environnement${NC} - Variables de build, configuration"
    echo -e "  ${GREEN}💾 Stockage${NC}     - Utilisation IndexedDB, quotas"
    echo -e "  ${GREEN}⚡ Actions${NC}      - Export, sync, reset, re-seed"
    echo ""
    
    echo -e "${CYAN}🔧 Actions principales :${NC}"
    echo ""
    echo -e "  ${YELLOW}📁 Export JSON${NC}     - Sauvegarde complète des données"
    echo -e "  ${YELLOW}🔄 Force Sync${NC}      - Re-synchronisation manuelle"
    echo -e "  ${YELLOW}🌱 Re-seed (DEV)${NC}   - Données par défaut en développement"
    echo -e "  ${YELLOW}⚠️  Reset DB${NC}       - Suppression complète (DANGER)"
    echo ""
}

# Diagnostiquer les problèmes courants
diagnose_common_issues() {
    print_section "Diagnostic des problèmes courants"
    
    echo -e "${CYAN}🔍 Problèmes fréquents iPad/Desktop :${NC}"
    echo ""
    echo -e "  ${YELLOW}1. Données manquantes sur iPad${NC}"
    echo -e "     → Ouvrir panel → Actions → Forcer synchronisation"
    echo ""
    echo -e "  ${YELLOW}2. Doublons entre appareils${NC}"
    echo -e "     → Comparer onglet Données → Export depuis correct → Reset sur problématique"
    echo ""
    echo -e "  ${YELLOW}3. Versions différentes${NC}"
    echo -e "     → Vérifier onglet Environnement → VITE_COMMIT_REF identique ?"
    echo ""
    echo -e "  ${YELLOW}4. Stockage saturé${NC}"
    echo -e "     → Onglet Stockage → Si >80% → Export + Reset"
    echo ""
}

# Vérifier l'état des dépendances
check_dependencies() {
    print_section "Vérification des dépendances"
    
    # Vérifier Node.js
    if command -v node &>/dev/null; then
        local node_version=$(node --version)
        print_success "Node.js détecté : $node_version"
    else
        print_error "Node.js non détecté"
        return 1
    fi
    
    # Vérifier npm
    if command -v npm &>/dev/null; then
        local npm_version=$(npm --version)
        print_success "npm détecté : $npm_version"
    else
        print_error "npm non détecté"
        return 1
    fi
    
    # Vérifier les node_modules
    if [[ -d "node_modules" ]]; then
        print_success "node_modules présent"
    else
        print_warning "node_modules manquant - exécuter 'npm install'"
    fi
    
    return 0
}

# Ouvrir la documentation
open_documentation() {
    local doc_file="docs/DEBUG_DATA_PANEL.md"
    
    if [[ -f "$doc_file" ]]; then
        print_info "Ouverture de la documentation..."
        
        # Essayer différents éditeurs/visualiseurs
        if command -v code &>/dev/null; then
            code "$doc_file"
        elif command -v open &>/dev/null; then
            open "$doc_file"
        elif command -v xdg-open &>/dev/null; then
            xdg-open "$doc_file"
        else
            print_info "Documentation disponible dans : $doc_file"
        fi
    else
        print_warning "Documentation non trouvée : $doc_file"
    fi
}

# Menu principal
show_menu() {
    echo ""
    echo -e "${CYAN}Options disponibles :${NC}"
    echo ""
    echo -e "  ${GREEN}1${NC} - Démarrer l'application"
    echo -e "  ${GREEN}2${NC} - Instructions d'accès au panel"
    echo -e "  ${GREEN}3${NC} - Fonctionnalités du panel"
    echo -e "  ${GREEN}4${NC} - Diagnostic des problèmes"
    echo -e "  ${GREEN}5${NC} - Vérifier les dépendances"
    echo -e "  ${GREEN}6${NC} - Ouvrir la documentation"
    echo -e "  ${GREEN}0${NC} - Quitter"
    echo ""
    echo -n -e "${YELLOW}Votre choix : ${NC}"
}

# Fonction principale
main() {
    print_header
    check_project_directory
    
    # Vérification rapide de l'état
    echo -e "${CYAN}État actuel :${NC}"
    check_app_running || print_info "Application non démarrée"
    echo ""
    
    # Menu interactif
    while true; do
        show_menu
        read -r choice
        echo ""
        
        case $choice in
            1)
                start_app
                ;;
            2)
                show_debug_instructions
                ;;
            3)
                show_panel_features
                ;;
            4)
                diagnose_common_issues
                ;;
            5)
                check_dependencies
                ;;
            6)
                open_documentation
                ;;
            0)
                print_success "Au revoir !"
                exit 0
                ;;
            *)
                print_warning "Option invalide. Choisissez un nombre entre 0 et 6."
                ;;
        esac
        
        echo ""
        echo -e "${BLUE}────────────────────────────────────────────────────────────────${NC}"
    done
}

# Gestion des signaux
trap 'print_error "Script interrompu"; exit 1' INT TERM

# Exécution
main "$@"
