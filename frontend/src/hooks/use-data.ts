import { useState, useEffect, useCallback, useRef } from 'react';
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
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
// POLLING HOOK — fixed with useRef to prevent stale closure bug
// ============================================================================

export function usePolling<T>(
  fetcher: () => Promise<any>,
  intervalMs: number,
  shouldStop?: (data: T) => boolean
): UseFetchResult<T> & { stop: () => void } {
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const stoppedRef = useRef(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const stop = useCallback(() => {
    stoppedRef.current = true;
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const doFetch = useCallback(async () => {
    if (stoppedRef.current) return;
    try {
      const res = await fetcher();
      if (res.success) {
        setData(res.data);
        if (shouldStop && shouldStop(res.data)) {
          stop();
        }
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setIsLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    stoppedRef.current = false;
    doFetch();
    intervalRef.current = setInterval(doFetch, intervalMs);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [doFetch, intervalMs]);

  return { data, isLoading, error, refetch: doFetch, stop };
}