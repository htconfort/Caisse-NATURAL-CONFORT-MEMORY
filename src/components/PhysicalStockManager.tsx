import React, { useState, useEffect } from 'react';
// import { syncService } from '@/services'; // Temporairement désactivé
import type { PhysicalStock, StockMovement } from '@/services';

// Stub temporaire pour syncService
const syncService = {
  getCurrentPhysicalStock: () => [],
  updateProductStock: () => true,
  getStockHistory: () => []
};

export const PhysicalStockManager: React.FC = () => {
  const [stock, setStock] = useState<PhysicalStock[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('');
  const [showMovements, setShowMovements] = useState(false);

  const loadData = () => {
    setLoading(true);
    try {
      const currentStock = syncService.getCurrentPhysicalStock();
      const stockMovements = syncService.getStockMovements();
      
      setStock(currentStock);
      setMovements(stockMovements.slice(-50)); // Derniers 50 mouvements
    } catch (error) {
      console.error('Erreur lors du chargement du stock:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredStock = stock.filter(item =>
    item.productName.toLowerCase().includes(filter.toLowerCase()) ||
    item.category.toLowerCase().includes(filter.toLowerCase())
  );

  const getStockStatus = (item: PhysicalStock) => {
    if (item.currentStock <= item.minStockAlert) return 'critical';
    if (item.currentStock <= item.minStockAlert * 2) return 'warning';
    return 'normal';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'critical': return '#dc3545';
      case 'warning': return '#ffc107';
      default: return '#28a745';
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <div>Chargement du stock physique...</div>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      {/* Header */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '20px',
        padding: '15px',
        backgroundColor: '#f8f9fa',
        borderRadius: '8px',
        border: '1px solid #dee2e6'
      }}>
        <h2 style={{ margin: 0, color: '#333' }}>
          📦 Stock Physique ({filteredStock.length} produits)
        </h2>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={() => setShowMovements(!showMovements)}
            style={{
              padding: '8px 16px',
              backgroundColor: showMovements ? '#dc3545' : '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            {showMovements ? '📦 Voir Stock' : '📋 Voir Mouvements'}
          </button>
          <button
            onClick={loadData}
            style={{
              padding: '8px 16px',
              backgroundColor: '#28a745',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            🔄 Actualiser
          </button>
        </div>
      </div>

      {/* Filtre de recherche */}
      <div style={{ marginBottom: '20px' }}>
        <input
          type="text"
          placeholder="Rechercher un produit ou une catégorie..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          style={{
            width: '100%',
            padding: '10px',
            fontSize: '16px',
            border: '1px solid #ddd',
            borderRadius: '4px'
          }}
        />
      </div>

      {/* Contenu principal */}
      {showMovements ? (
        // Affichage des mouvements
        <div>
          <h3>📋 Derniers Mouvements de Stock</h3>
          {movements.length === 0 ? (
            <div style={{ 
              padding: '20px', 
              textAlign: 'center', 
              backgroundColor: '#f8f9fa',
              borderRadius: '8px'
            }}>
              Aucun mouvement de stock enregistré
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {movements.reverse().map((movement) => (
                <div
                  key={movement.id}
                  style={{
                    padding: '15px',
                    border: '1px solid #ddd',
                    borderRadius: '8px',
                    backgroundColor: movement.movementType === 'deduction' ? '#fff5f5' : '#f5fff5'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <strong>{movement.productName}</strong> ({movement.category})
                    </div>
                    <div style={{ fontSize: '14px', color: '#666' }}>
                      {new Date(movement.timestamp).toLocaleString('fr-FR')}
                    </div>
                  </div>
                  <div style={{ marginTop: '5px', fontSize: '14px' }}>
                    <span style={{ 
                      color: movement.movementType === 'deduction' ? '#dc3545' : '#28a745',
                      fontWeight: 'bold'
                    }}>
                      {movement.movementType === 'deduction' ? '-' : '+'}{movement.quantity}
                    </span>
                    {' '}unités ({movement.previousStock} → {movement.newStock})
                  </div>
                  <div style={{ marginTop: '5px', fontSize: '12px', color: '#666' }}>
                    Raison: {movement.reason}
                    {movement.vendorName && ` - Vendeur: ${movement.vendorName}`}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        // Affichage du stock
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '15px' }}>
            {filteredStock.map((item) => {
              const status = getStockStatus(item);
              const statusColor = getStatusColor(status);
              
              return (
                <div
                  key={`${item.category}-${item.productName}`}
                  style={{
                    padding: '15px',
                    border: `2px solid ${statusColor}`,
                    borderRadius: '8px',
                    backgroundColor: 'white',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                  }}
                >
                  <div style={{ marginBottom: '10px' }}>
                    <div style={{ fontWeight: 'bold', fontSize: '16px', color: '#333' }}>
                      {item.productName}
                    </div>
                    <div style={{ fontSize: '14px', color: '#666' }}>
                      {item.category}
                    </div>
                  </div>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '14px' }}>
                    <div>
                      <span style={{ color: '#666' }}>Stock total:</span>
                      <div style={{ fontWeight: 'bold', fontSize: '18px', color: statusColor }}>
                        {item.currentStock}
                      </div>
                    </div>
                    <div>
                      <span style={{ color: '#666' }}>Disponible:</span>
                      <div style={{ fontWeight: 'bold', fontSize: '18px', color: '#28a745' }}>
                        {item.availableStock}
                      </div>
                    </div>
                    <div>
                      <span style={{ color: '#666' }}>Réservé:</span>
                      <div style={{ fontWeight: 'bold', fontSize: '16px', color: '#ffc107' }}>
                        {item.reservedStock}
                      </div>
                    </div>
                    <div>
                      <span style={{ color: '#666' }}>Seuil alerte:</span>
                      <div style={{ fontWeight: 'bold', fontSize: '16px', color: '#dc3545' }}>
                        {item.minStockAlert}
                      </div>
                    </div>
                  </div>
                  
                  {status === 'critical' && (
                    <div style={{
                      marginTop: '10px',
                      padding: '8px',
                      backgroundColor: '#f8d7da',
                      color: '#721c24',
                      borderRadius: '4px',
                      fontSize: '12px',
                      fontWeight: 'bold'
                    }}>
                      🚨 STOCK CRITIQUE - Réapprovisionnement urgent
                    </div>
                  )}
                  
                  {status === 'warning' && (
                    <div style={{
                      marginTop: '10px',
                      padding: '8px',
                      backgroundColor: '#fff3cd',
                      color: '#856404',
                      borderRadius: '4px',
                      fontSize: '12px',
                      fontWeight: 'bold'
                    }}>
                      ⚠️ STOCK FAIBLE - Prévoir réapprovisionnement
                    </div>
                  )}
                  
                  <div style={{ marginTop: '10px', fontSize: '11px', color: '#999' }}>
                    Dernière MAJ: {new Date(item.lastUpdated).toLocaleString('fr-FR')}
                  </div>
                </div>
              );
            })}
          </div>
          
          {filteredStock.length === 0 && (
            <div style={{ 
              padding: '40px', 
              textAlign: 'center', 
              backgroundColor: '#f8f9fa',
              borderRadius: '8px'
            }}>
              {filter ? 'Aucun produit trouvé pour cette recherche' : 'Aucun produit en stock'}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
