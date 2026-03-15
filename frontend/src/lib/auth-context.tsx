'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import api from '@/lib/api';
import type { Merchant, AuthResponse } from '@/types';

interface AuthContextType {
  merchant: Merchant | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [merchant, setMerchant] = useState<Merchant | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Restore session on mount
  useEffect(() => {
    const token = localStorage.getItem('upay_access_token');
    if (token) {
      api.setToken(token);
      api.getProfile()
        .then((res: any) => {
          if (res.success && res.data) {
            setMerchant(res.data);
          } else {
            clearSession();
          }
        })
        .catch(() => clearSession())
        .finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, []);

  const saveSession = useCallback((data: AuthResponse) => {
    localStorage.setItem('upay_access_token', data.access_token);
    localStorage.setItem('upay_refresh_token', data.refresh_token);
    api.setToken(data.access_token);
    setMerchant(data.merchant);
  }, []);

  const clearSession = useCallback(() => {
    localStorage.removeItem('upay_access_token');
    localStorage.removeItem('upay_refresh_token');
    api.clearToken();
    setMerchant(null);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res = await api.login(email, password);
    if (res.success && res.data) {
      saveSession(res.data);
    } else {
      throw new Error(res.error || 'Login failed');
    }
  }, [saveSession]);

  const register = useCallback(async (name: string, email: string, password: string) => {
    const res = await api.register(name, email, password);
    if (res.success && res.data) {
      saveSession(res.data);
    } else {
      throw new Error(res.error || 'Registration failed');
    }
  }, [saveSession]);

  const logout = useCallback(() => {
    clearSession();
  }, [clearSession]);

  return (
    <AuthContext.Provider value={{
      merchant,
      isLoading,
      isAuthenticated: !!merchant,
      login,
      register,
      logout,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
