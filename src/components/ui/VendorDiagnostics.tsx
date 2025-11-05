import React, { useState, useEffect } from 'react';
import { Vendor } from '../../types';
import { vendors } from '../../data';
import { APP_VERSION } from '../../version';
import { AlertTriangle, Database, Smartphone, Monitor, RefreshCw } from 'lucide-react';

interface VendorDiagnosticsProps {
  currentVendors: Vendor[];
  onForceReset: () => void;
}

interface DebugData {
  appVersion: string;
  timestamp: string;
  userAgent: string;
  localStorage: {
    exists: boolean;
    data: Vendor[] | null;
  };
  currentVendors: Vendor[];
  defaultVendors: Vendor[];
  isIOS: boolean;
  isSafari: boolean;
  url: string;
  cacheStatus: {
    hasServiceWorker: boolean;
    connectionType: string;
  };
}

export const VendorDiagnostics: React.FC<VendorDiagnosticsProps> = ({ 
  currentVendors, 
  onForceReset 
}) => {
  const [debugData, setDebugData] = useState<DebugData>({} as DebugData);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    // Collecte des données de debug
    const collectDebugData = () => {
      const localStorageVendors = localStorage.getItem('myconfort-vendors');
      
      setDebugData({
        appVersion: APP_VERSION,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        localStorage: {
          exists: !!localStorageVendors,
          data: localStorageVendors ? JSON.parse(localStorageVendors) : null
        },
        currentVendors: currentVendors,
        defaultVendors: vendors,
        isIOS: /iPad|iPhone|iPod/.test(navigator.userAgent),
        isSafari: /Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent),
        url: window.location.href,
        cacheStatus: {
          hasServiceWorker: 'serviceWorker' in navigator,
          connectionType: (navigator as typeof navigator & { connection?: { effectiveType?: string } }).connection?.effectiveType || 'unknown'
        }
      });
    };

    collectDebugData();
  }, [currentVendors]);

  const hasVendorMismatch = () => {
    return currentVendors.length !== vendors.length || 
           !vendors.every(defaultVendor => 
             currentVendors.some(current => current.id === defaultVendor.id && current.name === defaultVendor.name)
           );
  };

  const forceCacheRefresh = () => {
    // Vider le localStorage
    localStorage.removeItem('myconfort-vendors');
    localStorage.removeItem('myconfort-current-vendor');
    
    // Forcer le rechargement
    onForceReset();
    
    // Sur iOS, suggérer un reload complet
    if (/iPad|iPhone|iPod/.test(navigator.userAgent)) {
      if (confirm('Rechargement complet recommandé sur iPad. Recharger maintenant ?')) {
        window.location.reload();
      }
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className={`fixed bottom-4 right-4 p-2 rounded-full shadow-lg z-50 ${
          hasVendorMismatch() ? 'bg-red-500 animate-pulse' : 'bg-blue-500'
        } text-white`}
        title="Diagnostics Vendeuses"
      >
        {hasVendorMismatch() ? <AlertTriangle size={20} /> : <Database size={20} />}
      </button>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[80vh] overflow-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <Database className="text-blue-500" />
              Diagnostics Vendeuses v{APP_VERSION}
            </h2>
            <button
              onClick={() => setIsOpen(false)}
              className="text-gray-500 hover:text-gray-700"
            >
              ✕
            </button>
          </div>

          {hasVendorMismatch() && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
              <div className="flex items-center gap-2 text-red-700 font-bold mb-2">
                <AlertTriangle size={20} />
                Problème détecté : Vendeuses non synchronisées
              </div>
              <p className="text-red-600 mb-3">
                Les vendeuses affichées ne correspondent pas à la liste par défaut. 
                Cela peut expliquer les différences entre iPad et ordinateur.
              </p>
              <button
                onClick={forceCacheRefresh}
                className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 flex items-center gap-2"
              >
                <RefreshCw size={16} />
                Forcer la réinitialisation
              </button>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Environnement */}
            <div className="space-y-4">
              <h3 className="font-bold text-lg flex items-center gap-2">
                {debugData.isIOS ? <Smartphone className="text-blue-500" /> : <Monitor className="text-green-500" />}
                Environnement
              </h3>
              <div className="bg-gray-50 p-3 rounded text-sm space-y-1">
                <div><strong>Plateforme:</strong> {debugData.isIOS ? 'iOS (iPad/iPhone)' : 'Ordinateur'}</div>
                <div><strong>Navigateur:</strong> {debugData.isSafari ? 'Safari' : 'Autre'}</div>
                <div><strong>URL:</strong> {debugData.url}</div>
                <div><strong>Connexion:</strong> {debugData.cacheStatus?.connectionType}</div>
                <div><strong>Timestamp:</strong> {debugData.timestamp}</div>
              </div>
            </div>

            {/* Vendeuses actuelles vs par défaut */}
            <div className="space-y-4">
              <h3 className="font-bold text-lg">Comparaison Vendeuses</h3>
              <div className="space-y-2">
                <div>
                  <strong>Par défaut ({vendors.length}):</strong>
                  <div className="text-sm bg-green-50 p-2 rounded">
                    {vendors.map(v => v.name).join(', ')}
                  </div>
                </div>
                <div>
                  <strong>Actuelles ({currentVendors.length}):</strong>
                  <div className={`text-sm p-2 rounded ${hasVendorMismatch() ? 'bg-red-50' : 'bg-green-50'}`}>
                    {currentVendors.map(v => v.name).join(', ')}
                  </div>
                </div>
              </div>
            </div>

            {/* Données de stockage */}
            <div className="space-y-4 md:col-span-2">
              <h3 className="font-bold text-lg">Données de stockage</h3>
              <div className="bg-gray-50 p-3 rounded">
                <details>
                  <summary className="cursor-pointer font-medium">LocalStorage (cliquer pour voir)</summary>
                  <pre className="text-xs mt-2 overflow-x-auto">
                    {JSON.stringify(debugData.localStorage, null, 2)}
                  </pre>
                </details>
              </div>
            </div>
          </div>

          <div className="mt-6 flex gap-3">
            <button
              onClick={forceCacheRefresh}
              className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 flex items-center gap-2"
            >
              <RefreshCw size={16} />
              Réinitialiser les données
            </button>
            <button
              onClick={() => setIsOpen(false)}
              className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
            >
              Fermer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
