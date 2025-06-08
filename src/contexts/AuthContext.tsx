
"use client";

import type { User } from '@/types';
import { mockUsers as fallbackMockUsers } from '@/lib/mockData';
import { useRouter } from 'next/navigation';
import React, { createContext, useContext, useState, useEffect, type ReactNode, useCallback } from 'react';

interface AuthContextType {
  user: User | null;
  login: (id: string, pass: string) => Promise<boolean>;
  logout: () => void;
  isLoading: boolean;
  getAvailableUsers: () => User[]; // Expose this for admin or other uses
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const ADMIN_MANAGED_USERS_KEY = 'allAdminManagedUsers';
const ADMIN_SESSION_KEY = 'adminSession'; // Key for admin session
const COURIER_SESSION_KEY = 'mitraKurirUser'; // Key for courier session


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
        // Initialize localStorage with fallbackMockUsers if it's empty
        localStorage.setItem(ADMIN_MANAGED_USERS_KEY, JSON.stringify(fallbackMockUsers));
        return fallbackMockUsers;
      }
    } catch (error) {
      console.error("Failed to parse users from localStorage:", error);
      // Fallback to imported mock users if localStorage is corrupt or inaccessible
      return fallbackMockUsers;
    }
  }, []);


  useEffect(() => {
    // Simulate checking for a persisted session for the logged-in user
    const storedUserSession = localStorage.getItem(COURIER_SESSION_KEY);
    if (storedUserSession) {
      try {
        setUser(JSON.parse(storedUserSession));
      } catch (e) {
        console.error("Failed to parse courier session from localStorage", e);
        localStorage.removeItem(COURIER_SESSION_KEY);
      }
    }
    // Initialize the list of available users if not already present
    getAvailableUsers(); 
    setIsLoading(false);
  }, [getAvailableUsers]);

  const login = async (id: string, pass: string): Promise<boolean> => {
    setIsLoading(true);
    await new Promise(resolve => setTimeout(resolve, 500)); // Simulate API call
    
    const availableUsers = getAvailableUsers();
    const foundUser = availableUsers.find(u => u.id === id && u.password === pass);

    if (foundUser) {
      const { password, ...userToStore } = foundUser; // Don't store password in session
      setUser(userToStore);
      localStorage.setItem(COURIER_SESSION_KEY, JSON.stringify(userToStore));
      setIsLoading(false);
      return true;
    }
    setIsLoading(false);
    return false;
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem(COURIER_SESSION_KEY);
    localStorage.removeItem(ADMIN_SESSION_KEY); // Also clear admin session on logout
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
