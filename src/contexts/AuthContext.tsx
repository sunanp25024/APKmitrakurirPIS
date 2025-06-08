
    "use client";

    import type { User as AppUserType } from '@/types'; // Renamed to avoid conflict with Firebase User
    import { mockUsers as fallbackMockUsers } from '@/lib/mockData';
    import { useRouter } from 'next/navigation';
    import React, { createContext, useContext, useState, useEffect, type ReactNode, useCallback } from 'react';
    import { 
      Auth, 
      User as FirebaseUser, 
      signInWithEmailAndPassword, 
      signOut, 
      onAuthStateChanged,
      createUserWithEmailAndPassword // For admin creating users
    } from 'firebase/auth';
    import { doc, getDoc, setDoc, collection, getDocs, query, where, writeBatch } from 'firebase/firestore';
    import { auth, db } from '@/lib/firebase'; // Import Firebase instances

    interface AuthLoginResponse {
      success: boolean;
      message?: string;
      user?: AppUserType | null;
    }

    interface AdminSession {
      id: string;
      role: 'master' | 'regular';
      firebaseUid?: string; // Store Firebase UID for admin sessions
    }

    interface AuthContextType {
      user: AppUserType | null; // This will be our application-specific user type
      firebaseUser: FirebaseUser | null; // Firebase's own user object
      adminSession: AdminSession | null;
      login: (idOrEmail: string, pass: string) => Promise<AuthLoginResponse>;
      logout: () => Promise<void>;
      isLoading: boolean;
      // getAvailableUsers will be deprecated or changed to fetch from Firestore
    }

    const AuthContext = createContext<AuthContextType | undefined>(undefined);

    const ADMIN_SESSION_KEY = 'adminSession_firebase'; // Updated key
    // COURIER_SESSION_KEY is no longer needed as Firebase handles session persistence

    export const AuthProvider = ({ children }: { children: ReactNode }) => {
      const [user, setUser] = useState<AppUserType | null>(null); // Our app's user data
      const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null); // Firebase auth user
      const [adminSession, setAdminSession] = useState<AdminSession | null>(null);
      const [isLoading, setIsLoading] = useState(true);
      const router = useRouter();

      // Listen to Firebase auth state changes
      useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
          setIsLoading(true);
          if (fbUser) {
            setFirebaseUser(fbUser);
            // Check if it's an admin session from localStorage first
            const storedAdminSession = localStorage.getItem(ADMIN_SESSION_KEY);
            if (storedAdminSession) {
                const sessionData: AdminSession = JSON.parse(storedAdminSession);
                // Validate if fbUser.uid matches the stored one if exists
                if (sessionData.firebaseUid && sessionData.firebaseUid === fbUser.uid) {
                    setAdminSession(sessionData);
                    setUser(null); // Admin is not a courier user
                    setIsLoading(false);
                    // router.push('/admin/reports'); // Redirect if on login page
                    return;
                } else if (!sessionData.firebaseUid && sessionData.id.toUpperCase() === fbUser.email?.split('@')[0].toUpperCase()) {
                    // Legacy admin login (no UID stored yet), update it
                    const updatedSession = {...sessionData, firebaseUid: fbUser.uid};
                    setAdminSession(updatedSession);
                    localStorage.setItem(ADMIN_SESSION_KEY, JSON.stringify(updatedSession));
                    setUser(null);
                    setIsLoading(false);
                    return;
                }
            }

            // If not an admin session, fetch courier user data from Firestore
            const userDocRef = doc(db, "users", fbUser.uid);
            const userDocSnap = await getDoc(userDocRef);
            if (userDocSnap.exists()) {
              const appUserData = userDocSnap.data() as AppUserType;
              if (appUserData.contractStatus !== 'Aktif') {
                // Log out inactive user
                await signOut(auth);
                setUser(null);
                setFirebaseUser(null);
                // Optionally, show a toast here: "Akun Anda tidak aktif."
              } else {
                setUser(appUserData);
              }
            } else {
              // User exists in Auth but not in Firestore users collection (should not happen for couriers)
              // Or this is an admin user without a separate Firestore document in 'users'
              console.warn("User document not found in Firestore for UID:", fbUser.uid);
              setUser(null); // Or handle as admin if appropriate
            }
          } else {
            setUser(null);
            setFirebaseUser(null);
            setAdminSession(null);
            localStorage.removeItem(ADMIN_SESSION_KEY);
          }
          setIsLoading(false);
        });
        return () => unsubscribe();
      }, [router]);


      const login = async (idOrEmail: string, pass: string): Promise<AuthLoginResponse> => {
        setIsLoading(true);
        
        // Try admin login first (using hardcoded credentials for simplicity in prototype)
        // In production, admins would also be Firebase users, possibly with custom claims
        const ADMIN_CREDENTIALS = [
          { id: "MASTERADMIN", password: "masterpassword", role: "master" as const, email: "masteradmin@example.com"},
          { id: "ADMIN01", password: "admin123", role: "regular" as const, email: "admin01@example.com"},
          { id: "SUPERVISOR01", password: "super123", role: "regular" as const, email: "supervisor01@example.com"},
        ];

        const foundAdmin = ADMIN_CREDENTIALS.find(
          (admin) => admin.id.toUpperCase() === idOrEmail.toUpperCase() && admin.password === pass
        );

        if (foundAdmin) {
          try {
            // For prototype, we might "mock" Firebase auth for admins or use real admin Firebase accounts
            // Here, we'll assume admins also have Firebase accounts matching their emails.
            // This requires admins to be pre-registered in Firebase Auth.
            const adminFirebaseUserCredential = await signInWithEmailAndPassword(auth, foundAdmin.email, foundAdmin.password);
            const adminData: AdminSession = { id: foundAdmin.id, role: foundAdmin.role, firebaseUid: adminFirebaseUserCredential.user.uid };
            setAdminSession(adminData);
            localStorage.setItem(ADMIN_SESSION_KEY, JSON.stringify(adminData));
            setUser(null); // Clear courier user state
            setFirebaseUser(adminFirebaseUserCredential.user);
            setIsLoading(false);
            return { success: true };
          } catch (error: any) {
            setIsLoading(false);
            console.error("Admin Firebase login error:", error);
            return { success: false, message: "Admin login gagal: " + error.message };
          }
        }

        // If not admin, try courier login with Firebase Auth
        // Assuming courier ID is the username part of an email like `courierId@courirdomain.com`
        // You'll need to decide on an email format for couriers.
        const courierEmail = `${idOrEmail}@spxkurir.app`; // Example domain
        try {
          const userCredential = await signInWithEmailAndPassword(auth, courierEmail, pass);
          // onAuthStateChanged will handle setting firebaseUser and fetching AppUser data
          // The check for contractStatus will happen in onAuthStateChanged
          setIsLoading(false);
          return { success: true }; // User data will be set by onAuthStateChanged
        } catch (error: any) {
          setIsLoading(false);
          console.error("Courier login error:", error);
          let message = "Login gagal. Periksa ID dan Password Anda.";
          if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
            message = "ID atau Password salah.";
          } else if (error.code === 'auth/invalid-email') {
             message = "Format ID tidak valid untuk login.";
          }
          return { success: false, message };
        }
      };

      const logout = async () => {
        setIsLoading(true);
        await signOut(auth);
        // onAuthStateChanged will clear user, firebaseUser, adminSession states
        localStorage.removeItem(ADMIN_SESSION_KEY);
        router.push('/login');
        setIsLoading(false);
      };
      
      return (
        <AuthContext.Provider value={{ user, firebaseUser, adminSession, login, logout, isLoading }}>
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
    