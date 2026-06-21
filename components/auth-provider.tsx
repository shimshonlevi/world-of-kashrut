'use client';

import { createContext, useContext, useState, useEffect, useCallback } from 'react';

export type UserRole = 'נחמה' | 'שירה' | 'מנהל';

interface User {
  id?: string;
  name: string;
  avatar: string;
  role: 'secretary' | 'admin';
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (name: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Restore the session from the httpOnly cookie on mount.
  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => (r.ok ? r.json() : { user: null }))
      .then((d) => setUser(d.user))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (name: string, password: string) => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, password }),
      });
      const data = await res.json();
      if (!res.ok) return { ok: false, error: data?.error || 'התחברות נכשלה' };
      setUser(data.user);
      return { ok: true };
    } catch {
      return { ok: false, error: 'שגיאת רשת' };
    }
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    fetch('/api/auth/logout', { method: 'POST' }).catch(() => {});
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
