"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/axios';

interface User {
  id: number;
  name: string;
  email: string;
  role: "ROLE_ADMIN" | "ROLE_USER" | "ROLE_SUPER_ADMIN";
  profileImage?: string;
  hasCompletedOnboarding?: boolean;
  receiveNotifications?: boolean;
  themePreferences?: string;
}

interface AuthContextType {
  user: User | null;
  login: (user: User, redirectUrl?: string) => void;
  logout: () => void;
  loading: boolean;
  updateContextUser?: (updates: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const checkSession = async () => {
      try {
        const response = await api.get('/users/me');
        setUser(response.data);
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      } catch (e) {
        setUser(null);
      } finally {
        setLoading(false);
      }
    };
    checkSession();
  }, []);

  const login = (userData: User, redirectUrl?: string) => {
    // Preserve preferences when storing in localStorage if needed, usually we don't store full obj or rely on state.
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
    router.push(redirectUrl || '/dashboard');
  };

  const updateContextUser = (updates: Partial<User>) => {
    setUser(prev => {
      if (!prev) return null;
      const updated = { ...prev, ...updates };
      localStorage.setItem('user', JSON.stringify(updated));
      return updated;
    });
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (e) {
      console.error(e);
    }
    localStorage.removeItem('user');
    setUser(null);
    window.location.href = '/login';
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading, updateContextUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
