import { useState, useEffect, useCallback } from 'react';
import api from '@/lib/api';
import type { DashboardStats, Payment, MerchantUPI, PaginatedResponse } from '@/types';

// ============================================================================
// GENERIC FETCHER HOOK
// ============================================================================

interface UseFetchResult<T> {
  data: T | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

function useFetch<T>(fetcher: () => Promise<any>, deps: any[] = []): UseFetchResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetcher();
      if (res.success) {
        setData(res.data);
      } else {
        setError(res.error || 'Failed to fetch');
      }
    } catch (e: any) {
      setError(e.message || 'Network error');
    } finally {
      setIsLoading(false);
    }
  }, deps);

  useEffect(() => { fetch(); }, [fetch]);

  return { data, isLoading, error, refetch: fetch };
}

// ============================================================================
// DASHBOARD STATS
// ============================================================================

export function useStats() {
  return useFetch<DashboardStats>(() => api.getStats());
}

// ============================================================================
// TRANSACTIONS
// ============================================================================

export function useTransactions(params?: Record<string, string>) {
  return useFetch<PaginatedResponse<Payment>>(
    () => api.getTransactions(params),
    [JSON.stringify(params)]
  );
}

// ============================================================================
// UPI IDs
// ============================================================================

export function useUPIs() {
  return useFetch<MerchantUPI[]>(() => api.listUPIs());
}

// ============================================================================
// POLLING HOOK (for payment status)
// ============================================================================

export function usePolling<T>(
  fetcher: () => Promise<any>,
  intervalMs: number,
  shouldStop?: (data: T) => boolean
): UseFetchResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stopped, setStopped] = useState(false);

  const fetch = useCallback(async () => {
    try {
      const res = await fetcher();
      if (res.success) {
        setData(res.data);
        if (shouldStop && shouldStop(res.data)) {
          setStopped(true);
        }
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetch();
    if (stopped) return;

    const id = setInterval(() => {
      if (!stopped) fetch();
    }, intervalMs);

    return () => clearInterval(id);
  }, [fetch, intervalMs, stopped]);

  return { data, isLoading, error, refetch: fetch };
}
