import React from 'react';

const DEBUG_UI = true;

interface FeuilleDeRAZProTestProps {
  sales: any[];
  invoices: any[];
  vendorStats: any[];
  exportDataBeforeReset: () => void;
  executeRAZ: () => void;
}

const FeuilleDeRAZProTest: React.FC<FeuilleDeRAZProTestProps> = ({
  sales,
  invoices,
  vendorStats,
  exportDataBeforeReset,
  executeRAZ
}) => {
  
  // 🚨 DEBUG LOG
  console.log('🚨🚨🚨 [RAZ-TEST] FeuilleDeRAZProTest MONTÉ !!!', { DEBUG_UI });
  
  // Alert de debug pour s'assurer que le composant est rendu
  React.useEffect(() => {
    console.log('🔥🔥🔥 [RAZ-TEST] useEffect monté - Le composant est RENDU !');
  }, []);

  return (
    <div style={{ fontFamily: 'Arial, sans-serif' }}>
      {/* 🚨 BANNIÈRE DEBUG UI - ULTRA VISIBLE */}
      {DEBUG_UI && (
        <div style={{
          position:'fixed', 
          top:0, 
          left:0, 
          right:0,
          zIndex:2147483647, 
          background:'#e11d48', 
          color:'#fff', 
          padding:'20px', 
          fontSize: '24px',
          fontWeight: 'bold',
          textAlign: 'center',
          borderBottom: '5px solid #fff'
        }}>
          🚨 DEBUG PANEL - FEUILLE DE RAZ TEST MONTÉE 🚨
        </div>
      )}
      
      {/* ===== INTERFACE UTILISATEUR (masquée à l'impression) ===== */}
      <div className="no-print" style={{ padding: '20px', backgroundColor: '#f5f5f5', minHeight: '100vh', paddingTop: '100px' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          
          {/* 🚨 WRAPPER DEBUG PANNEAU GESTION DE SESSION */}
          <div className="no-print" style={{position:'relative', border: DEBUG_UI ? '3px solid #ff0000' : 'none', padding:8, marginBottom:12, zIndex: 1000}}>
            {/* ===== PANNEAU TEST - GESTION DE SESSION ===== */}
            <div style={{
              backgroundColor: 'red',
              padding: '20px',
              borderRadius: '10px',
              boxShadow: '0 2px 10px rgba(0,0,0,0.08)',
              border: '1px solid #E5E7EB',
              marginBottom: '24px'
            }}>
              <h2 style={{ margin: 0, fontSize: '1.4em', fontWeight: 800, color: 'white' }}>
                ⚙️ PANNEAU TEST VISIBLE - COMPOSANT RAZ FONCTIONNE
              </h2>
              
              <div style={{ marginTop: '16px', color: 'white' }}>
                <p>✅ Le composant FeuilleDeRAZPro-test est monté et visible</p>
                <p>✅ L'onglet RAZ fonctionne correctement</p>
                <p>✅ Les props sont reçues: {sales.length} ventes, {invoices.length} factures</p>
                
                <button 
                  onClick={() => alert('Test bouton OK!')}
                  style={{
                    background: 'white',
                    color: 'red',
                    border: 'none',
                    padding: '10px 20px',
                    borderRadius: '5px',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    marginTop: '10px'
                  }}
                >
                  Test Interaction
                </button>
              </div>
            </div>
          </div>
          
        </div>
      </div>
    </div>
  );
};

export default FeuilleDeRAZProTest;
