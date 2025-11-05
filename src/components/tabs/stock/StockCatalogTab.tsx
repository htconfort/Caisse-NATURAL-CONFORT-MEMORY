import { useMemo, useState } from 'react';
import type { ProductCategory, CatalogProduct } from '../../../types';
import { PinModal } from '../../ui/PinModal';
import { productCatalog } from '../../../data';
import '../../../styles/general-stock-compact.css';

interface StockCatalogTabProps {
  products?: CatalogProduct[]; // optionnel : par défaut on lit productCatalog
}

const fmtEUR = (n: number) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n);

export default function StockCatalogTab({ products }: StockCatalogTabProps) {
  const data = products ?? productCatalog;

  const [q, setQ] = useState('');
  const [cat, setCat] = useState<ProductCategory | 'ALL'>('ALL');
  const [pinOpen, setPinOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<CatalogProduct | null>(null);

  // Catégories (à partir des produits)
  const categories: ProductCategory[] = useMemo(() => {
    const s = new Set<string>();
    data.forEach(p => p.category && s.add(p.category));
    return Array.from(s).sort() as ProductCategory[];
  }, [data]);

  // KPIs
  const kpi = useMemo(() => {
    const refs = data.length;
    const actives = data.filter(p => p.priceTTC > 0).length; // Considérer actif si vendu seul
    const uniqueCategories = new Set(data.map(p => p.category)).size;
    return { refs, actives, uniqueCategories };
  }, [data]);

  // Filtre
  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return data.filter(p => {
      const hitsTerm =
        !term ||
        p.name.toLowerCase().includes(term) ||
        p.category.toLowerCase().includes(term) ||
        (p.description ?? '').toLowerCase().includes(term);
      const hitsCat = cat === 'ALL' || p.category === cat;
      return hitsTerm && hitsCat;
    });
  }, [data, q, cat]);

  // Tri par nom puis catégorie
  const rows = useMemo(
    () => [...filtered].sort((a, b) => a.name.localeCompare(b.name) || a.category.localeCompare(b.category)),
    [filtered]
  );

  const exportCSV = () => {
    if (rows.length === 0) return;
    const headers = ['name', 'category', 'priceTTC', 'price', 'description'];
    const csv = [headers.join(',')]
      .concat(rows.map(p =>
        [
          p.name.replace(/,/g, ' '),
          p.category,
          p.priceTTC,
          p.price ?? '',
          (p.description ?? '').replace(/,/g, ' '),
        ].join(',')
      ))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `catalogue_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const beige = 'var(--neutral-beige)';

  return (
    <div className="stock-elegant-container animate-fadeIn">
      {/* Header sticky */}
      <div className="section-header flex items-center justify-between">
        <h2 className="text-3xl font-bold vendor-black-text">Catalogue produits</h2>
        <div className="flex items-center gap-4">
          <select
            className="input"
            value={cat}
            onChange={e => setCat(e.target.value as ProductCategory | 'ALL')}
            style={{ width: 220 }}
          >
            <option value="ALL">Toutes catégories</option>
            {categories.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>

          <input
            className="input search-compact"
            placeholder="Rechercher (nom, catégorie, description)"
            value={q}
            onChange={e => setQ(e.target.value)}
            style={{ width: 360, maxWidth: '50vw' }}
          />

          <button onClick={exportCSV} className="btn-primary flex items-center gap-2 touch-feedback">
            ⭳ Export CSV
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <div className="card text-center stat-card">
          <h3 className="text-sm font-semibold mb-2 vendor-black-text">Références</h3>
          <p className="text-3xl font-bold vendor-black-text">{kpi.refs}</p>
        </div>
        <div className="card text-center stat-card">
          <h3 className="text-sm font-semibold mb-2 vendor-black-text">Vendables</h3>
          <p className="text-3xl font-bold vendor-black-text">{kpi.actives}</p>
        </div>
        <div className="card text-center stat-card">
          <h3 className="text-sm font-semibold mb-2 vendor-black-text">Catégories</h3>
          <p className="text-3xl font-bold vendor-black-text">{kpi.uniqueCategories}</p>
        </div>
      </div>

      {/* Tableau */}
      <div className="card">
        <div className="flex items-center gap-2 mb-4">
          <h3 className="text-lg font-bold vendor-black-text">Liste des produits</h3>
          <span className="rounded-full text-xs font-semibold px-3 py-1" style={{ background: beige, color: '#000' }}>
            {rows.length} article{rows.length > 1 ? 's' : ''}
          </span>
        </div>

        {rows.length === 0 ? (
          <div className="text-center py-8"><p style={{ color:'#666' }}>Aucun produit</p></div>
        ) : (
          <div className="rounded-lg border overflow-hidden" style={{ borderColor:'#E5E7EB' }}>
            <div className="table-scroll table-sticky">
              <table className="w-full text-sm table--compact">
                <thead>
                  <tr className="border-b" style={{ borderColor:'#E5E7EB' }}>
                    <th className="text-left py-3 px-4 font-semibold vendor-black-text">Produit</th>
                    <th className="text-left py-3 px-4 font-semibold vendor-black-text">Catégorie</th>
                    <th className="text-right py-3 px-4 font-semibold vendor-black-text">Prix TTC</th>
                    <th className="text-right py-3 px-4 font-semibold vendor-black-text">Prix HT</th>
                    <th className="text-center py-3 px-4 font-semibold vendor-black-text">État</th>
                    <th className="text-left py-3 px-4 font-semibold vendor-black-text">Description</th>
                    <th className="text-center py-3 px-4 font-semibold vendor-black-text">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.slice(0, 300).map((p, idx) => {
                    const vendable = p.priceTTC > 0;
                    return (
                      <tr
                        key={`catalog|${p.name}|${p.category}|${idx}`}
                        className="row-elegant"
                      >
                        <td className="cell vendor-black-text">
                          <div className="cell-title">{p.name}</div>
                        </td>
                        <td className="cell vendor-black-text">
                          <span className="pill pill--neutral">{p.category}</span>
                        </td>
                        <td className="cell cell--amount vendor-black-text">
                          {vendable ? fmtEUR(p.priceTTC) : '-'}
                        </td>
                        <td className="cell cell--amount vendor-black-text">
                          {p.price ? fmtEUR(p.price) : '-'}
                        </td>
                        <td className="cell cell--status">
                          {vendable ? (
                            <span className="pill pill--success">Vendable</span>
                          ) : (
                            <span className="pill pill--info">Composant</span>
                          )}
                        </td>
                        <td className="cell vendor-black-text">
                          <div className="cell-ellipsis" title={p.description}>
                            {p.description || '-'}
                          </div>
                        </td>
                        <td className="cell text-center">
                          <button
                            className="btn-secondary touch-feedback"
                            onClick={() => { setPendingAction(p); setPinOpen(true); }}
                            style={{ padding: '8px 12px' }}
                            title="Action protégée par code PIN"
                          >
                            Gérer
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Modal PIN (ex: activer/désactiver, MAJ prix…) */}
      <PinModal 
        isOpen={pinOpen} 
        onClose={() => { setPinOpen(false); setPendingAction(null); }}
        onSuccess={() => { 
          setPinOpen(false); 
          setPendingAction(null);
          // Ici tu peux ajouter les actions après validation PIN
          console.log('Action autorisée pour:', pendingAction?.name);
        }}
        title={`Gestion - ${pendingAction?.name || 'Produit'}`}
      />
    </div>
  );
}
