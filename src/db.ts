// src/db.ts
// Configuration IndexedDB avec Dexie pour MyConfort
import Dexie, { Table } from 'dexie';

// Interface pour les données de configuration
export interface SettingRecord {
  key: string;
  value: unknown;
  lastUpdate: number;
  version: string;
}

// Interface pour les ventes
export interface SaleRecord {
  id?: string;
  date: string;
  amount: number;
  vendorId: string;
  timestamp: number;
}

// Interface pour les vendeurs
export interface VendorRecord {
  id: string;
  name: string;
  dailySales: number;
  totalSales: number;
  lastUpdate: number;
}

// Classe de base de données
export class MyConfortDatabase extends Dexie {
  // Tables déclarées
  settings!: Table<SettingRecord>;
  sales!: Table<SaleRecord>;
  vendors!: Table<VendorRecord>;

  constructor() {
    super('MyConfortDB');
    
    // Définition du schéma
    this.version(1).stores({
      settings: 'key, lastUpdate',
      sales: '++id, date, vendorId, timestamp',
      vendors: 'id, name, lastUpdate'
    });
  }
}

// Instance de la base de données
export const db = new MyConfortDatabase();
