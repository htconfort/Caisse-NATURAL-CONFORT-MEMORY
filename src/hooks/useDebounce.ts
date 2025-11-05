import { useState, useEffect } from 'react';

/**
 * Hook pour débouncer une valeur
 * @param value - Valeur à débouncer
 * @param delay - Délai en millisecondes
 * @returns Valeur débouncée
 */
export const useDebounce = (value: string, delay: number): string => {
  const [debouncedValue, setDebouncedValue] = useState(value);
  
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  
  return debouncedValue;
};
