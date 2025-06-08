
"use client";

import type { User } from '@/types';
import { mockUsers } from '@/lib/mockData'; // Changed from mockUser to mockUsers
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
    
    const foundUser = mockUsers.find(u => u.id === id && u.password === pass);

    if (foundUser) {
      // Remove password from user object before storing in state and localStorage for security best practice, even in mock
      const { password, ...userToStore } = foundUser;
      setUser(userToStore);
      localStorage.setItem('mitraKurirUser', JSON.stringify(userToStore));
      setIsLoading(false);
      return true;
    }
    setIsLoading(false);
    return false;
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('mitraKurirUser');
    router.push('/login'); // Ensure redirection to login after logout
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
