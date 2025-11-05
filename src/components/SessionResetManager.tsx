import React, { useState, useEffect } from 'react';
import { Trash2, AlertTriangle, Package, Users, Clock, CheckCircle, RotateCcw, Eye } from 'lucide-react';
import SessionResetService, { type SessionResetResult } from '@/services/sessionResetService';

interface SessionResetManagerProps {
  onResetComplete?: () => void;
}

const SessionResetManager: React.FC<SessionResetManagerProps> = ({ onResetComplete }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [lastResult, setLastResult] = useState<SessionResetResult | null>(null);
  const [preview, setPreview] = useState<{
    toDelete: Record<string, number>;
    toKeep: Record<string, number>;
  } | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  // Charger la prévisualisation au montage
  useEffect(() => {
    loadPreview();
  }, []);

  const loadPreview = async () => {
    try {
      const previewData = await SessionResetService.previewSessionReset();
      setPreview(previewData);
    } catch (error) {
      console.error('Erreur lors du chargement de la prévisualisation:', error);
    }
  };

  const handleSessionReset = async () => {
    const confirmed = window.confirm(
      '⚠️ ATTENTION : Cette action va supprimer TOUTES les données de session (ventes, panier, chèques à venir) mais GARDER le stock physique.\n\n' +
      'Cette action est IRRÉVERSIBLE !\n\n' +
      'Voulez-vous continuer ?'
    );

    if (!confirmed) return;

    setIsLoading(true);
    try {
      const result = await SessionResetService.executeSessionReset();
      setLastResult(result);
      
      if (result.success) {
        // Rafraîchir la prévisualisation
        await loadPreview();
        // Notifier le parent
        if (onResetComplete) {
          onResetComplete();
        }
      }
    } catch (error) {
      console.error('Erreur lors de la RAZ:', error);
      setLastResult({
        success: false,
        message: 'Erreur inattendue lors de la réinitialisation',
        details: [],
        errors: [error instanceof Error ? error.message : 'Erreur inconnue']
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearChecksOnly = async () => {
    const confirmed = window.confirm(
      'Supprimer uniquement les chèques à venir et factures N8N ?\n\n' +
      'Cette action gardera toutes les ventes de caisse et le stock.'
    );

    if (!confirmed) return;

    setIsLoading(true);
    try {
      const result = await SessionResetService.clearPendingChecksOnly();
      setLastResult(result);
      
      if (result.success && onResetComplete) {
        onResetComplete();
      }
    } catch (error) {
      console.error('Erreur lors de la suppression des chèques:', error);
      setLastResult({
        success: false,
        message: 'Erreur lors de la suppression des chèques à venir',
        details: [],
        errors: [error instanceof Error ? error.message : 'Erreur inconnue']
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6 rounded-lg">
        <div className="flex items-center gap-3">
          <RotateCcw size={28} />
          <div>
            <h2 className="text-xl font-bold">Réinitialisation de fin de session</h2>
            <p className="text-blue-100">Nettoyage complet en gardant le stock physique</p>
          </div>
        </div>
      </div>

      {/* Prévisualisation */}
      {preview && (
        <div className="bg-white border rounded-lg p-6">
          <button
            onClick={() => setShowPreview(!showPreview)}
            className="flex items-center gap-2 text-lg font-semibold text-gray-800 mb-4 hover:text-blue-600"
          >
            <Eye size={20} />
            {showPreview ? 'Masquer' : 'Voir'} la prévisualisation
          </button>
          
          {showPreview && (
            <div className="grid md:grid-cols-2 gap-6">
              {/* Ce qui sera supprimé */}
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <h3 className="flex items-center gap-2 font-semibold text-red-800 mb-3">
                  <Trash2 size={18} />
                  Sera supprimé
                </h3>
                <div className="space-y-2">
                  {Object.entries(preview.toDelete).map(([key, count]) => (
                    <div key={key} className="flex justify-between text-sm">
                      <span className="text-red-700">{key}</span>
                      <span className="font-mono bg-red-100 px-2 py-1 rounded text-red-800">
                        {count}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Ce qui sera conservé */}
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h3 className="flex items-center gap-2 font-semibold text-green-800 mb-3">
                  <Package size={18} />
                  Sera conservé
                </h3>
                <div className="space-y-2">
                  {Object.entries(preview.toKeep).map(([key, count]) => (
                    <div key={key} className="flex justify-between text-sm">
                      <span className="text-green-700">{key}</span>
                      <span className="font-mono bg-green-100 px-2 py-1 rounded text-green-800">
                        {count}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* RAZ partielle - Chèques uniquement */}
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-6">
          <div className="flex items-start gap-3 mb-4">
            <Clock className="text-orange-600 mt-1" size={20} />
            <div>
              <h3 className="font-semibold text-orange-800">Chèques à venir seulement</h3>
              <p className="text-sm text-orange-700 mt-1">
                Supprime uniquement les chèques à venir et factures N8N. 
                Garde toutes les ventes de caisse et le stock.
              </p>
            </div>
          </div>
          
          <button
            onClick={handleClearChecksOnly}
            disabled={isLoading}
            className="w-full bg-orange-600 text-white py-2 px-4 rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? 'Suppression...' : 'Supprimer les chèques'}
          </button>
        </div>

        {/* RAZ complète de session */}
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <div className="flex items-start gap-3 mb-4">
            <AlertTriangle className="text-red-600 mt-1" size={20} />
            <div>
              <h3 className="font-semibold text-red-800">RAZ complète de session</h3>
              <p className="text-sm text-red-700 mt-1">
                Supprime TOUT sauf le stock physique. Prépare l'application 
                pour une nouvelle session de vente.
              </p>
            </div>
          </div>
          
          <button
            onClick={handleSessionReset}
            disabled={isLoading}
            className="w-full bg-red-600 text-white py-2 px-4 rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-semibold"
          >
            {isLoading ? 'Réinitialisation...' : 'RAZ COMPLÈTE DE SESSION'}
          </button>
        </div>
      </div>

      {/* Résultat de la dernière action */}
      {lastResult && (
        <div className={`border rounded-lg p-6 ${
          lastResult.success 
            ? 'bg-green-50 border-green-200' 
            : 'bg-red-50 border-red-200'
        }`}>
          <div className={`flex items-center gap-2 mb-4 ${
            lastResult.success ? 'text-green-800' : 'text-red-800'
          }`}>
            {lastResult.success ? (
              <CheckCircle size={20} />
            ) : (
              <AlertTriangle size={20} />
            )}
            <h3 className="font-semibold">{lastResult.message}</h3>
          </div>

          {/* Détails du succès */}
          {lastResult.details.length > 0 && (
            <div className="mb-4">
              <h4 className={`font-medium mb-2 ${
                lastResult.success ? 'text-green-700' : 'text-gray-700'
              }`}>
                Détails :
              </h4>
              <ul className="space-y-1">
                {lastResult.details.map((detail, index) => (
                  <li key={index} className={`text-sm ${
                    lastResult.success ? 'text-green-600' : 'text-gray-600'
                  }`}>
                    {detail}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Erreurs */}
          {lastResult.errors && lastResult.errors.length > 0 && (
            <div>
              <h4 className="font-medium text-red-700 mb-2">Erreurs :</h4>
              <ul className="space-y-1">
                {lastResult.errors.map((error, index) => (
                  <li key={index} className="text-sm text-red-600">
                    {error}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Info importante */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <Package className="text-blue-600 mt-1" size={20} />
          <div className="text-sm">
            <p className="font-medium text-blue-800 mb-1">
              🔒 Protection du stock physique
            </p>
            <p className="text-blue-700">
              Toutes les quantités en stock sont automatiquement préservées. 
              Seules les données de session (ventes, panier, statistiques temporaires) sont supprimées.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SessionResetManager;
