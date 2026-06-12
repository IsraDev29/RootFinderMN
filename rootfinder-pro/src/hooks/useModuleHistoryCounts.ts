import { useEffect, useMemo, useState } from 'react';
import {
  POLYNOMIAL_HISTORY_KEY,
  POLYNOMIAL_HISTORY_UPDATED_EVENT,
  SYSTEM_HISTORY_KEY,
  SYSTEM_HISTORY_UPDATED_EVENT,
  TAYLOR_HISTORY_KEY,
  TAYLOR_HISTORY_UPDATED_EVENT,
} from '@/lib/historyKeys';

interface ModuleHistoryCounts {
  taylor: number;
  methods: number;
  polynomial: number;
  advanced: number;
  systems: number;
}

function readLocalCount(key: string): number {
  if (typeof window === 'undefined') {
    return 0;
  }

  try {
    const rawValue = window.localStorage.getItem(key);
    const parsed = rawValue ? JSON.parse(rawValue) : [];
    return Array.isArray(parsed) ? parsed.length : 0;
  } catch {
    return 0;
  }
}

/**
 * Sincroniza los contadores visibles de historial para los módulos locales y el remoto de resolución.
 */
export function useModuleHistoryCounts(resolutionCount: number): ModuleHistoryCounts {
  const [taylorCount, setTaylorCount] = useState(0);
  const [polynomialCount, setPolynomialCount] = useState(0);
  const [systemsCount, setSystemsCount] = useState(0);

  useEffect(() => {
    const refreshCounts = () => {
      setTaylorCount(readLocalCount(TAYLOR_HISTORY_KEY));
      setPolynomialCount(readLocalCount(POLYNOMIAL_HISTORY_KEY));
      setSystemsCount(readLocalCount(SYSTEM_HISTORY_KEY));
    };

    refreshCounts();
    window.addEventListener(TAYLOR_HISTORY_UPDATED_EVENT, refreshCounts);
    window.addEventListener(POLYNOMIAL_HISTORY_UPDATED_EVENT, refreshCounts);
    window.addEventListener(SYSTEM_HISTORY_UPDATED_EVENT, refreshCounts);
    window.addEventListener('storage', refreshCounts);

    return () => {
      window.removeEventListener(TAYLOR_HISTORY_UPDATED_EVENT, refreshCounts);
      window.removeEventListener(POLYNOMIAL_HISTORY_UPDATED_EVENT, refreshCounts);
      window.removeEventListener(SYSTEM_HISTORY_UPDATED_EVENT, refreshCounts);
      window.removeEventListener('storage', refreshCounts);
    };
  }, []);

  return useMemo(
    () => ({
      taylor: taylorCount,
      methods: resolutionCount,
      polynomial: polynomialCount,
      advanced: 0,
      systems: systemsCount,
    }),
    [polynomialCount, resolutionCount, systemsCount, taylorCount],
  );
}
