
"use client";

import type { User } from '@/types';
import { mockUsers as fallbackMockUsers } from '@/lib/mockData';
import { useRouter } from 'next/navigation';
import React, { createContext, useContext, useState, useEffect, type ReactNode, useCallback } from 'react';

interface AuthLoginResponse {
  success: boolean;
  message?: string;
  user?: User | null; // Include user if successful, for direct use by caller if needed
}

interface AuthContextType {
  user: User | null;
  login: (id: string, pass: string) => Promise<AuthLoginResponse>;
  logout: () => void;
  isLoading: boolean;
  getAvailableUsers: () => User[];
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const ADMIN_MANAGED_USERS_KEY = 'allAdminManagedUsers';
const ADMIN_SESSION_KEY = 'adminSession';
const COURIER_SESSION_KEY = 'mitraKurirUser';


export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  const getAvailableUsers = useCallback((): User[] => {
    try {
      const storedUsers = localStorage.getItem(ADMIN_MANAGED_USERS_KEY);
      if (storedUsers) {
        return JSON.parse(storedUsers);
      } else {
        localStorage.setItem(ADMIN_MANAGED_USERS_KEY, JSON.stringify(fallbackMockUsers));
        return fallbackMockUsers;
      }
    } catch (error) {
      console.error("Failed to parse users from localStorage:", error);
      return fallbackMockUsers;
    }
  }, []);


  useEffect(() => {
    const storedUserSession = localStorage.getItem(COURIER_SESSION_KEY);
    if (storedUserSession) {
      try {
        setUser(JSON.parse(storedUserSession));
      } catch (e) {
        console.error("Failed to parse courier session from localStorage", e);
        localStorage.removeItem(COURIER_SESSION_KEY);
      }
    }
    getAvailableUsers(); 
    setIsLoading(false);
  }, [getAvailableUsers]);

  const login = async (id: string, pass: string): Promise<AuthLoginResponse> => {
    setIsLoading(true);
    await new Promise(resolve => setTimeout(resolve, 500)); 
    
    const availableUsers = getAvailableUsers();
    const foundUser = availableUsers.find(u => u.id === id && u.password === pass);

    if (foundUser) {
      if (foundUser.contractStatus !== 'Aktif') {
        setIsLoading(false);
        console.warn(`Login attempt for inactive user: ${id}, Status: ${foundUser.contractStatus}`);
        return { success: false, message: "Akun Anda tidak aktif. Silakan hubungi admin." };
      }

      const { password, ...userToStore } = foundUser; 
      setUser(userToStore);
      localStorage.setItem(COURIER_SESSION_KEY, JSON.stringify(userToStore));
      setIsLoading(false);
      return { success: true, user: userToStore };
    }
    setIsLoading(false);
    return { success: false, message: "ID atau Password salah." };
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem(COURIER_SESSION_KEY);
    localStorage.removeItem(ADMIN_SESSION_KEY); 
    router.push('/login');
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isLoading, getAvailableUsers }}>
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

