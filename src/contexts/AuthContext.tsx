
    "use client";

    import type { User as AppUserType } from '@/types'; // Renamed to avoid conflict with Firebase User
    // import { mockUsers as fallbackMockUsers } from '@/lib/mockData'; // No longer primary source
    import { useRouter } from 'next/navigation';
    import React, { createContext, useContext, useState, useEffect, type ReactNode, useCallback } from 'react';
    import { 
      // Auth, // Not directly used as type for auth instance
      User as FirebaseUser, 
      signInWithEmailAndPassword, 
      signOut, 
      onAuthStateChanged,
      // createUserWithEmailAndPassword // For admin creating users - keep for future
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
    }

    const AuthContext = createContext<AuthContextType | undefined>(undefined);

    const ADMIN_SESSION_KEY = 'adminSession_firebase';

    export const AuthProvider = ({ children }: { children: ReactNode }) => {
      const [user, setUser] = useState<AppUserType | null>(null);
      const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
      const [adminSession, setAdminSession] = useState<AdminSession | null>(null);
      const [isLoading, setIsLoading] = useState(true);
      const router = useRouter();

      useEffect(() => {
        if (!auth || !db) {
          console.error("Firebase auth or db not initialized. AuthProvider cannot function.");
          setIsLoading(false);
          return;
        }
        const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
          setIsLoading(true);
          if (fbUser) {
            setFirebaseUser(fbUser);
            const storedAdminSession = localStorage.getItem(ADMIN_SESSION_KEY);
            if (storedAdminSession) {
                const sessionData: AdminSession = JSON.parse(storedAdminSession);
                if (sessionData.firebaseUid && sessionData.firebaseUid === fbUser.uid) {
                    setAdminSession(sessionData);
                    setUser(null); 
                    setIsLoading(false);
                    // Avoid automatic redirect from here to prevent loops if on admin pages
                    return;
                } else if (!sessionData.firebaseUid && sessionData.id.toUpperCase() === fbUser.email?.split('@')[0].toUpperCase()) {
                    const updatedSession = {...sessionData, firebaseUid: fbUser.uid};
                    setAdminSession(updatedSession);
                    localStorage.setItem(ADMIN_SESSION_KEY, JSON.stringify(updatedSession));
                    setUser(null);
                    setIsLoading(false);
                    return;
                }
            }

            const userDocRef = doc(db, "users", fbUser.uid);
            try {
              const userDocSnap = await getDoc(userDocRef);
              if (userDocSnap.exists()) {
                const appUserData = userDocSnap.data() as AppUserType;
                if (appUserData.contractStatus !== 'Aktif') {
                  await signOut(auth); // auth is guaranteed to be non-null here
                  setUser(null);
                  setFirebaseUser(null);
                  // console.log("User logged out due to inactive contract status.");
                  // Optionally, show a toast here via a global toast context or event emitter
                } else {
                  setUser(appUserData);
                }
              } else {
                console.warn("User document not found in Firestore for UID:", fbUser.uid, "Logging out.");
                await signOut(auth); // auth is guaranteed to be non-null here
                setUser(null); 
              }
            } catch (error) {
              console.error("Error fetching user document from Firestore:", error);
              await signOut(auth); // auth is guaranteed to be non-null here
              setUser(null);
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

        if (!auth || !db) {
          console.error("Firebase auth or db not initialized during login attempt.");
          setIsLoading(false);
          return { success: false, message: "Layanan autentikasi tidak siap. Coba lagi nanti." };
        }
        
        const ADMIN_CREDENTIALS = [
          { id: "MASTERADMIN", password: "masterpassword", role: "master" as const, email: "masteradmin@spxkurir.app"}, // Use consistent domain for admins too
          { id: "ADMIN01", password: "admin123", role: "regular" as const, email: "admin01@spxkurir.app"},
          { id: "SUPERVISOR01", password: "super123", role: "regular" as const, email: "supervisor01@spxkurir.app"},
        ];

        const foundAdmin = ADMIN_CREDENTIALS.find(
          (admin) => admin.id.toUpperCase() === idOrEmail.toUpperCase() && admin.password === pass
        );

        if (foundAdmin) {
          try {
            const adminFirebaseUserCredential = await signInWithEmailAndPassword(auth, foundAdmin.email, foundAdmin.password);
            const adminData: AdminSession = { id: foundAdmin.id, role: foundAdmin.role, firebaseUid: adminFirebaseUserCredential.user.uid };
            setAdminSession(adminData);
            localStorage.setItem(ADMIN_SESSION_KEY, JSON.stringify(adminData));
            setUser(null); 
            setFirebaseUser(adminFirebaseUserCredential.user);
            setIsLoading(false);
            return { success: true };
          } catch (error: any) {
            setIsLoading(false);
            console.error("Admin Firebase login error:", error);
            return { success: false, message: "Admin login gagal: " + error.message };
          }
        }

        let finalCourierEmail: string;

        if (idOrEmail.includes('@')) {
            // User might have entered a full email. Validate if it's one of ours or just try.
            // For now, assume it's correctly formatted if it contains '@'.
            // A stricter validation would be idOrEmail.endsWith('@spxkurir.app')
            finalCourierEmail = idOrEmail;
            // Check if the local part of the entered email is valid
            const localPart = idOrEmail.split('@')[0];
            if (/\s/.test(localPart) || !/^[a-zA-Z0-9_.-]+$/.test(localPart)) {
                 setIsLoading(false);
                 return { success: false, message: "Format ID Pengguna (bagian sebelum '@') tidak valid. Hanya huruf, angka, _, ., - yang diizinkan dan tanpa spasi." };
            }
        } else {
            // User entered an ID, construct the email.
            // Validate the ID part for allowed characters.
            if (/\s/.test(idOrEmail) || !/^[a-zA-Z0-9_.-]+$/.test(idOrEmail)) {
                setIsLoading(false);
                return { success: false, message: "Format ID Pengguna tidak valid. Hanya huruf, angka, _, ., - yang diizinkan dan tanpa spasi." };
            }
            finalCourierEmail = `${idOrEmail}@spxkurir.app`;
        }
        
        try {
          const userCredential = await signInWithEmailAndPassword(auth, finalCourierEmail, pass);
          // onAuthStateChanged will handle setting firebaseUser and fetching AppUser data
          // The check for contractStatus will happen in onAuthStateChanged
          setIsLoading(false);
          return { success: true }; 
        } catch (error: any) {
          setIsLoading(false);
          console.error("Courier login error:", error);
          let message = "Login gagal. Periksa ID dan Password Anda.";
          if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
            message = "ID atau Password salah.";
          } else if (error.code === 'auth/invalid-email') {
             message = "Format email yang digunakan untuk login tidak valid. Mohon periksa kembali ID Anda.";
          }
          return { success: false, message };
        }
      };

      const logout = async () => {
        setIsLoading(true);
        if (!auth) {
          console.error("Firebase auth not initialized during logout attempt.");
          // Still clear local state as a fallback
          localStorage.removeItem(ADMIN_SESSION_KEY);
          setUser(null);
          setFirebaseUser(null);
          setAdminSession(null);
          router.push('/login');
          setIsLoading(false);
          return;
        }
        await signOut(auth);
        // onAuthStateChanged will clear user, firebaseUser, adminSession states
        // localStorage.removeItem(ADMIN_SESSION_KEY); // This is handled in onAuthStateChanged
        router.push('/login'); // onAuthStateChanged might also handle redirect, but this ensures it
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
    
