// src/hooks/storage/useIndexedStorage.ts
import { useState, useCallback, useEffect } from 'react';

// 🔧 Si tu n'as pas d'alias "@/db", remplace par un import relatif:
// import { db } from '../../db';
import { db } from '@/db';

// ———————————————————————————————————————————————————————
// Types
// ———————————————————————————————————————————————————————
type Wrapper<T> = {
  version: string;
  timestamp: number; // ms
  data: T;
};

type LSValue<T> = Wrapper<T> | T | null | undefined;

interface SettingsRow<T = unknown> {
  key: string;
  value: T;
  lastUpdate: number;
  version: string;
}

// ———————————————————————————————————————————————————————
// Utils IndexedDB (tolérants / safe)
// ———————————————————————————————————————————————————————
async function idbGetRaw(key: string): Promise<unknown | undefined> {
  try {
    const settings = (db as any)?.settings;
    if (!settings?.get) return undefined;
    const row = await settings.get(key);
    return row?.value as unknown;
  } catch {
    return undefined;
  }
}

async function idbPutRaw(key: string, value: unknown): Promise<void> {
  try {
    const settings = (db as any)?.settings;
    if (!settings?.put) return;
    const row: SettingsRow = {
      key,
      value,
      lastUpdate: Date.now(),
      version: '1.0',
    };
    await settings.put(row);
  } catch {
    // no-op
  }
}

// ———————————————————————————————————————————————————————
function toWrapper<T>(val: LSValue<T>): Wrapper<T> | undefined {
  if (val == null) return undefined;
  if (typeof val === 'object' && 'data' in (val as Record<string, unknown>)) {
    const obj = val as Record<string, unknown>;
    const ts = Number((obj as any).timestamp) || 0;
    return {
      data: obj.data as T,
      timestamp: ts,
      version: String((obj as any).version ?? '1.0'),
    };
  }
  // valeur brute -> wrapper minimal
  return { data: val as T, timestamp: 0, version: '1.0' };
}

// ———————————————————————————————————————————————————————
// Hook principal
// ———————————————————————————————————————————————————————
export function useIndexedStorage<T>(
  key: string,
  initialValue: T
): [T, (value: T | ((prev: T) => T)) => void] {
  // Hydratation synchrone (évite le flash)
  const getInitial = (): T => {
    try {
      if (typeof window === 'undefined') return initialValue;
      const raw = localStorage.getItem(key);
      if (!raw) return initialValue;
      const parsed = JSON.parse(raw) as LSValue<T>;
      const w = toWrapper<T>(parsed);
      return (w?.data ?? initialValue) as T;
    } catch {
      return initialValue;
    }
  };

  const [storedValue, setStoredValue] = useState<T>(getInitial);

  // Hydratation asynchrone: choisir source la plus fraîche (LS vs IDB)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const idbRaw = await idbGetRaw(key);
        const lsRaw = (() => {
          if (typeof window === 'undefined') return undefined;
          try {
            const s = localStorage.getItem(key);
            return s ? (JSON.parse(s) as LSValue<T>) : undefined;
          } catch {
            return undefined;
          }
        })();

        const fromIDB = toWrapper<T>(idbRaw as LSValue<T>);
        const fromLS = toWrapper<T>(lsRaw as LSValue<T>);

        // 🔧 CORRECTION CUMUL : Prioriser IndexedDB pour éviter les conflits
        let chosen = fromIDB || fromLS; // IndexedDB prioritaire (évite les cumuls)
        if (fromIDB && fromLS) {
          chosen = fromIDB.timestamp >= fromLS.timestamp ? fromIDB : fromLS;
        }

        if (!cancelled && chosen) {
          const next = (chosen.data ?? initialValue) as T;
          setStoredValue(next);

          // Miroirs croisés si nécessaire
          if (chosen === fromIDB && fromLS && fromIDB.timestamp > fromLS.timestamp) {
            try {
              if (typeof window !== 'undefined') {
                localStorage.setItem(key, JSON.stringify({ version: '1.0', timestamp: Date.now(), data: next }));
              }
            } catch {
              /* ignore */
            }
          } else if (chosen === fromLS && fromIDB && fromLS.timestamp > fromIDB.timestamp) {
            await idbPutRaw(key, { version: '1.0', timestamp: Date.now(), data: next });
          } else if (!fromIDB && fromLS) {
            await idbPutRaw(key, { version: '1.0', timestamp: Date.now(), data: chosen.data });
          }
        }
      } catch {
        // soft-fail
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [key, initialValue]);

  // Setter persistant (API identique à useState)
  const setValue = useCallback(
    (value: T | ((prev: T) => T)) => {
      const next = value instanceof Function ? value(storedValue) : value;
      setStoredValue(next);

      // IDB (asynchrone, non bloquant)
      (async () => {
        await idbPutRaw(key, { version: '1.0', timestamp: Date.now(), data: next });
      })();

      // LS (miroir instantané)
      try {
        if (typeof window !== 'undefined') {
          localStorage.setItem(key, JSON.stringify({ version: '1.0', timestamp: Date.now(), data: next }));
        }
      } catch {
        /* ignore */
      }
    },
    [key, storedValue]
  );

  return [storedValue, setValue];
}

// ———————————————————————————————————————————————————————
// Helpers orientés tableaux
// ———————————————————————————————————————————————————————
export function useIndexedArray<T>(
  key: string,
  initialValue: T[] = []
): [
  T[],
  (value: T[] | ((prev: T[]) => T[])) => void,
  {
    add: (item: T) => void;
    remove: (index: number) => void;
    update: (index: number, item: T) => void;
    clear: () => void;
  }
] {
  const [array, setArray] = useIndexedStorage<T[]>(key, initialValue);

  const add = useCallback((item: T) => setArray(prev => [...prev, item]), [setArray]);
  const remove = useCallback((index: number) => setArray(prev => prev.filter((_, i) => i !== index)), [setArray]);
  const update = useCallback((index: number, item: T) => setArray(prev => prev.map((v, i) => (i === index ? item : v))), [setArray]);
  const clear = useCallback(() => setArray([]), [setArray]);

  return [array, setArray, { add, remove, update, clear }];
}

// ———————————————————————————————————————————————————————
// Helpers orientés objets
// ———————————————————————————————————————————————————————
export function useIndexedObject<T extends Record<string, unknown>>(
  key: string,
  initialValue: T
): [
  T,
  (value: T | ((prev: T) => T)) => void,
  {
    updateField: <K extends keyof T>(field: K, value: T[K]) => void;
    merge: (partial: Partial<T>) => void;
    reset: () => void;
  }
] {
  const [obj, setObj] = useIndexedStorage<T>(key, initialValue);

  const updateField = useCallback(<K extends keyof T>(field: K, value: T[K]) => {
    setObj(prev => ({ ...prev, [field]: value }));
  }, [setObj]);

  const merge = useCallback((partial: Partial<T>) => {
    setObj(prev => ({ ...prev, ...partial }));
  }, [setObj]);

  const reset = useCallback(() => {
    setObj(initialValue);
  }, [setObj, initialValue]);

  return [obj, setObj, { updateField, merge, reset }];
}

export default useIndexedStorage;
