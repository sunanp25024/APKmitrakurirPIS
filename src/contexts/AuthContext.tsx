
"use client";

import type { User } from '@/types';
import { mockUser } from '@/lib/mockData';
import { useRouter } from 'next/navigation';
import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';

interface AuthContextType {
  user: User | null;
  login: (id: string, pass: string) => Promise<boolean>;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Simulate checking for a persisted session
    const storedUser = localStorage.getItem('mitraKurirUser');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    setIsLoading(false);
  }, []);

  const login = async (id: string, pass: string): Promise<boolean> => {
    setIsLoading(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    if (id === 'PISTEST2025' && pass === '123456') {
      setUser(mockUser);
      localStorage.setItem('mitraKurirUser', JSON.stringify(mockUser));
      setIsLoading(false);
      return true;
    }
    setIsLoading(false);
    return false;
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('mitraKurirUser');
    router.push('/login');
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
