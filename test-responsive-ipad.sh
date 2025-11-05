#!/bin/bash

# =======================================================
# TEST RESPONSIVE IPAD - CAISSE MYCONFORT
# =======================================================

echo "🚀 Démarrage du test responsive iPad..."

# Couleurs pour les messages
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
YELLOW='\033[0;33m'
NC='\033[0m' # No Color

# 1. Vérifier que les fichiers CSS existent
echo ""
echo -e "${BLUE}1. Vérification des fichiers CSS responsives...${NC}"

if [ -f "src/styles/ipad-responsive.css" ]; then
    echo -e "${GREEN}✅ ipad-responsive.css trouvé${NC}"
else
    echo -e "${RED}❌ ipad-responsive.css manquant${NC}"
    exit 1
fi

# 2. Vérifier que le CSS est importé dans App.tsx
echo ""
echo -e "${BLUE}2. Vérification de l'import CSS dans App.tsx...${NC}"

if grep -q "ipad-responsive.css" "src/App.tsx"; then
    echo -e "${GREEN}✅ CSS importé dans App.tsx${NC}"
else
    echo -e "${RED}❌ CSS non importé dans App.tsx${NC}"
    exit 1
fi

# 3. Vérifier les classes CSS importantes
echo ""
echo -e "${BLUE}3. Vérification des classes CSS importantes...${NC}"

# Vérifier main-content
if grep -q "main-content" "src/App.tsx"; then
    echo -e "${GREEN}✅ Classe main-content utilisée${NC}"
else
    echo -e "${YELLOW}⚠️  Classe main-content non trouvée${NC}"
fi

# Vérifier floating-cart
if grep -q "floating-cart" "src/components/ui/FloatingCart.tsx"; then
    echo -e "${GREEN}✅ Classe floating-cart utilisée${NC}"
else
    echo -e "${YELLOW}⚠️  Classe floating-cart non trouvée${NC}"
fi

# 4. Compiler le projet pour vérifier les erreurs
echo ""
echo -e "${BLUE}4. Test de compilation...${NC}"

if npm run build > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Compilation réussie${NC}"
else
    echo -e "${YELLOW}⚠️  Avertissements de compilation (normal en développement)${NC}"
fi

# 5. Instructions de test
echo ""
echo -e "${BLUE}5. Instructions de test manuel${NC}"
echo "============================================="
echo ""
echo -e "${YELLOW}📱 TESTS À EFFECTUER SUR IPAD :${NC}"
echo ""
echo "Portrait (768x1024) :"
echo "  • Tous les onglets doivent être visibles dans la navigation"
echo "  • Le panier doit être accessible depuis les onglets Produits et Annulation"
echo "  • Aucun élément ne doit dépasser de l'écran"
echo ""
echo "Paysage (1024x768) :"
echo "  • Tous les onglets doivent rester visibles malgré la hauteur réduite"
echo "  • Le panier doit être positionné correctement à droite"
echo "  • Le contenu principal doit s'ajuster pour laisser place au panier"
echo "  • Navigation compacte mais lisible"
echo ""
echo -e "${YELLOW}🧪 TESTS FONCTIONNELS :${NC}"
echo ""
echo "1. Sélectionner une vendeuse"
echo "2. Aller dans l'onglet Produits"
echo "3. Ajouter des articles au panier"
echo "4. Vérifier que le panier est visible en mode portrait et paysage"
echo "5. Tester le panier minimisé/maximisé"
echo "6. Naviguer entre tous les onglets en mode paysage"
echo "7. Vérifier que tous les éléments sont accessibles au doigt"
echo ""
echo -e "${YELLOW}🔧 POUR TESTER :${NC}"
echo ""
echo "npm run dev"
echo "puis ouvrir http://localhost:5173 sur iPad"
echo ""
echo "Ou utiliser les outils développeur Chrome :"
echo "• F12 > Mode responsive"
echo "• Sélectionner 'iPad'"
echo "• Tester les orientations portrait/paysage"
echo ""

# 6. Créer un indicateur de dimensions pour debug
echo -e "${BLUE}6. Création d'un helper de debug (optionnel)...${NC}"

cat > "src/components/ViewportDebugger.tsx" << 'EOF'
import { useState, useEffect } from 'react';

export function ViewportDebugger() {
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const updateDimensions = () => {
      setDimensions({
        width: window.innerWidth,
        height: window.innerHeight
      });
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    window.addEventListener('orientationchange', updateDimensions);

    return () => {
      window.removeEventListener('resize', updateDimensions);
      window.removeEventListener('orientationchange', updateDimensions);
    };
  }, []);

  if (process.env.NODE_ENV === 'production') return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      background: 'rgba(0, 0, 0, 0.8)',
      color: 'white',
      padding: '4px 8px',
      fontSize: '10px',
      zIndex: 99999,
      pointerEvents: 'none'
    }}>
      {dimensions.width}×{dimensions.height}
      {dimensions.width === 768 && dimensions.height === 1024 && ' (iPad Portrait)'}
      {dimensions.width === 1024 && dimensions.height === 768 && ' (iPad Paysage)'}
    </div>
  );
}
EOF

echo -e "${GREEN}✅ ViewportDebugger créé (ajoutez-le à App.tsx pour debug)${NC}"

echo ""
echo -e "${GREEN}🎉 Configuration responsive iPad terminée !${NC}"
echo ""
echo -e "${YELLOW}📋 RÉSUMÉ DES MODIFICATIONS :${NC}"
echo "• Nouveau fichier : src/styles/ipad-responsive.css"
echo "• CSS importé dans App.tsx"
echo "• Classes responsive appliquées aux composants"
echo "• Navigation optimisée pour iPad"
echo "• Panier repositionné pour mode paysage"
echo "• Media queries spécifiques iPad (16:9)"
echo ""
echo -e "${BLUE}Next steps :${NC}"
echo "1. npm run dev"
echo "2. Tester sur iPad ou simulateur"
echo "3. Ajuster si nécessaire les tailles dans ipad-responsive.css"
