import React, { useState } from 'react';
import { Settings, Download, Upload, FolderOpen, CheckCircle, AlertCircle, Info } from 'lucide-react';

// Types
interface ExportResult {
  success: boolean;
  message: string;
  path?: string;
}

interface InstallResult {
  success: boolean;
  message: string;
}

interface VSCodeSyncProps {
  className?: string;
}

// Electron API types
interface ElectronAPI {
  openInFinder: (path: string) => void;
  selectFolder: () => Promise<{ canceled: boolean; filePaths: string[] }>;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}

const VSCodeSyncComponent: React.FC<VSCodeSyncProps> = ({ className = '' }) => {
  const [isExporting, setIsExporting] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);
  const [exportResult, setExportResult] = useState<ExportResult | null>(null);
  const [installResult, setInstallResult] = useState<InstallResult | null>(null);
  const [selectedSyncFolder, setSelectedSyncFolder] = useState<string>('');

  /**
   * Exporte tous les paramètres VS Code
   */
  const handleExportSettings = async () => {
    setIsExporting(true);
    setExportResult(null);
    
    try {
      // Simulation de l'export (remplacer par la vraie logique)
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const syncFolder = `${process.env.HOME || '~'}/Documents/VSCode-Sync`;
      setExportResult({
        success: true,
        message: `Export réussi ! Configuration sauvegardée`,
        path: syncFolder
      });
    } catch (error) {
      setExportResult({
        success: false,
        message: `Erreur lors de l'export : ${error instanceof Error ? error.message : 'Erreur inconnue'}`
      });
    } finally {
      setIsExporting(false);
    }
  };

  /**
   * Installe les paramètres depuis un dossier de sync
   */
  const handleInstallSettings = async () => {
    if (!selectedSyncFolder) {
      setInstallResult({
        success: false,
        message: 'Veuillez sélectionner un dossier de synchronisation'
      });
      return;
    }

    setIsInstalling(true);
    setInstallResult(null);
    
    try {
      // Simulation de l'installation (remplacer par la vraie logique)
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      setInstallResult({
        success: true,
        message: 'Installation réussie ! Redémarrez VS Code pour appliquer les changements.'
      });
    } catch (error) {
      setInstallResult({
        success: false,
        message: `Erreur lors de l'installation : ${error instanceof Error ? error.message : 'Erreur inconnue'}`
      });
    } finally {
      setIsInstalling(false);
    }
  };

  /**
   * Ouvre le dossier de synchronisation
   */
  const openSyncFolder = (folderPath: string) => {
    // Dans un environnement Electron, utiliser l'API native
    if (typeof window !== 'undefined' && window.electronAPI) {
      window.electronAPI.openInFinder(folderPath);
    } else {
      // Fallback pour le navigateur
      navigator.clipboard.writeText(folderPath);
      alert(`Chemin copié dans le presse-papiers : ${folderPath}`);
    }
  };

  /**
   * Sélectionne un dossier de synchronisation
   */
  const selectSyncFolder = async () => {
    if (typeof window !== 'undefined' && window.electronAPI) {
      const result = await window.electronAPI.selectFolder();
      if (result && !result.canceled) {
        setSelectedSyncFolder(result.filePaths[0]);
      }
    } else {
      // Fallback pour le navigateur
      const folder = prompt('Entrez le chemin du dossier de synchronisation VS Code :');
      if (folder) {
        setSelectedSyncFolder(folder);
      }
    }
  };

  return (
    <div className={`bg-white rounded-lg shadow-lg p-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="flex items-center justify-center w-12 h-12 bg-blue-100 rounded-lg">
          <Settings className="w-6 h-6 text-blue-600" />
        </div>
        <div>
          <h3 className="text-xl font-bold text-gray-800">Synchronisation VS Code</h3>
          <p className="text-sm text-gray-600">Exportez et importez vos paramètres VS Code</p>
        </div>
      </div>

      {/* Section Export */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-4">
          <Download className="w-5 h-5 text-green-600" />
          <h4 className="text-lg font-semibold text-gray-800">Exporter la configuration</h4>
        </div>
        
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
          <p className="text-sm text-green-800 mb-3">
            📦 Sauvegarde complète de votre configuration VS Code :
          </p>
          <ul className="text-sm text-green-700 space-y-1 ml-4">
            <li>• Paramètres utilisateur (settings.json)</li>
            <li>• Raccourcis clavier personnalisés</li>
            <li>• Tous les snippets de code</li>
            <li>• Liste complète des extensions</li>
            <li>• Script d'installation automatique</li>
          </ul>
        </div>
        
        <button
          onClick={handleExportSettings}
          disabled={isExporting}
          className={`
            flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all duration-200
            ${isExporting 
              ? 'bg-gray-400 cursor-not-allowed' 
              : 'bg-green-600 hover:bg-green-700 active:scale-95'
            } text-white
          `}
        >
          {isExporting ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
              Export en cours...
            </>
          ) : (
            <>
              <Download className="w-4 h-4" />
              Exporter la configuration
            </>
          )}
        </button>

        {exportResult && (
          <div className={`
            mt-4 p-4 rounded-lg flex items-start gap-3
            ${exportResult.success 
              ? 'bg-green-100 border border-green-300' 
              : 'bg-red-100 border border-red-300'
            }
          `}>
            {exportResult.success ? (
              <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
            )}
            <div className="flex-1">
              <p className={`text-sm font-medium ${
                exportResult.success ? 'text-green-800' : 'text-red-800'
              }`}>
                {exportResult.message}
              </p>
              {exportResult.success && exportResult.path && (
                <button
                  onClick={() => openSyncFolder(exportResult.path!)}
                  className="mt-2 flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 transition-colors"
                >
                  <FolderOpen className="w-4 h-4" />
                  Ouvrir le dossier
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Section Import */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Upload className="w-5 h-5 text-blue-600" />
          <h4 className="text-lg font-semibold text-gray-800">Installer une configuration</h4>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
          <p className="text-sm text-blue-800">
            📥 Restaure tous vos paramètres depuis un export VS Code précédent
          </p>
        </div>

        <div className="space-y-4">
          <div>
            <button
              onClick={selectSyncFolder}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <FolderOpen className="w-4 h-4" />
              Sélectionner le dossier de sync
            </button>
            
            {selectedSyncFolder && (
              <p className="mt-2 text-sm text-gray-600 bg-gray-100 px-3 py-2 rounded border">
                📁 {selectedSyncFolder}
              </p>
            )}
          </div>

          <button
            onClick={handleInstallSettings}
            disabled={isInstalling || !selectedSyncFolder}
            className={`
              flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all duration-200
              ${(isInstalling || !selectedSyncFolder)
                ? 'bg-gray-400 cursor-not-allowed' 
                : 'bg-blue-600 hover:bg-blue-700 active:scale-95'
              } text-white
            `}
          >
            {isInstalling ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                Installation en cours...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4" />
                Installer la configuration
              </>
            )}
          </button>
        </div>

        {installResult && (
          <div className={`
            mt-4 p-4 rounded-lg flex items-start gap-3
            ${installResult.success 
              ? 'bg-green-100 border border-green-300' 
              : 'bg-red-100 border border-red-300'
            }
          `}>
            {installResult.success ? (
              <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
            )}
            <p className={`text-sm font-medium ${
              installResult.success ? 'text-green-800' : 'text-red-800'
            }`}>
              {installResult.message}
            </p>
          </div>
        )}
      </div>

      {/* Instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-2">
          <Info className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
          <div>
            <h5 className="font-medium text-blue-800 mb-2">Instructions d'utilisation</h5>
            <ul className="text-sm text-blue-700 space-y-1">
              <li><strong>Mac actuel :</strong> Exportez votre configuration complète</li>
              <li><strong>Nouveau Mac :</strong> Transférez le dossier et installez</li>
              <li><strong>Alternative :</strong> Activez Settings Sync dans VS Code</li>
              <li><strong>Script :</strong> Utilisez install-vscode-config.sh en Terminal</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VSCodeSyncComponent;
