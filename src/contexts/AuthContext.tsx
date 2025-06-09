
    "use client";

    import type { User as AppUserType } from '@/types'; 
    import { useRouter } from 'next/navigation';
    import React, { createContext, useContext, useState, useEffect, type ReactNode, useCallback } from 'react';
    import { 
      User as FirebaseUser, 
      signInWithEmailAndPassword, 
      signOut, 
      onAuthStateChanged,
      // createUserWithEmailAndPassword // Keep for potential future use by admin
    } from 'firebase/auth';
    import { doc, getDoc, setDoc, collection, getDocs, query, where, writeBatch } from 'firebase/firestore';
    import { auth, db } from '@/lib/firebase'; 

    interface AuthLoginResponse {
      success: boolean;
      message?: string;
      user?: AppUserType | null;
      isAdmin?: boolean; // Flag to indicate if login was for an admin
      role?: 'master' | 'regular'; // Admin role
    }

    interface AdminSession {
      id: string; // Admin's own ID (e.g., MASTERADMIN)
      role: 'master' | 'regular';
      firebaseUid: string; // Firebase UID for the admin (after successful Firebase login)
      email: string; // Admin's Firebase email (e.g., masteradmin@spxkurir.app)
    }

    interface AuthContextType {
      user: AppUserType | null; 
      firebaseUser: FirebaseUser | null; 
      adminSession: AdminSession | null;
      login: (idOrEmail: string, pass: string) => Promise<AuthLoginResponse>;
      logout: () => Promise<void>;
      isLoading: boolean;
    }

    const AuthContext = createContext<AuthContextType | undefined>(undefined);

    const ADMIN_SESSION_KEY = 'adminSession_firebase_v2'; // Updated key if structure changes

    // These emails and passwords MUST exist in your Firebase Authentication console
    const ADMIN_FIRESTORE_CREDENTIALS = [
      { id: "MASTERADMIN", password: "masterpassword", role: "master" as const, email: "masteradmin@spxkurir.app"},
      { id: "ADMIN01", password: "admin123", role: "regular" as const, email: "admin01@spxkurir.app"},
      { id: "SUPERVISOR01", password: "super123", role: "regular" as const, email: "supervisor01@spxkurir.app"},
    ];

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
                // Verify if the currently logged-in Firebase user matches the stored admin session's Firebase UID
                if (sessionData.firebaseUid === fbUser.uid) {
                    setAdminSession(sessionData);
                    setUser(null); // Clear courier user if admin is logged in
                    setIsLoading(false);
                    // No automatic redirect from here to prevent loops if already on admin pages.
                    // Page-level guards or redirects in LoginForm will handle navigation.
                    return; 
                } else {
                  // Mismatch, clear potentially stale admin session
                  localStorage.removeItem(ADMIN_SESSION_KEY);
                  setAdminSession(null);
                }
            }

            // If not an admin session, or if admin session was cleared, proceed to check for courier user
            const userDocRef = doc(db, "users", fbUser.uid);
            try {
              const userDocSnap = await getDoc(userDocRef);
              if (userDocSnap.exists()) {
                const appUserData = userDocSnap.data() as AppUserType;
                if (appUserData.contractStatus !== 'Aktif') {
                  console.log(`User ${appUserData.id} contract is not active. Logging out.`);
                  await signOut(auth); 
                  setUser(null);
                  setFirebaseUser(null);
                } else {
                  setUser(appUserData);
                }
              } else {
                console.warn("User document not found in Firestore for UID:", fbUser.uid, "This might be an admin user or a new user without a Firestore doc. Logging out if not an admin.");
                // If it's not an admin (checked above) and no user doc, log out.
                // This prevents users who are in Firebase Auth but not in 'users' collection from proceeding.
                if (!adminSession) { // Re-check adminSession as it might have been cleared
                    await signOut(auth); 
                    setUser(null);
                }
              }
            } catch (error) {
              console.error("Error fetching user document from Firestore:", error);
              await signOut(auth); 
              setUser(null);
            }
          } else { // No Firebase user
            setUser(null);
            setFirebaseUser(null);
            setAdminSession(null);
            localStorage.removeItem(ADMIN_SESSION_KEY);
          }
          setIsLoading(false);
        });
        return () => unsubscribe();
      // eslint-disable-next-line react-hooks/exhaustive-deps
      }, []); // Removed router from dependencies to avoid re-runs that might not be needed


      const login = async (idOrEmailFromInput: string, pass: string): Promise<AuthLoginResponse> => {
        setIsLoading(true);

        if (!auth || !db) {
          console.error("Firebase auth or db not initialized during login attempt.");
          setIsLoading(false);
          return { success: false, message: "Layanan autentikasi tidak siap. Coba lagi nanti." };
        }
        
        // 1. Check if it's an admin login attempt based on ID and password from ADMIN_FIRESTORE_CREDENTIALS
        const foundAdminConfig = ADMIN_FIRESTORE_CREDENTIALS.find(
          (admin) => admin.id.toUpperCase() === idOrEmailFromInput.toUpperCase() && admin.password === pass
        );

        if (foundAdminConfig) {
          try {
            // Attempt Firebase sign-in using the admin's configured email and the provided password
            const adminFirebaseUserCredential = await signInWithEmailAndPassword(auth, foundAdminConfig.email, foundAdminConfig.password);
            const adminData: AdminSession = { 
              id: foundAdminConfig.id, 
              role: foundAdminConfig.role, 
              firebaseUid: adminFirebaseUserCredential.user.uid,
              email: foundAdminConfig.email
            };
            setAdminSession(adminData); // Set in context state
            localStorage.setItem(ADMIN_SESSION_KEY, JSON.stringify(adminData)); // Set in localStorage
            setUser(null); // Ensure no courier user is set
            setFirebaseUser(adminFirebaseUserCredential.user); // Set Firebase user
            setIsLoading(false);
            return { success: true, isAdmin: true, role: foundAdminConfig.role };
          } catch (error: any) {
            setIsLoading(false);
            console.error("Admin Firebase login error:", error);
            // Provide more specific error messages for admins if possible
             let message = "Login Admin gagal. Periksa ID dan Password.";
            if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
                message = "Kredensial Admin (email/password di Firebase) salah atau tidak ditemukan.";
            } else if (error.code === 'auth/invalid-email') {
                message = "Format email Admin yang dikonfigurasi tidak valid.";
            }
            return { success: false, message };
          }
        }

        // 2. If not an admin, proceed as courier login
        let finalCourierEmail: string;
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (idOrEmailFromInput.includes('@')) {
            if (!emailRegex.test(idOrEmailFromInput)) {
                setIsLoading(false);
                return { success: false, message: "Format email yang Anda masukkan tidak valid." };
            }
            finalCourierEmail = idOrEmailFromInput;
            const localPart = idOrEmailFromInput.split('@')[0];
            if (/\s/.test(localPart) || !/^[a-zA-Z0-9_.-]+$/.test(localPart)) {
                 setIsLoading(false);
                 return { success: false, message: "Format ID Pengguna (bagian sebelum '@') tidak valid. Hanya huruf, angka, _, ., - yang diizinkan dan tanpa spasi." };
            }
        } else {
            if (/\s/.test(idOrEmailFromInput) || !/^[a-zA-Z0-9_.-]+$/.test(idOrEmailFromInput)) {
                setIsLoading(false);
                return { success: false, message: "Format ID Pengguna tidak valid. Hanya huruf, angka, _, ., - yang diizinkan dan tanpa spasi." };
            }
            finalCourierEmail = `${idOrEmailFromInput}@spxkurir.app`;
        }
        
        try {
          const userCredential = await signInWithEmailAndPassword(auth, finalCourierEmail, pass);
          // onAuthStateChanged will handle setting firebaseUser and fetching AppUser data
          // The check for contractStatus will happen in onAuthStateChanged
          setIsLoading(false);
          // User will be set by onAuthStateChanged
          return { success: true, isAdmin: false }; 
        } catch (error: any) {
          setIsLoading(false);
          console.error("Courier login error:", error, "Attempted email:", finalCourierEmail);
          let message = "Login gagal. Periksa ID dan Password Anda.";
          if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
            message = "ID atau Password kurir salah.";
          } else if (error.code === 'auth/invalid-email') {
             message = "Format email kurir yang digunakan untuk login tidak valid. Mohon periksa kembali ID Anda.";
          } else if (error.code === 'auth/too-many-requests') {
            message = "Terlalu banyak percobaan login. Coba lagi nanti atau reset password Anda.";
          }
          return { success: false, message };
        }
      };

      const logout = async () => {
        setIsLoading(true);
        if (!auth) {
          console.error("Firebase auth not initialized during logout attempt.");
          localStorage.removeItem(ADMIN_SESSION_KEY);
          setUser(null);
          setFirebaseUser(null);
          setAdminSession(null);
          router.push('/login');
          setIsLoading(false);
          return;
        }
        const currentPath = router.pathname; // Access router directly, no need for usePathname here
        await signOut(auth);
        // onAuthStateChanged will clear user, firebaseUser, adminSession states
        // localStorage.removeItem(ADMIN_SESSION_KEY); // Handled by onAuthStateChanged or explicitly here
        
        // Determine where to redirect after logout
        // If logging out from an admin page, stay on login, otherwise could also go to login
        // router.push('/login'); // onAuthStateChanged handles this for courier. For admin, explicit redirect is fine.

        // Let onAuthStateChanged handle the state clearing and redirect.
        // If onAuthStateChanged doesn't redirect quickly enough or from all scenarios:
        if (currentPath?.startsWith('/admin')) {
            router.push('/login');
        } else {
            router.push('/login'); // Default redirect
        }
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
