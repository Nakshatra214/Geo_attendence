'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import toast from 'react-hot-toast';

interface AdminUser {
  _id: string;
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'user';
  department: string;
  employeeId: string;
  phone: string;
  isActive: boolean;
}

interface AuthContextType {
  admin: AdminUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  token: string | null;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [admin, setAdmin] = useState<AdminUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Check saved session on mount
    const initAuth = async () => {
      try {
        const savedToken = localStorage.getItem('adminToken');
        const savedUser = localStorage.getItem('adminUser');

        if (savedToken && savedUser) {
          const parsedUser = JSON.parse(savedUser);
          setToken(savedToken);
          setAdmin(parsedUser);

          // Verify token is still valid via /api/auth/me
          try {
            const res = await fetch('/api/auth/me', {
              headers: { Authorization: `Bearer ${savedToken}` },
            });
            const data = await res.json();
            if (data.success && data.data?.user?.role === 'admin') {
              setAdmin(data.data.user);
              localStorage.setItem('adminUser', JSON.stringify(data.data.user));
            } else {
              // Invalid or deactivated
              logout();
            }
          } catch {
            // Offline or network error, retain local session
          }
        }
      } catch (e) {
        console.error('Failed to restore session:', e);
        logout();
      } finally {
        setLoading(false);
      }
    };

    initAuth();
  }, []);

  const login = async (email: string, password: string) => {
    setLoading(true);
    try {
      const res = await fetch('/api/auth/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || 'Login failed');
      }

      const { token: authToken, user } = json.data;
      setToken(authToken);
      setAdmin(user);

      localStorage.setItem('adminToken', authToken);
      localStorage.setItem('adminUser', JSON.stringify(user));

      // Set cookie for SSR/middleware if needed
      document.cookie = `adminToken=${authToken}; path=/; max-age=604800; SameSite=Lax`;

      toast.success(`Welcome back, ${user.name || 'Admin'}!`);
      router.push('/');
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await supabase.auth.signOut();
    } catch {
      // Ignore
    }
    setToken(null);
    setAdmin(null);
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminUser');
    document.cookie = 'adminToken=; path=/; max-age=0';
    if (pathname !== '/login') {
      router.push('/login');
    }
  };

  return (
    <AuthContext.Provider value={{ admin, loading, login, logout, token }}>
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
