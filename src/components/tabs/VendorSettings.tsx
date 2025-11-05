import React, { useState } from 'react';
import { Plus, Edit3, Trash2, Check, X, Palette } from 'lucide-react';
import type { Vendor } from '../../types';
import { getContrastColor } from '../../utils/colorUtils';

interface VendorSettingsProps {
  vendorStats: Vendor[];
  setVendorStats: (vendors: Vendor[]) => void;
}

// Couleurs prédéfinies pour les nouvelles vendeuses
const PREDEFINED_COLORS = [
  '#477A0C', // Vert MyConfort
  '#F55D3E', // Rouge/Orange
  '#14281D', // Vert foncé
  '#080F0F', // Noir
  '#89BBFE', // Bleu clair
  '#D68FD6', // Rose/Violet
  '#FFFF99', // Jaune poussin
  '#FF6B35', // Orange vif
  '#004E89', // Bleu marine
  '#A663CC', // Violet
  '#00A878', // Turquoise
  '#FFB627', // Jaune/Orange
  '#E76E55', // Saumon
  '#6A994E', // Vert olive
  '#7209B7', // Violet foncé
  '#FF9F1C', // Orange doré
];

export const VendorSettings: React.FC<VendorSettingsProps> = ({
  vendorStats,
  setVendorStats
}) => {
  const [newVendorName, setNewVendorName] = useState('');
  const [selectedColor, setSelectedColor] = useState(PREDEFINED_COLORS[0]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  const handleAddVendor = () => {
    if (!newVendorName.trim()) return;

    const newVendor: Vendor = {
      id: `vendor-${Date.now()}`,
      name: newVendorName.trim(),
      dailySales: 0,
      totalSales: 0,
      color: selectedColor
    };

    setVendorStats([...vendorStats, newVendor]);
    setNewVendorName('');
    // Changer automatiquement de couleur pour la prochaine vendeuse
    const currentIndex = PREDEFINED_COLORS.indexOf(selectedColor);
    const nextIndex = (currentIndex + 1) % PREDEFINED_COLORS.length;
    setSelectedColor(PREDEFINED_COLORS[nextIndex]);
  };

  const handleEditVendor = (id: string, newName: string) => {
    if (!newName.trim()) return;

    setVendorStats(vendorStats.map(vendor => 
      vendor.id === id ? { ...vendor, name: newName.trim() } : vendor
    ));
    setEditingId(null);
    setEditingName('');
  };

  const handleDeleteVendor = (id: string) => {
    if (confirm('Êtes-vous sûr de vouloir supprimer cette vendeuse ?')) {
      setVendorStats(vendorStats.filter(vendor => vendor.id !== id));
    }
  };

  const handleColorChange = (vendorId: string, color: string) => {
    setVendorStats(vendorStats.map(vendor => 
      vendor.id === vendorId ? { ...vendor, color } : vendor
    ));
  };

  const startEdit = (vendor: Vendor) => {
    setEditingId(vendor.id);
    setEditingName(vendor.name);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditingName('');
  };

  return (
    <div className="max-w-6xl mx-auto animate-fadeIn">
      <h2 className="text-3xl font-bold mb-6" style={{ color: 'var(--dark-green)' }}>
        Paramètres des vendeuses
      </h2>

      {/* Section d'ajout d'une nouvelle vendeuse */}
      <div className="mb-8 p-6 rounded-lg border-2 border-dashed border-gray-300 bg-gray-50">
        <h3 className="text-xl font-bold mb-4 text-gray-700">
          <Plus size={20} className="inline mr-2" />
          Ajouter une nouvelle vendeuse
        </h3>
        
        <div className="flex flex-wrap gap-4 items-end">
          {/* Champ nom */}
          <div className="flex-1 min-w-64">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nom de la vendeuse
            </label>
            <input
              type="text"
              value={newVendorName}
              onChange={(e) => setNewVendorName(e.target.value)}
              placeholder="Entrez le nom de la vendeuse"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
              onKeyPress={(e) => e.key === 'Enter' && handleAddVendor()}
            />
          </div>

          {/* Sélection de couleur */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Couleur
            </label>
            <div className="flex gap-2 mb-2">
              {PREDEFINED_COLORS.slice(0, 8).map((color) => (
                <button
                  key={color}
                  onClick={() => setSelectedColor(color)}
                  className={`w-8 h-8 rounded-full border-2 ${
                    selectedColor === color ? 'border-gray-800 ring-2 ring-gray-400' : 'border-gray-300'
                  }`}
                  style={{ backgroundColor: color }}
                  title={`Couleur ${color}`}
                />
              ))}
            </div>
            <div className="flex gap-2">
              {PREDEFINED_COLORS.slice(8).map((color) => (
                <button
                  key={color}
                  onClick={() => setSelectedColor(color)}
                  className={`w-8 h-8 rounded-full border-2 ${
                    selectedColor === color ? 'border-gray-800 ring-2 ring-gray-400' : 'border-gray-300'
                  }`}
                  style={{ backgroundColor: color }}
                  title={`Couleur ${color}`}
                />
              ))}
            </div>
          </div>

          {/* Bouton d'ajout */}
          <button
            onClick={handleAddVendor}
            disabled={!newVendorName.trim()}
            className="px-6 py-2 rounded-md font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              backgroundColor: selectedColor,
              color: getContrastColor(selectedColor)
            }}
          >
            <Plus size={16} className="inline mr-1" />
            Ajouter
          </button>
        </div>

        {/* Aperçu */}
        {newVendorName.trim() && (
          <div className="mt-4 p-4 rounded-lg" style={{ backgroundColor: selectedColor }}>
            <p className="text-sm font-medium" style={{ color: getContrastColor(selectedColor) }}>
              Aperçu : {newVendorName}
            </p>
          </div>
        )}
      </div>

      {/* Liste des vendeuses existantes */}
      <div className="space-y-4">
        <h3 className="text-xl font-bold text-gray-700 mb-4">
          Vendeuses existantes ({vendorStats.length})
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {vendorStats.map((vendor) => (
            <div
              key={vendor.id}
              className="p-4 rounded-lg border"
              style={{
                backgroundColor: vendor.color,
                color: getContrastColor(vendor.color),
                borderColor: vendor.color
              }}
            >
              {/* Header avec nom et actions */}
              <div className="flex justify-between items-start mb-3">
                {editingId === vendor.id ? (
                  <div className="flex-1 mr-2">
                    <input
                      type="text"
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      className="w-full px-2 py-1 rounded text-black"
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') handleEditVendor(vendor.id, editingName);
                        if (e.key === 'Escape') cancelEdit();
                      }}
                      autoFocus
                    />
                  </div>
                ) : (
                  <h4 className="text-lg font-bold flex-1">{vendor.name}</h4>
                )}

                <div className="flex gap-1">
                  {editingId === vendor.id ? (
                    <>
                      <button
                        onClick={() => handleEditVendor(vendor.id, editingName)}
                        className="p-1 rounded hover:bg-black hover:bg-opacity-20"
                        title="Confirmer"
                      >
                        <Check size={16} />
                      </button>
                      <button
                        onClick={cancelEdit}
                        className="p-1 rounded hover:bg-black hover:bg-opacity-20"
                        title="Annuler"
                      >
                        <X size={16} />
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => startEdit(vendor)}
                        className="p-1 rounded hover:bg-black hover:bg-opacity-20"
                        title="Modifier le nom"
                      >
                        <Edit3 size={16} />
                      </button>
                      <button
                        onClick={() => handleDeleteVendor(vendor.id)}
                        className="p-1 rounded hover:bg-black hover:bg-opacity-20"
                        title="Supprimer"
                      >
                        <Trash2 size={16} />
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Statistiques */}
              <div className="space-y-1 text-sm opacity-90 mb-3">
                <p>Ventes totales: <span className="font-bold">{vendor.totalSales}</span></p>
                <p>Ventes aujourd'hui: <span className="font-bold">{vendor.dailySales}</span></p>
              </div>

              {/* Sélecteur de couleur */}
              <div>
                <p className="text-xs opacity-75 mb-2">
                  <Palette size={12} className="inline mr-1" />
                  Changer la couleur:
                </p>
                <div className="flex gap-1 flex-wrap">
                  {PREDEFINED_COLORS.map((color) => (
                    <button
                      key={color}
                      onClick={() => handleColorChange(vendor.id, color)}
                      className={`w-6 h-6 rounded-full border ${
                        vendor.color === color ? 'ring-2 ring-white border-white' : 'border-gray-400'
                      }`}
                      style={{ backgroundColor: color }}
                      title={`Changer vers ${color}`}
                    />
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>

        {vendorStats.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            <Palette size={48} className="mx-auto mb-4 opacity-50" />
            <p className="text-lg">Aucune vendeuse configurée</p>
            <p className="text-sm">Ajoutez votre première vendeuse ci-dessus</p>
          </div>
        )}
      </div>
    </div>
  );
};
