import React from 'react';
import { getVendorColorInfo } from '../utils/vendorColors';
import '../styles/invoices-elegant.css';

// Test des headers colorés pour chaque vendeuse
const TestElegantHeaders: React.FC = () => {
  const vendors = [
    'Billy',
    'Sylvie', 
    'Lucia',
    'Johan',
    'Sabrina',
    'Babette',
  ];

  return (
    <div className="invoices-tab-elegant" style={{padding: '2rem'}}>
      <h1 style={{textAlign: 'center', marginBottom: '2rem', color: '#1f2937'}}>
        🎨 Test Headers Colorés Mode Élégant
      </h1>
      
      <div style={{display: 'grid', gap: '1.5rem', maxWidth: '600px', margin: '0 auto'}}>
        {vendors.map((vendorName) => {
          const vendorColors = getVendorColorInfo(vendorName);
          
          return (
            <div key={vendorName} className="invoice-card-elegant">
              {/* Header coloré PLEIN avec la couleur de la vendeuse */}
              <div 
                className="vendor-header-elegant"
                style={{
                  backgroundColor: vendorColors.backgroundColor,
                  color: vendorColors.textColor,
                  border: 'none'
                }}
              >
                <div className="vendor-info-elegant">
                  <span className="vendor-icon-elegant">👤</span>
                  <span className="vendor-name-elegant">{vendorName}</span>
                </div>
                <span className="invoice-number-elegant">
                  F-{Math.floor(Math.random() * 1000).toString().padStart(3, '0')}
                </span>
              </div>

              <div className="invoice-content-elegant">
                <p style={{margin: 0, color: '#6b7280'}}>
                  <strong>Couleur de fond :</strong> {vendorColors.backgroundColor}<br/>
                  <strong>Couleur de texte :</strong> {vendorColors.textColor}<br/>
                  <strong>Test de lisibilité :</strong> Le texte doit être parfaitement lisible sur le fond coloré.
                </p>
              </div>
            </div>
          );
        })}
      </div>
      
      <div style={{textAlign: 'center', marginTop: '2rem', padding: '1rem', background: '#f8fafc', borderRadius: '12px'}}>
        <p style={{margin: 0, color: '#374151', fontWeight: '600'}}>
          ✅ Chaque header doit avoir une couleur de fond pleine correspondant à la vendeuse<br/>
          ✅ Le texte doit être contrasté (blanc ou noir) pour une lisibilité optimale<br/>
          ✅ Billy doit avoir un header jaune avec texte noir
        </p>
      </div>
    </div>
  );
};

export default TestElegantHeaders;
