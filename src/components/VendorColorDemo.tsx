import React from 'react';
import { translations, getVendorColor } from '../utils/translations';

export const VendorColorDemo: React.FC = () => {
  const vendors = ['MYCONFORT', 'Sophie Dubois', 'Marie Lefebvre', 'Lucie Petit', 'Bruno', 'SYLVIE'];
  
  return (
    <div className="p-6 space-y-4">
      <h3 className="text-lg font-bold text-gray-900 mb-4">
        🎨 Palette de couleurs par vendeur
      </h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {vendors.map((vendor) => {
          const colors = getVendorColor(vendor);
          return (
            <div 
              key={vendor}
              className={`p-4 rounded-lg border-2 ${colors.bg} ${colors.border} transition-all hover:shadow-md`}
            >
              <div className="flex items-center gap-3 mb-2">
                <div className={`w-4 h-4 rounded-full ${colors.accent}`}></div>
                <span className="font-semibold text-gray-900">{vendor}</span>
              </div>
              <div className="text-sm text-gray-600">
                <div>Background: {colors.bg}</div>
                <div>Border: {colors.border}</div>
                <div>Accent: {colors.accent}</div>
              </div>
            </div>
          );
        })}
      </div>
      
      <div className="mt-6 p-4 bg-gray-50 rounded-lg">
        <h4 className="font-medium text-gray-900 mb-3">📝 Traductions des statuts</h4>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <h5 className="text-sm font-medium text-gray-700 mb-2">Statuts factures :</h5>
            <div className="space-y-1 text-sm">
              {Object.entries(translations.invoiceStatus).map(([key, value]) => (
                <div key={key} className="flex justify-between">
                  <span className="text-gray-500">{key}:</span>
                  <span className="text-gray-900">{value}</span>
                </div>
              ))}
            </div>
          </div>
          <div>
            <h5 className="text-sm font-medium text-gray-700 mb-2">Statuts articles :</h5>
            <div className="space-y-1 text-sm">
              {Object.entries(translations.itemStatus).map(([key, value]) => (
                <div key={key} className="flex justify-between">
                  <span className="text-gray-500">{key}:</span>
                  <span className="text-gray-900">{value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
