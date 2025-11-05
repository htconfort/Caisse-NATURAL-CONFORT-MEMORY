#!/bin/bash

# Script pour ouvrir localhost:5173 avec les dimensions exactes d'iPad
echo "🚀 Ouverture du simulateur iPad pour MyConfort Caisse..."

# Fermer toutes les fenêtres Safari précédentes (optionnel)
# killall Safari 2>/dev/null || true

# Fonction pour ouvrir Safari avec des dimensions spécifiques
open_ipad_simulator() {
    local orientation=$1
    local width=$2
    local height=$3
    
    echo "📱 Mode $orientation : ${width}x${height}px"
    
    # Ouvrir Safari avec une nouvelle fenêtre
    osascript -e "
        tell application \"Safari\"
            activate
            make new document with properties {URL:\"http://localhost:5173\"}
            delay 1
            
            set bounds of front window to {100, 100, $((100 + width)), $((100 + height))}
            
            -- Afficher la barre d'outils pour avoir les dimensions exactes
            tell front window
                set toolbar visible to true
            end tell
        end tell
    "
}

# Menu interactif
echo ""
echo "🎮 Choisissez l'orientation iPad :"
echo "1) 🖥️  Paysage (1024 × 768)"
echo "2) 📱 Portrait (768 × 1024)"
echo "3) 🔄 Les deux (paysage puis portrait)"
echo ""
read -p "Votre choix (1-3) : " choice

case $choice in
    1)
        open_ipad_simulator "Paysage" 1024 768
        ;;
    2)
        open_ipad_simulator "Portrait" 768 1024
        ;;
    3)
        echo "🔄 Ouverture des deux orientations..."
        open_ipad_simulator "Paysage" 1024 768
        sleep 2
        open_ipad_simulator "Portrait" 768 1024
        ;;
    *)
        echo "❌ Choix invalide. Ouverture en mode paysage par défaut..."
        open_ipad_simulator "Paysage" 1024 768
        ;;
esac

echo ""
echo "✅ Simulateur iPad ouvert !"
echo "🔗 URL : http://localhost:5173"
echo "📐 Testez maintenant la visibilité du panier en mode paysage iPad"
echo ""
echo "💡 Conseils :"
echo "   - Vérifiez que les onglets de navigation sont visibles"
echo "   - Testez l'ajout d'articles au panier"
echo "   - Observez le comportement du FloatingCart"
echo ""
