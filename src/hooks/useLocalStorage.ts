import { useState, useCallback } from 'react';

/**
 * Hook pour gérer le localStorage avec gestion d'erreurs
 * @param key - Clé localStorage
 * @param initialValue - Valeur initiale
 * @returns [valeur, setter]
 */
export function useLocalStorage<T>(
  key: string, 
  initialValue: T
): [T, (value: T | ((prevState: T) => T)) => void] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = localStorage.getItem(key);
      if (item) {
        const parsed = JSON.parse(item);
        return parsed.data || parsed;
      }
      return initialValue;
    } catch (error) {
      console.error(`Error loading ${key} from localStorage:`, error);
      return initialValue;
    }
  });

  const setValue = useCallback((value: T | ((prevState: T) => T)) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      const compressed = JSON.stringify({
        version: '1.0',
        timestamp: Date.now(),
        data: valueToStore
      });
      localStorage.setItem(key, compressed);
    } catch (error) {
      console.error(`Error saving ${key} to localStorage:`, error);
      try {
        localStorage.clear();
        localStorage.setItem(key, JSON.stringify({ data: value instanceof Function ? value(storedValue) : value }));
      } catch (clearError) {
        console.error('Failed to clear localStorage:', clearError);
      }
    }
  }, [key, storedValue]);

  return [storedValue, setValue];
}
