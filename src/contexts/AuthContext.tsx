
    "use client";

    import type { User as AppUserType, AdminSession, AuthLoginResponse } from '@/types'; 
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

    interface AuthContextType {
      user: AppUserType | null; 
      firebaseUser: FirebaseUser | null; 
      adminSession: AdminSession | null;
      login: (idOrEmail: string, pass: string) => Promise<AuthLoginResponse>;
      logout: () => Promise<void>;
      isLoading: boolean;
    }

    const AuthContext = createContext<AuthContextType | undefined>(undefined);

    const ADMIN_SESSION_KEY = 'adminSession_firebase_v2'; 

    // These emails and passwords MUST exist in your Firebase Authentication console
    const ADMIN_FIRESTORE_CREDENTIALS = [
      { id: "MASTERADMIN", password: "masterpassword", role: "master" as const, email: "masteradmin@spxkurir.app"},
      { id: "ADMIN01", password: "admin123", role: "regular" as const, email: "admin01@spxkurir.app"},
      { id: "SUPERVISOR01", password: "super123", role: "regular" as const, email: "supervisor01@spxkurir.app"},
      { id: "PICAREA01", password: "pic123", role: "pic" as const, email: "picarea01@spxkurir.app"}, // Example PIC
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
                if (sessionData.firebaseUid === fbUser.uid) {
                    setAdminSession(sessionData);
                    setUser(null); 
                    setIsLoading(false);
                    return; 
                } else {
                  localStorage.removeItem(ADMIN_SESSION_KEY);
                  setAdminSession(null);
                }
            }

            const userDocRef = doc(db, "users", fbUser.uid); 
            try {
              const userDocSnap = await getDoc(userDocRef);
              if (userDocSnap.exists()) {
                const appUserDataFromDb = userDocSnap.data();
                const appUserData: AppUserType = {
                    firebaseUid: fbUser.uid, 
                    id: appUserDataFromDb.id, 
                    fullName: appUserDataFromDb.fullName,
                    wilayah: appUserDataFromDb.wilayah,
                    area: appUserDataFromDb.area,
                    workLocation: appUserDataFromDb.workLocation,
                    joinDate: appUserDataFromDb.joinDate,
                    jobTitle: appUserDataFromDb.jobTitle,
                    contractStatus: appUserDataFromDb.contractStatus,
                    accountNumber: appUserDataFromDb.accountNumber,
                    bankName: appUserDataFromDb.bankName,
                    registeredRecipientName: appUserDataFromDb.registeredRecipientName,
                    avatarUrl: appUserDataFromDb.avatarUrl,
                };

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
                if (!adminSession && !localStorage.getItem(ADMIN_SESSION_KEY)) { 
                    await signOut(auth); 
                    setUser(null);
                    setFirebaseUser(null); 
                }
              }
            } catch (error) {
              console.error("Error fetching user document from Firestore:", error);
              await signOut(auth); 
              setUser(null);
              setFirebaseUser(null);
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
      // eslint-disable-next-line react-hooks/exhaustive-deps
      }, []); 


      const login = async (idOrEmailFromInput: string, pass: string): Promise<AuthLoginResponse> => {
        setIsLoading(true);

        if (!auth || !db) {
          console.error("Firebase auth or db not initialized during login attempt.");
          setIsLoading(false);
          return { success: false, message: "Layanan autentikasi tidak siap. Coba lagi nanti." };
        }
        
        let foundAdminConfig = ADMIN_FIRESTORE_CREDENTIALS.find(
          (admin) => admin.email.toLowerCase() === idOrEmailFromInput.toLowerCase()
        );

        if (!foundAdminConfig) {
            foundAdminConfig = ADMIN_FIRESTORE_CREDENTIALS.find(
                (admin) => admin.id.toUpperCase() === idOrEmailFromInput.toUpperCase()
            );
        }
        
        if (foundAdminConfig) {
          const adminEmailForFirebase = foundAdminConfig.email; 
          try {
            const adminFirebaseUserCredential = await signInWithEmailAndPassword(auth, adminEmailForFirebase, pass);
            const adminData: AdminSession = { 
              id: foundAdminConfig.id, 
              role: foundAdminConfig.role, 
              firebaseUid: adminFirebaseUserCredential.user.uid,
              email: foundAdminConfig.email 
            };
            setAdminSession(adminData); 
            localStorage.setItem(ADMIN_SESSION_KEY, JSON.stringify(adminData)); 
            setUser(null); 
            setFirebaseUser(adminFirebaseUserCredential.user); 
            setIsLoading(false);
            return { success: true, isAdmin: true, role: foundAdminConfig.role };
          } catch (error: any) {
            setIsLoading(false);
            console.error("Admin Firebase login error:", error);
            let message = "Login Admin gagal. Periksa ID/Email dan Password.";
            if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
                message = "Kredensial Admin (email/password di Firebase) salah atau tidak ditemukan.";
            } else if (error.code === 'auth/invalid-email') {
                message = `Format email Admin (${adminEmailForFirebase}) yang dikonfigurasi tidak valid.`;
            }
            return { success: false, message };
          }
        }
        
        // Courier login logic
        let finalCourierEmail: string;
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        const courierIdRegex = /^[a-zA-Z0-9_.-]+$/; 

        if (idOrEmailFromInput.includes('@')) { 
            if (!emailRegex.test(idOrEmailFromInput)) {
                setIsLoading(false);
                return { success: false, message: "Format email yang Anda masukkan tidak valid." };
            }
            finalCourierEmail = idOrEmailFromInput;
            const localPart = idOrEmailFromInput.split('@')[0];
            if (!courierIdRegex.test(localPart)) {
                 setIsLoading(false);
                 return { success: false, message: "Format ID Pengguna (bagian sebelum '@') dalam email tidak valid. Hanya huruf, angka, _, ., - yang diizinkan dan tanpa spasi." };
            }

        } else { 
            if (!courierIdRegex.test(idOrEmailFromInput)) {
                setIsLoading(false);
                return { success: false, message: "Format ID Pengguna tidak valid. Hanya huruf, angka, _, ., - yang diizinkan dan tanpa spasi." };
            }
            finalCourierEmail = `${idOrEmailFromInput}@spxkurir.app`;
        }
        
        try {
          const userCredential = await signInWithEmailAndPassword(auth, finalCourierEmail, pass);
          setAdminSession(null); 
          localStorage.removeItem(ADMIN_SESSION_KEY);
          setIsLoading(false);
          return { success: true, isAdmin: false }; 
        } catch (error: any) {
          setIsLoading(false);
          console.error("Courier login error:", error, "Attempted email:", finalCourierEmail);
          let message = "Login gagal. Periksa ID dan Password Anda.";
          if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
            message = "ID atau Password kurir salah, atau akun belum terdaftar.";
          } else if (error.code === 'auth/invalid-email') {
             message = `Format email ${finalCourierEmail} yang digunakan untuk login tidak valid. Mohon periksa kembali ID Anda.`;
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
        const currentPath = window.location.pathname; 
        await signOut(auth);
        
        if (currentPath?.startsWith('/admin')) {
            router.push('/login'); 
        } else {
            router.push('/login'); 
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

