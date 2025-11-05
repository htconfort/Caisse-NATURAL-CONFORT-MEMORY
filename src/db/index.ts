// Barrel for DB exports
export * from './schema';
import { MyConfortDB } from './schema';

// Instance singleton
let dbInstance: MyConfortDB | null = null;

export function getDB(): MyConfortDB {
  if (!dbInstance) {
    dbInstance = new MyConfortDB();
  }
  return dbInstance;
}
