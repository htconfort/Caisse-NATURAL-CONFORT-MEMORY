/**
 * Panel de test pour créer des factures avec différentes vendeuses
 * Intégré dans l'application pour tester l'affichage dans la feuille de caisse
 * 
 * Usage: Accessible depuis le DebugDataPanel (Ctrl+Alt+D) ou via l'interface
 */

import { externalInvoiceService } from '@/services/externalInvoiceService';
import { AlertCircle, CheckCircle, FileText, RefreshCw, TestTube, X } from 'lucide-react';
import React, { useCallback, useState } from 'react';

interface VendorInvoiceTestPanelProps {
  isOpen: boolean;
  onClose: () => void;
  inlineMode?: boolean; // 🆕 Prop explicite pour forcer le mode inline
}

interface Vendeuse {
  name: string;
  color: string;
}

export const VendorInvoiceTestPanel: React.FC<VendorInvoiceTestPanelProps> = ({ isOpen, onClose, inlineMode = false }) => {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    message: string;
    details?: any;
  } | null>(null);
  const [customDate, setCustomDate] = useState<string>('');
  const [customTime, setCustomTime] = useState<string>('10:00');
  const [selectedVendeuseTest, setSelectedVendeuseTest] = useState<string>('Babette');

  const vendeuses: Vendeuse[] = [
    { name: 'Sylvie', color: '#477A0C' },
    { name: 'Lucia', color: '#14281D' },
    { name: 'Babette', color: '#F55D3E' },
    { name: 'Johan', color: '#89BBFE' },
    { name: 'Sabrina', color: '#D68FD6' },
    { name: 'Billy', color: '#FFFF99' }
  ];

  // Fonction helper pour normaliser les noms
  const normalizeName = (name: string | undefined | null): string => {
    if (!name) return '';
    return name.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  };

  // Créer des factures Invoice directement dans le format attendu
  const creerFacturesInvoicesDirect = useCallback(async (vendeusesToUse: Vendeuse[], customDateTime?: string): Promise<number> => {
    const dateFacture = customDateTime ? new Date(customDateTime) : new Date();
    const nouvellesFactures = [];

    // Chercher les factures existantes
    const possibleKeys = ['cachedInvoices', 'myconfort_invoices_sync', 'n8n_invoices', 'myconfort-invoices', 'invoices'];
    let existingInvoices: any[] = [];

    for (const key of possibleKeys) {
      try {
        const stored = localStorage.getItem(key);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) {
            existingInvoices = parsed;
            break;
          } else if (parsed && Array.isArray(parsed.invoices)) {
            existingInvoices = parsed.invoices;
            break;
          }
        }
      } catch (e) {
        // Ignorer les erreurs
      }
    }

    vendeusesToUse.forEach((vendeuse, index) => {
      const nbFactures = Math.floor(Math.random() * 2) + 2; // 2 ou 3 factures

      for (let i = 0; i < nbFactures; i++) {
        const montantHT = Math.floor(Math.random() * 500) + 100;
        const tva = montantHT * 0.20;
        const montantTTC = montantHT + tva;

        const invoice = {
          id: `TEST-INV-${vendeuse.name.toUpperCase()}-${index}-${i}-${Date.now()}`,
          number: `TEST-${vendeuse.name.toUpperCase()}-${index + 1}-${i + 1}`,
          clientName: `Client Test ${vendeuse.name} ${i + 1}`,
          clientEmail: `client.${vendeuse.name.toLowerCase()}${i + 1}@test.fr`,
          clientPhone: '0123456789',
          items: [
            {
              id: `item-${Date.now()}-${i}`,
              productName: `Produit Test ${i + 1}`,
              category: 'Matelas',
              quantity: 1,
              unitPrice: montantHT,
              totalPrice: montantHT,
              status: 'delivered' as const,
              stockReserved: false
            }
          ],
          totalHT: montantHT,
          totalTTC: montantTTC,
          status: 'paid' as const,
          dueDate: dateFacture.toISOString(),
          createdAt: dateFacture.toISOString(),
          updatedAt: dateFacture.toISOString(),
          vendorId: `vendor-${vendeuse.name.toLowerCase()}`,
          vendorName: vendeuse.name, // 🎯 CRITIQUE : Nom de la vendeuse
          notes: `Facture de test pour ${vendeuse.name}`,
          paymentDetails: {
            method: 'card' as const,
            status: 'completed' as const,
            totalAmount: montantTTC,
            paidAmount: montantTTC,
            remainingAmount: 0
          }
        };

        nouvellesFactures.push(invoice);
      }
    });

    // Fusionner avec les factures existantes (éviter les doublons)
    const facturesUniques = [...nouvellesFactures];
    existingInvoices.forEach(existing => {
      const exists = facturesUniques.some(f => f.number === existing.number || f.id === existing.id);
      if (!exists) {
        facturesUniques.push(existing);
      }
    });

    // Sauvegarder dans localStorage (priorité à cachedInvoices)
    const cacheKey = 'cachedInvoices';
    try {
      localStorage.setItem(cacheKey, JSON.stringify(facturesUniques));
      console.log(`✅ ${nouvellesFactures.length} factures Invoice injectées dans ${cacheKey} (total: ${facturesUniques.length})`);

      // Sauvegarder aussi dans les autres clés possibles
      for (const key of possibleKeys) {
        if (key !== cacheKey) {
          try {
            localStorage.setItem(key, JSON.stringify(facturesUniques));
          } catch (e) {
            // Ignorer les erreurs
          }
        }
      }

      return nouvellesFactures.length;
    } catch (e) {
      console.error(`❌ Impossible de sauvegarder dans ${cacheKey}:`, e);
      throw new Error('Impossible de sauvegarder les factures');
    }
  }, []);

  // Créer une facture externe de test avec date/heure personnalisable
  const creerFactureExternePersonnalisee = useCallback(async () => {
    if (!customDate) {
      setResult({
        success: false,
        message: 'Veuillez sélectionner une date'
      });
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      // Combiner date et heure
      const dateHeure = `${customDate}T${customTime || '10:00'}:00`;
      const dateHeureISO = new Date(dateHeure).toISOString();
      
      // Créer une facture de test pour la première vendeuse (ou celle sélectionnée)
      const vendeuse = vendeuses[0]; // Par défaut, Sylvie
      const montantHT = 300;
      const tva = montantHT * 0.20;
      const montantTTC = montantHT + tva;

      const facture = {
        invoiceNumber: `TEST-FACTURIER-${Date.now()}`,
        invoiceDate: dateHeureISO.split('T')[0],
        channels: {
          source: 'Facturier (Test)',
          via: 'Panel Test',
          vendorName: vendeuse.name,
          customDateTime: dateHeureISO // 🎯 Date/heure personnalisée
        },
        client: {
          name: `Client Test ${vendeuse.name}`,
          email: `client.test@example.com`
        },
        items: [
          {
            productName: 'Produit Test Facturier',
            category: 'Matelas',
            quantity: 1,
            unitPrice: montantHT,
            totalPrice: montantHT
          }
        ],
        totals: {
          subtotal: montantHT,
          tax: tva,
          ttc: montantTTC
        },
        payment: {
          method: 'card',
          paid: true,
          paidDate: dateHeureISO
        },
        idempotencyKey: `TEST-FACTURIER-${customDate}-${customTime}-${Date.now()}`
      };

      const success = externalInvoiceService.receiveInvoice(facture);
      
      if (success) {
        // Injecter aussi dans cachedInvoices pour l'affichage
        await creerFacturesInvoicesDirect([{
          name: vendeuse.name,
          color: vendeuse.color
        }], dateHeureISO);

        setResult({
          success: true,
          message: `Facture externe de test créée pour ${vendeuse.name}`,
          details: {
            numero: facture.invoiceNumber,
            vendeuse: vendeuse.name,
            montant: montantTTC,
            date: customDate,
            heure: customTime,
            note: '⚠️ Stockée uniquement en localStorage (pas Supabase)'
          }
        });

        window.dispatchEvent(new Event('storage'));
        window.dispatchEvent(new CustomEvent('invoices-updated', { detail: { source: 'test-panel' } }));
      } else {
        setResult({
          success: false,
          message: 'Erreur lors de la création de la facture'
        });
      }
    } catch (error) {
      setResult({
        success: false,
        message: error instanceof Error ? error.message : 'Erreur inconnue'
      });
    } finally {
      setLoading(false);
    }
  }, [customDate, customTime, vendeuses, creerFacturesInvoicesDirect]);

  // Simuler une facture arrivant via N8N (comme le système externe)
  const simulerFactureN8N = useCallback(async () => {
    if (!selectedVendeuseTest) {
      setResult({
        success: false,
        message: 'Veuillez sélectionner une vendeuse'
      });
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const aujourdHui = new Date().toISOString().split('T')[0];
      const maintenant = new Date().toISOString();
      
      // Montant de test
      const montantHT = 450;
      const tva = montantHT * 0.20;
      const montantTTC = montantHT + tva;

      // Format exact d'une facture N8N (InvoicePayload)
      const factureN8N: any = {
        invoiceNumber: `F-N8N-${selectedVendeuseTest.toUpperCase()}-${Date.now()}`,
        invoiceDate: aujourdHui,
        channels: {
          source: 'N8N Webhook',
          via: 'Facturier',
          vendorName: selectedVendeuseTest // 🎯 CRITIQUE : Nom de la vendeuse
        },
        client: {
          name: `Client N8N Test ${selectedVendeuseTest}`,
          email: `client.n8n.${selectedVendeuseTest.toLowerCase()}@test.fr`,
          phone: '0612345678',
          address: 'Adresse N8N Test'
        },
        items: [
          {
            productName: 'Matelas Premium Test N8N',
            category: 'Matelas',
            quantity: 1,
            unitPrice: montantHT,
            totalPrice: montantHT,
            sku: `SKU-N8N-${Date.now()}`
          }
        ],
        totals: {
          subtotal: montantHT,
          tax: tva,
          ttc: montantTTC
        },
        payment: {
          method: 'card',
          paid: true,
          paidDate: aujourdHui,
          paidAmount: montantTTC
        },
        idempotencyKey: `N8N-TEST-${selectedVendeuseTest}-${Date.now()}`
      };

      // Réceptionner via externalInvoiceService (comme N8N)
      const success = externalInvoiceService.receiveInvoice(factureN8N);
      
      if (success) {
        // Injecter aussi dans cachedInvoices pour l'affichage (format Invoice)
        const invoiceFormat: any = {
          id: factureN8N.idempotencyKey,
          number: factureN8N.invoiceNumber,
          clientName: factureN8N.client.name,
          clientEmail: factureN8N.client.email,
          clientPhone: factureN8N.client.phone,
          items: factureN8N.items.map((item: any) => ({
            id: `item-${Date.now()}-${item.sku}`,
            productName: item.productName,
            category: item.category,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            totalPrice: item.totalPrice,
            status: 'delivered' as const,
            stockReserved: false
          })),
          totalHT: montantHT,
          totalTTC: montantTTC,
          status: 'paid' as const,
          dueDate: maintenant,
          createdAt: maintenant,
          updatedAt: maintenant,
          vendorId: `vendor-${selectedVendeuseTest.toLowerCase()}`,
          vendorName: selectedVendeuseTest, // 🎯 CRITIQUE : Nom de la vendeuse
          notes: `Facture simulée N8N pour ${selectedVendeuseTest}`,
          paymentDetails: {
            method: 'card' as const,
            status: 'completed' as const,
            totalAmount: montantTTC,
            paidAmount: montantTTC,
            remainingAmount: 0
          }
        };

        // Sauvegarder dans cachedInvoices
        const cacheKey = 'cachedInvoices';
        try {
          const stored = localStorage.getItem(cacheKey);
          const existing = stored ? JSON.parse(stored) : [];
          const facturesUniques = [...existing, invoiceFormat];
          localStorage.setItem(cacheKey, JSON.stringify(facturesUniques));
        } catch (e) {
          console.error('Erreur sauvegarde cachedInvoices:', e);
        }

        setResult({
          success: true,
          message: `Facture N8N simulée créée pour ${selectedVendeuseTest}`,
          details: {
            numero: factureN8N.invoiceNumber,
            vendeuse: selectedVendeuseTest,
            montant: montantTTC.toFixed(2) + '€',
            source: 'N8N (simulé)',
            note: '✅ Stockée en localStorage (comme une vraie facture N8N)'
          }
        });

        // Forcer le rechargement et les événements
        window.dispatchEvent(new Event('storage'));
        window.dispatchEvent(new CustomEvent('invoices-updated', { detail: { source: 'n8n-simulation' } }));
        window.dispatchEvent(new CustomEvent('external-invoices-updated'));

        console.log('✅ Facture N8N simulée créée !');
        console.log('📊 Détails:', {
          vendeuse: selectedVendeuseTest,
          montant: montantTTC,
          numero: factureN8N.invoiceNumber
        });
        console.log('💡 Rechargez la page (F5) pour voir la facture dans le CA instant et la feuille de caisse');
      } else {
        setResult({
          success: false,
          message: 'Erreur lors de la création de la facture N8N'
        });
      }
    } catch (error) {
      setResult({
        success: false,
        message: error instanceof Error ? error.message : 'Erreur inconnue'
      });
      console.error('❌ Erreur simulation N8N:', error);
    } finally {
      setLoading(false);
    }
  }, [selectedVendeuseTest]);

  // Créer des factures de test pour toutes les vendeuses
  const creerFacturesTest = useCallback(async () => {
    setLoading(true);
    setResult(null);

    try {
      // 1. Créer des factures externes via externalInvoiceService
      const aujourdHui = new Date().toISOString().split('T')[0];
      const facturesExternes = [];

      vendeuses.forEach((vendeuse, index) => {
        const nbFactures = Math.floor(Math.random() * 2) + 2;

        for (let i = 0; i < nbFactures; i++) {
          const montantHT = Math.floor(Math.random() * 500) + 100;
          const tva = montantHT * 0.20;
          const montantTTC = montantHT + tva;

          const facture = {
            invoiceNumber: `TEST-${vendeuse.name.toUpperCase()}-${index + 1}-${i + 1}-${Date.now()}`,
            invoiceDate: aujourdHui,
            channels: {
              source: 'Test Local',
              via: 'Script Test',
              vendorName: vendeuse.name
            },
            client: {
              name: `Client Test ${vendeuse.name} ${i + 1}`,
              email: `client.${vendeuse.name.toLowerCase()}${i + 1}@test.fr`,
              address: 'Adresse test'
            },
            items: [
              {
                productName: `Produit Test ${i + 1}`,
                category: 'Matelas',
                quantity: 1,
                unitPrice: montantHT,
                totalPrice: montantHT
              }
            ],
            totals: {
              subtotal: montantHT,
              tax: tva,
              ttc: montantTTC
            },
            payment: {
              method: 'card',
              paid: true,
              paidDate: aujourdHui
            },
            idempotencyKey: `TEST-${vendeuse.name}-${index}-${i}-${aujourdHui}`
          };

          const success = externalInvoiceService.receiveInvoice(facture);
          if (success) {
            facturesExternes.push({
              vendeuse: vendeuse.name,
              numero: facture.invoiceNumber,
              montant: montantTTC
            });
          }
        }
      });

      // 2. Injecter des factures Invoice directement
      const invoicesCount = await creerFacturesInvoicesDirect(vendeuses);

      // 3. Résumé par vendeuse
      const parVendeuse: Record<string, { count: number; total: number }> = {};
      facturesExternes.forEach(f => {
        if (!parVendeuse[f.vendeuse]) {
          parVendeuse[f.vendeuse] = { count: 0, total: 0 };
        }
        parVendeuse[f.vendeuse].count++;
        parVendeuse[f.vendeuse].total += f.montant;
      });

      setResult({
        success: true,
        message: `${facturesExternes.length} factures externes + ${invoicesCount} factures Invoice créées`,
        details: {
          totalExternes: facturesExternes.length,
          totalInvoices: invoicesCount,
          parVendeuse
        }
      });

      // Forcer le rechargement
      window.dispatchEvent(new Event('storage'));
      window.dispatchEvent(new CustomEvent('invoices-updated', { detail: { source: 'test-panel' } }));

      console.log('✅ Factures de test créées !');
      console.log('📊 Résumé:', parVendeuse);
      console.log('💡 Rechargez la page (F5) pour voir les factures dans la feuille de caisse');
    } catch (error) {
      setResult({
        success: false,
        message: error instanceof Error ? error.message : 'Erreur inconnue',
        details: { error: String(error) }
      });
      console.error('❌ Erreur lors de la création des factures:', error);
    } finally {
      setLoading(false);
    }
  }, [vendeuses, creerFacturesInvoicesDirect]);

  // Créer des factures avec variations de noms
  const creerFacturesVariations = useCallback(async () => {
    setLoading(true);
    setResult(null);

    try {
      const aujourdHui = new Date().toISOString().split('T')[0];
      const variations = [
        { name: 'Sylvie', invoiceVendor: 'Sylvie' },
        { name: 'Sylvie', invoiceVendor: 'sylvie' },
        { name: 'Sylvie', invoiceVendor: 'SYLVIE' },
        { name: 'Sylvie', invoiceVendor: 'Sylvie ' },
        { name: 'Sylvie', invoiceVendor: ' Sylvie' },
        { name: 'Lucia', invoiceVendor: 'Lucia' },
        { name: 'Babette', invoiceVendor: 'babette' },
      ];

      let created = 0;

      variations.forEach((variation, index) => {
        const montant = 200 + (index * 50);
        const tva = montant * 0.20;

        const facture = {
          invoiceNumber: `TEST-VAR-${index + 1}-${Date.now()}`,
          invoiceDate: aujourdHui,
          channels: {
            source: 'Test Variations',
            via: 'Test Panel',
            vendorName: variation.invoiceVendor
          },
          client: {
            name: `Client Test ${variation.name}`,
            email: 'test@test.fr'
          },
          items: [{
            productName: 'Produit Test',
            category: 'Matelas',
            quantity: 1,
            unitPrice: montant,
            totalPrice: montant
          }],
          totals: {
            subtotal: montant,
            tax: tva,
            ttc: montant + tva
          },
          payment: {
            method: 'card',
            paid: true
          },
          idempotencyKey: `TEST-VAR-${variation.name}-${index}-${Date.now()}`
        };

        if (externalInvoiceService.receiveInvoice(facture)) {
          created++;
        }
      });

      setResult({
        success: true,
        message: `${created} factures avec variations de noms créées`,
        details: { created, variations: variations.length }
      });

      window.dispatchEvent(new Event('storage'));
      window.dispatchEvent(new CustomEvent('invoices-updated', { detail: { source: 'test-panel' } }));
    } catch (error) {
      setResult({
        success: false,
        message: error instanceof Error ? error.message : 'Erreur inconnue'
      });
    } finally {
      setLoading(false);
    }
  }, []);

  // Nettoyer les factures de test
  const nettoyerFactures = useCallback(() => {
    if (!confirm('Voulez-vous supprimer toutes les factures de test ?')) {
      return;
    }

    setLoading(true);
    try {
      externalInvoiceService.clearAllInvoices();
      
      // Nettoyer les factures Invoice du cache
      const keysToRemove = ['cachedInvoices', 'myconfort_invoices_sync', 'n8n_invoices', 'myconfort-invoices'];
      keysToRemove.forEach(key => {
        try {
          const stored = localStorage.getItem(key);
          if (stored) {
            const parsed = JSON.parse(stored);
            if (Array.isArray(parsed)) {
              // Filtrer les factures de test (commencent par TEST-)
              const filtered = parsed.filter((inv: any) => !inv.number?.startsWith('TEST-') && !inv.id?.startsWith('TEST-'));
              localStorage.setItem(key, JSON.stringify(filtered));
            }
          }
        } catch (e) {
          // Ignorer les erreurs
        }
      });

      setResult({
        success: true,
        message: 'Factures de test supprimées'
      });

      window.dispatchEvent(new Event('storage'));
    } catch (error) {
      setResult({
        success: false,
        message: error instanceof Error ? error.message : 'Erreur lors du nettoyage'
      });
    } finally {
      setLoading(false);
    }
  }, []);

  if (!isOpen) return null;

  // Mode inline explicite ou détection automatique
  const isInlineMode = inlineMode === true;

  return (
    <div className={isInlineMode ? "w-full bg-white rounded-lg border border-gray-200 shadow-sm" : "fixed inset-0 bg-black bg-opacity-50 z-[10000] flex items-center justify-center p-4"}>
      <div className={`bg-white rounded-lg ${isInlineMode ? 'max-w-full' : 'max-w-2xl'} w-full ${isInlineMode ? '' : 'max-h-[90vh]'} ${isInlineMode ? '' : 'overflow-hidden'} flex flex-col`}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b bg-gray-50">
          <div className="flex items-center gap-2">
            <TestTube className="text-purple-500" size={20} />
            <h2 className="text-lg font-bold">Test Factures Vendeuses</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-4 space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-sm text-blue-800">
              🧪 Ce panel permet de créer des factures de test <strong>localement seulement</strong> (localStorage, pas Supabase) 
              pour tester l'affichage des vendeuses dans la feuille de caisse.
            </p>
          </div>

          {/* Section Simulation N8N */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 space-y-3">
            <h3 className="font-bold text-green-900">🔄 Simulation Facture N8N</h3>
            <p className="text-sm text-green-800">
              Simule une facture arrivant via <strong>N8N</strong> (comme le système externe) 
              pour tester l'affichage dans le <strong>CA instant</strong> et la <strong>feuille de caisse</strong>.
            </p>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Vendeuse (pour tester)
              </label>
              <select
                value={selectedVendeuseTest}
                onChange={(e) => setSelectedVendeuseTest(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              >
                {vendeuses.map((v) => (
                  <option key={v.name} value={v.name}>
                    {v.name}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={simulerFactureN8N}
              disabled={loading || !selectedVendeuseTest}
              className="w-full flex items-center gap-2 p-3 border border-green-400 bg-green-100 rounded-lg hover:bg-green-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <FileText className="text-green-700" size={20} />
              <div className="text-left flex-1">
                <div className="font-medium text-green-900">Simuler facture N8N pour {selectedVendeuseTest}</div>
                <div className="text-sm text-green-800">
                  Montant: 450€ HT (540€ TTC) - Format identique à une vraie facture N8N
                </div>
              </div>
              {loading && <RefreshCw className="animate-spin text-green-700" size={16} />}
            </button>
          </div>

          {/* Section Facture externe personnalisable */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 space-y-3">
            <h3 className="font-bold text-yellow-900">📅 Facture Externe (Date/Heure personnalisable)</h3>
            <p className="text-sm text-yellow-800">
              Crée une facture externe de test <strong>uniquement en localStorage</strong> (pas Supabase) 
              avec une date/heure personnalisable pour tester avant l'ouverture du magasin.
            </p>
            
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date
                </label>
                <input
                  type="date"
                  value={customDate}
                  onChange={(e) => setCustomDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Heure (ex: 10:00)
                </label>
                <input
                  type="time"
                  value={customTime}
                  onChange={(e) => setCustomTime(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
            </div>

            <button
              onClick={creerFactureExternePersonnalisee}
              disabled={loading || !customDate}
              className="w-full flex items-center gap-2 p-3 border border-yellow-400 bg-yellow-100 rounded-lg hover:bg-yellow-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <FileText className="text-yellow-700" size={20} />
              <div className="text-left flex-1">
                <div className="font-medium text-yellow-900">Créer facture externe de test</div>
                <div className="text-sm text-yellow-800">
                  {customDate ? `Date: ${customDate} à ${customTime || '10:00'}` : 'Sélectionnez une date'}
                </div>
              </div>
              {loading && <RefreshCw className="animate-spin text-yellow-700" size={16} />}
            </button>
          </div>

          {/* Actions */}
          <div className="space-y-3">
            <button
              onClick={creerFacturesTest}
              disabled={loading}
              className="w-full flex items-center gap-2 p-3 border border-purple-300 rounded-lg hover:bg-purple-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <FileText className="text-purple-500" size={20} />
              <div className="text-left flex-1">
                <div className="font-medium">Créer factures test pour toutes les vendeuses</div>
                <div className="text-sm text-gray-600">
                  Crée 2-3 factures par vendeuse (Sylvie, Lucia, Babette, Johan, Sabrina, Billy, Karima)
                </div>
              </div>
              {loading && <RefreshCw className="animate-spin text-purple-500" size={16} />}
            </button>

            <button
              onClick={creerFacturesVariations}
              disabled={loading}
              className="w-full flex items-center gap-2 p-3 border border-orange-300 rounded-lg hover:bg-orange-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <TestTube className="text-orange-500" size={20} />
              <div className="text-left flex-1">
                <div className="font-medium">Tester variations de noms</div>
                <div className="text-sm text-gray-600">
                  Crée des factures avec différentes variations (espaces, casse) pour tester la normalisation
                </div>
              </div>
              {loading && <RefreshCw className="animate-spin text-orange-500" size={16} />}
            </button>

            <button
              onClick={nettoyerFactures}
              disabled={loading}
              className="w-full flex items-center gap-2 p-3 border border-red-300 rounded-lg hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <X className="text-red-500" size={20} />
              <div className="text-left flex-1">
                <div className="font-medium text-red-600">Nettoyer factures de test</div>
                <div className="text-sm text-gray-600">
                  Supprime toutes les factures commençant par "TEST-"
                </div>
              </div>
              {loading && <RefreshCw className="animate-spin text-red-500" size={16} />}
            </button>
          </div>

          {/* Résultat */}
          {result && (
            <div className={`border rounded-lg p-3 ${
              result.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
            }`}>
              <div className="flex items-start gap-2">
                {result.success ? (
                  <CheckCircle className="text-green-600 mt-0.5" size={20} />
                ) : (
                  <AlertCircle className="text-red-600 mt-0.5" size={20} />
                )}
                <div className="flex-1">
                  <div className={`font-medium ${result.success ? 'text-green-800' : 'text-red-800'}`}>
                    {result.message}
                  </div>
                  {result.details && (
                    <div className="text-sm text-gray-600 mt-2">
                      <pre className="bg-white p-2 rounded text-xs overflow-auto max-h-32">
                        {JSON.stringify(result.details, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Instructions */}
          <div className="bg-gray-50 border rounded-lg p-3 text-sm text-gray-700">
            <div className="font-medium mb-2">📝 Instructions :</div>
            <ol className="list-decimal list-inside space-y-1">
              <li>Cliquez sur "Créer factures test" pour générer des factures</li>
              <li><strong>Rechargez la page (F5)</strong> pour que les factures soient chargées</li>
              <li>Allez dans l'onglet <strong>RAZ</strong></li>
              <li>Cliquez sur <strong>"Voir la feuille"</strong></li>
              <li>Vérifiez que toutes les vendeuses apparaissent dans le tableau</li>
              <li>Consultez la console pour les logs de debug</li>
            </ol>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t p-3 bg-gray-50 text-xs text-gray-500 text-center">
          💡 Ces factures sont stockées localement uniquement (localStorage) et n'apparaissent pas dans Supabase
        </div>
      </div>
    </div>
  );
};

