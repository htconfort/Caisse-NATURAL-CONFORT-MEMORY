/**
 * Composant de saisie de ventes rétroactives
 * Permet d'ajouter des ventes avec une date personnalisée (ex: 29/08)
 */
import React, { useMemo, useState } from 'react';
import { createSale } from '@/services/salesService';
import type { Vendor } from '@/types';

interface Props {
  vendors: Vendor[];              // liste vendeuses
  defaultVendorName?: string;     // optionnel
  eventStart?: number | null;     // timestamp début événement
  eventEnd?: number | null;       // timestamp fin événement
  onCreated?: () => void;         // callback post-création
}

export default function SaisieVenteRetro({
  vendors,
  defaultVendorName,
  eventStart,
  eventEnd,
  onCreated
}: Props) {
  const [vendorName, setVendorName] = useState(defaultVendorName || vendors[0]?.name || '');
  const [amount, setAmount] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<'card'|'cash'|'check'|'multi'>('card');
  const [dateStr, setDateStr] = useState<string>(() => {
    // Par défaut aujourd'hui, mais on pourra choisir 2025-08-29
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth()+1).padStart(2,'0');
    const dd = String(d.getDate()).padStart(2,'0');
    return `${yyyy}-${mm}-${dd}`;
  });
  const [saving, setSaving] = useState(false);

  const minDate = useMemo(() => eventStart ? new Date(eventStart).toISOString().split('T')[0] : undefined, [eventStart]);
  const maxDate = useMemo(() => eventEnd ? new Date(eventEnd).toISOString().split('T')[0] : undefined, [eventEnd]);

  const save = async () => {
    const n = Number(amount.replace(',', '.'));
    if (isNaN(n) || n <= 0) { 
      alert('Montant invalide'); 
      return; 
    }
    if (!vendorName) { 
      alert('Vendeuse obligatoire'); 
      return; 
    }
    if (!dateStr) { 
      alert('Date obligatoire'); 
      return; 
    }

    // Timestamp à 12:00 pour éviter les surprises de fuseau (EU/Paris)
    const d = new Date(dateStr);
    d.setHours(12, 0, 0, 0);
    const ts = d.getTime();

    // Bornage optionnel sur l'intervalle événement
    if (eventStart && ts < new Date(eventStart).setHours(0, 0, 0, 0)) { 
      alert('La date est avant le début de l\'événement.'); 
      return; 
    }
    if (eventEnd && ts > new Date(eventEnd).setHours(23, 59, 59, 999)) { 
      alert('La date est après la fin de l\'événement.'); 
      return; 
    }

    setSaving(true);
    try {
      await createSale({
        vendorName,
        totalAmount: n,
        paymentMethod,
        timestamp: ts
      });
      setAmount('');
      if (onCreated) onCreated();
      alert(`✅ Vente enregistrée au ${new Date(ts).toLocaleDateString('fr-FR')} pour ${vendorName}.`);
    } catch (e) {
      alert(`❌ Erreur: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setSaving(false);
    }
  };

  const inputStyle = {
    padding: '10px',
    fontSize: '14px',
    border: '1px solid #D1D5DB',
    borderRadius: '6px',
    outline: 'none'
  };

  const buttonStyle = {
    padding: '10px 16px',
    borderRadius: '6px',
    border: 'none',
    background: '#111827',
    color: '#fff',
    fontWeight: '700',
    cursor: saving ? 'not-allowed' : 'pointer',
    opacity: saving ? 0.7 : 1
  };

  return (
    <div style={{ 
      background: '#fff', 
      border: '1px solid #E5E7EB', 
      borderRadius: '8px', 
      padding: '16px',
      marginBottom: '16px'
    }}>
      <h3 style={{ marginTop: 0, color: '#111827', display: 'flex', alignItems: 'center', gap: '8px' }}>
        📝 Saisie d'une vente datée
      </h3>
      
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: '1fr 1fr 1fr 1fr', 
        gap: '12px',
        marginBottom: '12px'
      }}>
        <select 
          value={vendorName} 
          onChange={e => setVendorName(e.target.value)}
          style={inputStyle}
        >
          {vendors.map(v => (
            <option key={v.id ?? v.name} value={v.name}>
              {v.name}
            </option>
          ))}
        </select>
        
        <input 
          type="number" 
          inputMode="decimal" 
          step="0.01" 
          placeholder="Montant (€)"
          value={amount} 
          onChange={e => setAmount(e.target.value)}
          style={inputStyle}
        />
        
        <select 
          value={paymentMethod} 
          onChange={e => setPaymentMethod(e.target.value as 'card'|'cash'|'check'|'multi')}
          style={inputStyle}
        >
          <option value="card">Carte</option>
          <option value="cash">Espèces</option>
          <option value="check">Chèque</option>
          <option value="multi">Mixte</option>
        </select>
        
        <input 
          type="date" 
          value={dateStr} 
          onChange={e => setDateStr(e.target.value)} 
          min={minDate} 
          max={maxDate}
          style={inputStyle}
        />
      </div>
      
      <div style={{ marginBottom: '8px' }}>
        <button 
          onClick={save} 
          disabled={saving} 
          style={buttonStyle}
        >
          {saving ? 'Enregistrement…' : 'Enregistrer la vente'}
        </button>
      </div>
      
      <div style={{ fontSize: '12px', color: '#6B7280' }}>
        <strong>Astuce :</strong> pour le <strong>29/08/2025</strong>, choisissez la date correspondante puis enregistrez chaque vente de la vendeuse.
      </div>
    </div>
  );
}
