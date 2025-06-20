
    "use client";

    import type { User as AppUserType, AdminSession, AuthLoginResponse, AuthContextType as ExtendedAuthContextType } from '@/types';
    import { useRouter } from 'next/navigation';
    import React, { createContext, useContext, useState, useEffect, type ReactNode, useCallback, useRef } from 'react';
    import {
      User as FirebaseUser,
      signInWithEmailAndPassword,
      signOut,
      onAuthStateChanged,
    } from 'firebase/auth';
    import { doc, getDoc, serverTimestamp, addDoc, collection } from 'firebase/firestore';
    import { auth, db } from '@/lib/firebase';

    interface AuthContextTypeInternal extends ExtendedAuthContextType {
      isRestoringAdminSessionAfterUserCreation: boolean;
      setIsRestoringAdminSessionAfterUserCreation: React.Dispatch<React.SetStateAction<boolean>>;
    }

    const AuthContext = createContext<AuthContextTypeInternal | undefined>(undefined);

    const ADMIN_SESSION_KEY = 'adminSession_firebase_v2';

    export const ADMIN_FIRESTORE_CREDENTIALS = [
      { id: "MASTERADMIN", password: "masterpassword", role: "master" as const, email: "masteradmin@spxkurir.app"},
      { id: "ADMIN01", password: "admin123", role: "regular" as const, email: "admin01@spxkurir.app"},
      { id: "SUPERVISOR01", password: "super123", role: "regular" as const, email: "supervisor01@spxkurir.app"},
      { id: "ADMIN02JBR", password: "adminjbr", role: "regular" as const, email: "admin02.jbr@spxkurir.app"},
      { id: "PICAREA01", password: "pic123", role: "pic" as const, email: "picarea01@spxkurir.app"},
      { id: "PICSEKTORB", password: "picsektorb", role: "pic" as const, email: "pic.sektorb@spxkurir.app"},
    ];

    export const AuthProvider = ({ children }: { children: ReactNode }) => {
      const [user, setUser] = useState<AppUserType | null>(null);
      const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
      const [adminSession, setAdminSession] = useState<AdminSession | null>(null);
      const [isLoading, setIsLoading] = useState(true);
      const router = useRouter();
      const adminActionInProgress = useRef(false);
      const [isRestoringAdminSessionAfterUserCreation, setIsRestoringAdminSessionAfterUserCreation] = useState(false);


      const setAdminActionInProgressStatus = useCallback((status: boolean) => {
        adminActionInProgress.current = status;
      }, []);

      useEffect(() => {
        if (!auth || !db) {
          console.error("AuthCTX: Firebase auth or db not initialized. AuthProvider cannot function.");
          setIsLoading(false);
          return;
        }
        // console.log("AuthCTX: Subscribing to onAuthStateChanged. Initial isRestoringAdmin:", isRestoringAdminSessionAfterUserCreation);

        const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
          // console.log("AuthCTX: onAuthStateChanged triggered. fbUser UID:", fbUser?.uid, "current isLoading:", isLoading, "adminActionInProgress:", adminActionInProgress.current, "isRestoringAdmin:", isRestoringAdminSessionAfterUserCreation);
          setIsLoading(true); 

          try {
            const storedAdminSessionRaw = localStorage.getItem(ADMIN_SESSION_KEY);
            const storedAdminSession: AdminSession | null = storedAdminSessionRaw ? JSON.parse(storedAdminSessionRaw) : null;

            if (fbUser) {
              if (adminActionInProgress.current && storedAdminSession && fbUser.uid !== storedAdminSession.firebaseUid) {
                // console.log("AuthCTX: Admin action - New user (UID:", fbUser.uid, ") detected. Admin session UID:", storedAdminSession.firebaseUid, ". Signing out new user and setting flag to restore admin.");
                setIsRestoringAdminSessionAfterUserCreation(true); 
                await signOut(auth);
                // adminActionInProgress.current will be reset once the original admin session is confirmed or truly lost.
                // setIsLoading(false) will be handled in finally block.
                return; 
              }

              setFirebaseUser(fbUser);
              // If we reach here, it's either a normal login or Firebase has restored the original admin user
              adminActionInProgress.current = false; // Reset flag: the critical action (new user sign-in/out) is over or it's a normal login
              setIsRestoringAdminSessionAfterUserCreation(false); // Reset flag: either admin restored or it's a new user session

              if (storedAdminSession && storedAdminSession.firebaseUid === fbUser.uid) {
                // console.log("AuthCTX: Restoring admin session from localStorage for UID:", fbUser.uid);
                setAdminSession(storedAdminSession);
                setUser(null);
              } else {
                // console.log("AuthCTX: Not an admin session from localStorage or different user. Attempting to load courier user data for UID:", fbUser.uid);
                localStorage.removeItem(ADMIN_SESSION_KEY); // Clear any potentially stale admin session
                setAdminSession(null);
                const userDocRef = doc(db, "users", fbUser.uid);
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
                  if (appUserData.contractStatus !== 'Aktif' && appUserData.jobTitle !== 'Admin' && appUserData.jobTitle !== 'Master Admin' && appUserData.jobTitle !== 'PIC') {
                    // console.log(`AuthCTX: User ${appUserData.id} contract is not active. Logging out.`);
                    await signOut(auth);
                    // setUser(null); setFirebaseUser(null); will be handled by next auth state change
                    return; // Let next onAuthStateChanged handle the null user
                  } else {
                    setUser(appUserData);
                  }
                } else {
                  // console.warn("AuthCTX: User document not found in Firestore for UID:", fbUser.uid, ". Signing out.");
                  await signOut(auth);
                  // setUser(null); setFirebaseUser(null); will be handled by next auth state change
                  return; // Let next onAuthStateChanged handle the null user
                }
              }
            } else { // fbUser is null
              setFirebaseUser(null);
              if (isRestoringAdminSessionAfterUserCreation) {
                // console.log("AuthCTX: fbUser is null, but was restoring admin. Preserving admin session state. Resetting flag.");
                setIsRestoringAdminSessionAfterUserCreation(false); // CORRECTLY use the state setter
                adminActionInProgress.current = false; // Action is complete or was aborted
              } else {
                // console.log("AuthCTX: Genuine null user state. Clearing all sessions.");
                setUser(null);
                setAdminSession(null);
                localStorage.removeItem(ADMIN_SESSION_KEY);
                adminActionInProgress.current = false; 
              }
            }
          } catch (error) {
              console.error("AuthCTX: Error in onAuthStateChanged logic:", error);
              setUser(null);
              setFirebaseUser(null);
              setAdminSession(null);
              localStorage.removeItem(ADMIN_SESSION_KEY);
              adminActionInProgress.current = false;
              setIsRestoringAdminSessionAfterUserCreation(false);
          } finally {
              // console.log("AuthCTX: onAuthStateChanged finally block. Setting isLoading to false.");
              setIsLoading(false);
          }
        });
        return () => {
            // console.log("AuthCTX: Unsubscribing from onAuthStateChanged.");
            unsubscribe();
        }
      // eslint-disable-next-line react-hooks/exhaustive-deps
      }, []); // isRestoringAdminSessionAfterUserCreation is a dependency here if we read it directly, but we use the state setter

      const login = async (idOrEmailFromInput: string, pass: string): Promise<AuthLoginResponse> => {
        setIsLoading(true);
        adminActionInProgress.current = false; // Ensure this is false before any login attempt
        setIsRestoringAdminSessionAfterUserCreation(false); // Ensure this is false

        if (!auth || !db) {
          console.error("AuthCTX: Firebase auth or db not initialized during login attempt.");
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
            const newAdminSession: AdminSession = {
                id: foundAdminConfig.id,
                role: foundAdminConfig.role,
                firebaseUid: adminFirebaseUserCredential.user.uid,
                email: adminEmailForFirebase,
            };
            localStorage.setItem(ADMIN_SESSION_KEY, JSON.stringify(newAdminSession));
            // setAdminSession, setUser, setFirebaseUser will be handled by onAuthStateChanged
            // setIsLoading(false); // also handled by onAuthStateChanged
            return { success: true, isAdmin: true, role: foundAdminConfig.role };
          } catch (error: any) {
            setIsLoading(false); // Set loading false here on direct error
            let message = "Login Admin gagal. Periksa ID/Email dan Password.";
            if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
                message = "Kredensial Admin (email/password di Firebase) salah atau tidak ditemukan.";
            } else if (error.code === 'auth/invalid-email') {
                message = `Format email Admin (${adminEmailForFirebase}) yang dikonfigurasi tidak valid.`;
            }
            return { success: false, message };
          }
        }

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
          await signInWithEmailAndPassword(auth, finalCourierEmail, pass);
          // Data pengguna kurir dan state loading akan dimuat oleh onAuthStateChanged
          return { success: true, isAdmin: false };
        } catch (error: any) {
          setIsLoading(false); // Set loading false here on direct error
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
        // console.log("AuthCTX: logout initiated");
        setIsLoading(true);
        adminActionInProgress.current = false;
        setIsRestoringAdminSessionAfterUserCreation(false);
        if (!auth) {
          console.error("AuthCTX: Firebase auth not initialized during logout attempt.");
          localStorage.removeItem(ADMIN_SESSION_KEY);
          setUser(null);
          setFirebaseUser(null);
          setAdminSession(null);
          setIsLoading(false);
          router.push('/login');
          return;
        }
        await signOut(auth);
        // onAuthStateChanged(null) will handle clearing React state and localStorage.
        // isLoading will be set to false in onAuthStateChanged's finally block.
        router.push('/login');
      };
      
      const contextValue: AuthContextTypeInternal = {
        user,
        firebaseUser,
        adminSession,
        login,
        logout,
        isLoading,
        setAdminActionInProgress: setAdminActionInProgressStatus,
        isRestoringAdminSessionAfterUserCreation, // Pass the state
        setIsRestoringAdminSessionAfterUserCreation // Pass the setter
      };

      return (
        <AuthContext.Provider value={contextValue}>
          {children}
        </AuthContext.Provider>
      );
    };

    export const useAuth = (): ExtendedAuthContextType => {
      const context = useContext(AuthContext);
      if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
      }
      // Exclude the internal state and setter from the public hook
      const { 
        isRestoringAdminSessionAfterUserCreation: _internalState, 
        setIsRestoringAdminSessionAfterUserCreation: _internalSetter, 
        ...publicContext 
      } = context;
      return publicContext;
    };
    
    
