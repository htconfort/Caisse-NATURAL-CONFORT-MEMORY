// Test de vérification des imports
import { FloatingCart } from './src/components/ui/FloatingCart';
import { CartTypeSelector } from './src/components/ui/CartTypeSelector';
import { ManualInvoiceModal } from './src/components/ui/ManualInvoiceModal';

console.log('✅ FloatingCart:', typeof FloatingCart);
console.log('✅ CartTypeSelector:', typeof CartTypeSelector);
console.log('✅ ManualInvoiceModal:', typeof ManualInvoiceModal);

// Vérifier le contenu du FloatingCart
const floatingCartCode = FloatingCart.toString();
if (floatingCartCode.includes('v3.0')) {
  console.log('✅ v3.0 trouvé dans FloatingCart');
} else {
  console.log('❌ v3.0 NON trouvé dans FloatingCart');
}

if (floatingCartCode.includes('CartTypeSelector')) {
  console.log('✅ CartTypeSelector trouvé dans FloatingCart');
} else {
  console.log('❌ CartTypeSelector NON trouvé dans FloatingCart');
}
