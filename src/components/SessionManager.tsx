import React, { useState, useEffect } from 'react';
import { Calendar, Plus, Settings, Save, X } from 'lucide-react';
import type { SessionDB } from '../types';

interface SessionManagerProps {
  session?: SessionDB;
  onSessionCreate: (sessionData: {
    eventName: string;
    eventStart: string;
    eventEnd: string;
    note?: string;
  }) => Promise<void>;
  onSessionUpdate: (sessionData: Partial<SessionDB>) => Promise<void>;
  loading?: boolean;
}

export const SessionManager: React.FC<SessionManagerProps> = ({
  session,
  onSessionCreate,
  onSessionUpdate,
  loading = false
}) => {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [formData, setFormData] = useState({
    eventName: '',
    eventStart: '',
    eventEnd: '',
    note: ''
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Réinitialiser le formulaire quand on ferme
  useEffect(() => {
    if (!showCreateForm && !showEditForm) {
      setFormData({
        eventName: '',
        eventStart: '',
        eventEnd: '',
        note: ''
      });
    }
  }, [showCreateForm, showEditForm]);

  // Charger les données de la session dans le formulaire d'édition
  const loadSessionDataForEdit = () => {
    if (session) {
      setFormData({
        eventName: session.eventName || '',
        eventStart: session.eventStart ? new Date(session.eventStart).toISOString().split('T')[0] : '',
        eventEnd: session.eventEnd ? new Date(session.eventEnd).toISOString().split('T')[0] : '',
        note: session.note || ''
      });
      setShowEditForm(true);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.eventName.trim() || !formData.eventStart || !formData.eventEnd) {
      alert('Veuillez remplir tous les champs obligatoires (nom de la foire, dates)');
      return;
    }

    if (new Date(formData.eventStart) >= new Date(formData.eventEnd)) {
      alert('La date de fin doit être postérieure à la date de début');
      return;
    }

    setIsSubmitting(true);
    try {
      if (showEditForm && session) {
        // Mode édition
        const updateData: Partial<SessionDB> = {
          eventName: formData.eventName,
          eventStart: new Date(formData.eventStart).getTime(),
          eventEnd: new Date(formData.eventEnd).getTime(),
          ...(formData.note && { note: formData.note })
        };
        await onSessionUpdate(updateData);
        setShowEditForm(false);
      } else {
        // Mode création
        await onSessionCreate(formData);
        setShowCreateForm(false);
      }
    } catch (error) {
      console.error('Erreur lors de l\'opération:', error);
      alert(`Erreur lors de ${showEditForm ? 'la mise à jour' : 'la création'} de la session`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDate = (timestamp?: number) => {
    if (!timestamp) return 'Non définie';
    return new Date(timestamp).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };


  return (
    <div className="mb-6">
      {/* En-tête principal - Style MyConfort */}
      <div style={{
        background: session 
          ? 'linear-gradient(135deg, #065F46 0%, #047857 50%, #059669 100%)' 
          : 'linear-gradient(135deg, #7C2D12 0%, #DC2626 50%, #EF4444 100%)',
        color: 'white',
        padding: '20px',
        borderRadius: '12px',
        marginBottom: '20px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        border: session ? '2px solid #047857' : '2px solid #DC2626'
      }}>
        <div className="flex items-center justify-between">
          <div>
            <h1 style={{ 
              margin: 0, 
              fontSize: '24px', 
              fontWeight: 'bold',
              display: 'flex', 
              alignItems: 'center', 
              gap: '12px' 
            }}>
              <Calendar size={28} />
              {session?.eventName || 'Aucune Session Active'}
            </h1>
            <p style={{ 
              margin: '8px 0 0 40px', 
              opacity: 0.9, 
              fontSize: '14px',
              fontWeight: '500'
            }}>
              {session 
                ? `Session ${session.status === 'open' ? 'ouverte' : 'fermée'} • ${formatDate(session.eventStart)} - ${formatDate(session.eventEnd)}`
                : 'Créez une session pour démarrer l\'enregistrement des ventes'
              }
            </p>
          </div>
          
          <div className="flex gap-3">
            {!session && !showCreateForm && (
              <button
                onClick={() => setShowCreateForm(true)}
                style={{
                  background: 'rgba(255,255,255,0.2)',
                  border: '1px solid rgba(255,255,255,0.3)',
                  color: 'white',
                  padding: '10px 16px',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
                disabled={loading}
                onMouseEnter={(e) => {
                  if (!loading) {
                    e.currentTarget.style.background = 'rgba(255,255,255,0.3)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!loading) {
                    e.currentTarget.style.background = 'rgba(255,255,255,0.2)';
                  }
                }}
              >
                <Plus size={16} />
                Créer une session
              </button>
            )}
            
            {session && !showEditForm && (
              <button
                onClick={loadSessionDataForEdit}
                style={{
                  background: 'rgba(255,255,255,0.2)',
                  border: '1px solid rgba(255,255,255,0.3)',
                  color: 'white',
                  padding: '10px 16px',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
                disabled={loading}
                onMouseEnter={(e) => {
                  if (!loading) {
                    e.currentTarget.style.background = 'rgba(255,255,255,0.3)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!loading) {
                    e.currentTarget.style.background = 'rgba(255,255,255,0.2)';
                  }
                }}
              >
                <Settings size={16} />
                Modifier
              </button>
            )}
          </div>
        </div>
      </div>


      {/* Formulaire de création/édition */}
      {(showCreateForm || showEditForm) && (
        <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-lg font-semibold text-gray-800">
              {showEditForm ? 'Modifier la Session' : 'Nouvelle Session de Foire'}
            </h4>
            <button
              onClick={() => {
                setShowCreateForm(false);
                setShowEditForm(false);
              }}
              className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
              disabled={isSubmitting}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Nom de la foire */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nom de la foire *
              </label>
              <input
                type="text"
                value={formData.eventName}
                onChange={(e) => setFormData(prev => ({ ...prev, eventName: e.target.value }))}
                placeholder="Ex: Foire de Perpignan, Salon du Sommeil 2024, Foire de Printemps..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                disabled={isSubmitting}
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Date de début */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date de début * <span className="text-blue-600 text-xs">(Format: JJ/MM/AAAA)</span>
                </label>
                <input
                  type="date"
                  value={formData.eventStart}
                  onChange={(e) => setFormData(prev => ({ ...prev, eventStart: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  disabled={isSubmitting}
                  required
                  lang="fr-FR"
                  placeholder="jj/mm/aaaa"
                />
                <p className="text-xs text-gray-500 mt-1">
                  ⚠️ Format français : <strong>jour/mois/année</strong> (ex: 01/11/2025 = 1er novembre)
                </p>
              </div>

              {/* Date de fin */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date de fin * <span className="text-blue-600 text-xs">(Format: JJ/MM/AAAA)</span>
                </label>
                <input
                  type="date"
                  value={formData.eventEnd}
                  onChange={(e) => setFormData(prev => ({ ...prev, eventEnd: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  disabled={isSubmitting}
                  required
                  lang="fr-FR"
                  placeholder="jj/mm/aaaa"
                />
                <p className="text-xs text-gray-500 mt-1">
                  ⚠️ Format français : <strong>jour/mois/année</strong> (ex: 11/11/2025 = 11 novembre)
                </p>
              </div>
            </div>

            {/* Note optionnelle */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Note (optionnel)
              </label>
              <textarea
                value={formData.note}
                onChange={(e) => setFormData(prev => ({ ...prev, note: e.target.value }))}
                placeholder="Informations complémentaires sur l'événement..."
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                disabled={isSubmitting}
              />
            </div>

            {/* Boutons d'action */}
            <div className="flex justify-end gap-3 pt-4">
              <button
                type="button"
                onClick={() => {
                  setShowCreateForm(false);
                  setShowEditForm(false);
                }}
                className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
                disabled={isSubmitting}
              >
                Annuler
              </button>
              <button
                type="submit"
                className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                    {showEditForm ? 'Modification...' : 'Création...'}
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    {showEditForm ? 'Modifier la session' : 'Créer la session'}
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
};

export default SessionManager;
