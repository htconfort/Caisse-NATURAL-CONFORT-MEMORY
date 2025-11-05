interface MiscTabProps {
  miscDescription: string;
  setMiscDescription: (description: string) => void;
  miscAmount: string;
  setMiscAmount: (amount: string) => void;
  addMiscToCart: () => void;
}

export function MiscTab({
  miscDescription,
  setMiscDescription,
  miscAmount,
  setMiscAmount,
  addMiscToCart
}: MiscTabProps) {
  return (
    <div className="max-w-2xl mx-auto animate-fadeIn">
      <h2 className="text-3xl font-bold mb-8" style={{ color: 'var(--dark-green)' }}>
        Ajouter une ligne diverse
      </h2>
      <div className="card">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--dark-green)' }}>
              Description
            </label>
            <input
              type="text"
              value={miscDescription}
              onChange={(e) => setMiscDescription(e.target.value)}
              placeholder="Ex: Livraison express, Montage..."
              className="input"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--dark-green)' }}>
              Montant (€)
            </label>
            <input
              type="number"
              value={miscAmount}
              onChange={(e) => setMiscAmount(e.target.value)}
              placeholder="0.00"
              step="0.01"
              className="input"
            />
          </div>
          <button
            onClick={addMiscToCart}
            disabled={!miscDescription || !miscAmount}
            className="w-full btn-primary"
            style={{
              opacity: !miscDescription || !miscAmount ? 0.5 : 1
            }}
          >
            Ajouter au panier
          </button>
        </div>
      </div>
    </div>
  );
}
