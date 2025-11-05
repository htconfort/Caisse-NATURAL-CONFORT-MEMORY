// src/services/pendingPaymentsService.ts
// Gestion des "règlements à venir" (chèques différés, etc.)
// Implémentation par défaut via localStorage (remplaçable par Dexie/IndexedDB si dispo).

export interface PendingPayment {
  vendorId: string;
  vendorName: string;
  clientName: string;
  nbCheques: number;
  montantCheque: number;
  dateProchain: string; // ISO
}

const LS_KEY = 'reglementsAVenir';

async function readFromLS(): Promise<PendingPayment[]> {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? (JSON.parse(raw) as PendingPayment[]) : [];
  } catch {
    return [];
  }
}

async function writeToLS(data: PendingPayment[]) {
  localStorage.setItem(LS_KEY, JSON.stringify(data));
}

export const pendingPaymentsService = {
  async list(): Promise<PendingPayment[]> {
    // TODO Dexie: return await db.reglementsAVenir.toArray();
    return readFromLS();
  },
  async clearAll(): Promise<void> {
    // TODO Dexie: await db.reglementsAVenir.clear();
    await writeToLS([]);
  },
  async upsertMany(items: PendingPayment[]) {
    // TODO Dexie: await db.reglementsAVenir.bulkPut(items);
    await writeToLS(items);
  },
};
