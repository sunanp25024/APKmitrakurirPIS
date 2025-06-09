
    "use client";

    import type { User as AppUserType, AdminSession, AuthLoginResponse, AuthContextType as ExtendedAuthContextType } from '@/types';
    import { useRouter } from 'next/navigation';
    import React, { createContext, useContext, useState, useEffect, type ReactNode, useCallback, useRef } from 'react';
    import {
      User as FirebaseUser,
      signInWithEmailAndPassword,
      signOut,
      onAuthStateChanged,
      // createUserWithEmailAndPassword // Keep for potential future use by admin
    } from 'firebase/auth';
    import { doc, getDoc, setDoc, collection, getDocs, query, where, writeBatch } from 'firebase/firestore';
    import { auth, db } from '@/lib/firebase';

    interface AuthContextTypeInternal extends ExtendedAuthContextType {
      isRestoringAdminSessionAfterUserCreation: boolean;
      setIsRestoringAdminSessionAfterUserCreation: React.Dispatch<React.SetStateAction<boolean>>;
    }

    const AuthContext = createContext<AuthContextTypeInternal | undefined>(undefined);

    const ADMIN_SESSION_KEY = 'adminSession_firebase_v2';

    export const ADMIN_FIRESTORE_CREDENTIALS = [
      // Master Admin
      { id: "MASTERADMIN", password: "masterpassword", role: "master" as const, email: "masteradmin@spxkurir.app"},

      // Admin (Regular)
      { id: "ADMIN01", password: "admin123", role: "regular" as const, email: "admin01@spxkurir.app"},
      { id: "SUPERVISOR01", password: "super123", role: "regular" as const, email: "supervisor01@spxkurir.app"},
      { id: "ADMIN02JBR", password: "adminjbr", role: "regular" as const, email: "admin02.jbr@spxkurir.app"},

      // PIC (Person In Charge)
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
      // State to specifically track if we are in the process of restoring admin session after creating a new user
      const [isRestoringAdminSessionAfterUserCreation, setIsRestoringAdminSessionAfterUserCreation] = useState(false);


      const setAdminActionInProgressStatus = useCallback((status: boolean) => {
        adminActionInProgress.current = status;
      }, []);

      useEffect(() => {
        if (!auth || !db) {
          console.error("Firebase auth or db not initialized. AuthProvider cannot function.");
          setIsLoading(false);
          return;
        }

        const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
          // console.log("Auth state changed. fbUser:", fbUser?.uid, "adminActionInProgress:", adminActionInProgress.current, "isRestoringAdmin:", isRestoringAdminSessionAfterUserCreation);
          setIsLoading(true);

          const storedAdminSessionRaw = localStorage.getItem(ADMIN_SESSION_KEY);
          const storedAdminSession: AdminSession | null = storedAdminSessionRaw ? JSON.parse(storedAdminSessionRaw) : null;

          if (fbUser) {
            // SCENARIO 1: Admin was logged in, created a new user, and this `fbUser` is the NEWLY CREATED user.
            if (adminActionInProgress.current && storedAdminSession && fbUser.uid !== storedAdminSession.firebaseUid) {
              // console.log("Admin action: New user (UID:", fbUser.uid, ") detected. Admin session UID:", storedAdminSession.firebaseUid, ". Signing out new user.");
              setIsRestoringAdminSessionAfterUserCreation(true); // Mark that we are in this special state
              await signOut(auth);
              // setIsLoading(false); // Let the next onAuthStateChanged (for null) handle loading state for this specific path
              return; // Expect onAuthStateChanged to fire again with fbUser = null
            }

            // SCENARIO 2: Normal login or session restoration (either admin or courier).
            // Or, this is the admin's session being re-asserted after the new user was signed out.
            // console.log("Processing stable fbUser:", fbUser.uid);
            setFirebaseUser(fbUser);
            
            // If an admin action was in progress, and we're now seeing a stable user,
            // it's time to reset the flags if this user is the original admin.
            if (adminActionInProgress.current && storedAdminSession && fbUser.uid === storedAdminSession.firebaseUid) {
                // console.log("Admin session re-asserted for UID:", fbUser.uid);
                adminActionInProgress.current = false;
                setIsRestoringAdminSessionAfterUserCreation(false);
            } else if (!storedAdminSession || fbUser.uid !== storedAdminSession.firebaseUid) {
                // If it's a regular user or a different admin, ensure flags are reset.
                adminActionInProgress.current = false;
                setIsRestoringAdminSessionAfterUserCreation(false);
            }


            if (storedAdminSession && storedAdminSession.firebaseUid === fbUser.uid) {
              // console.log("Restoring admin session from localStorage for UID:", fbUser.uid);
              setAdminSession(storedAdminSession);
              setUser(null); 
            } else {
              // console.log("Not an admin session from localStorage or different user. Attempting to load courier user data for UID:", fbUser.uid);
              localStorage.removeItem(ADMIN_SESSION_KEY); 
              setAdminSession(null);
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
                    // console.log(`User ${appUserData.id} contract is not active. Logging out.`);
                    await signOut(auth); 
                  } else {
                    setUser(appUserData);
                  }
                } else {
                  // console.warn("User document not found in Firestore for UID:", fbUser.uid, ". Signing out.");
                  await signOut(auth); 
                }
              } catch (error) {
                // console.error("Error fetching user document from Firestore:", error);
                await signOut(auth); 
              }
            }
          } else { // fbUser is null
            // console.log("fbUser is null. isRestoringAdmin:", isRestoringAdminSessionAfterUserCreation);
            if (isRestoringAdminSessionAfterUserCreation) {
              // This null state is expected after signing out the newly created user by admin.
              // We are waiting for Firebase to potentially re-assert the admin's original session.
              // So, we don't clear the admin session from React state or localStorage yet.
              // console.log("Null user after admin action, waiting for admin session re-assertion.");
              // It's crucial to not set isLoading to false here if we expect another auth state change.
              // However, if Firebase doesn't re-assert, we might get stuck in loading.
              // Let's assume Firebase *will* re-assert the previous user or stay null if original was null.
              // The flags will be reset when a non-null user comes in, or if it's a genuine logout.
            } else {
              // This is a genuine logout or session expiry.
              // console.log("Genuine null user state. Clearing admin session.");
              setUser(null);
              setFirebaseUser(null);
              setAdminSession(null);
              localStorage.removeItem(ADMIN_SESSION_KEY);
              adminActionInProgress.current = false; // Ensure flag is reset on any genuine logout
            }
            // Resetting here as we have processed the null state. If an admin session is re-asserted,
            // the flag will be reset again in the fbUser block.
            setIsRestoringAdminSessionAfterUserCreation(false);
          }
          setIsLoading(false);
        });
        return () => unsubscribe();
      // eslint-disable-next-line react-hooks/exhaustive-deps
      }, []); // Removed isRestoringAdminSessionAfterUserCreation from dep array to avoid potential loops, useEffect handles its reset internally.


      const login = async (idOrEmailFromInput: string, pass: string): Promise<AuthLoginResponse> => {
        setIsLoading(true);
        adminActionInProgress.current = false; 
        setIsRestoringAdminSessionAfterUserCreation(false); 

        if (!auth || !db) {
          // console.error("Firebase auth or db not initialized during login attempt.");
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
            // setIsLoading(false); // onAuthStateChanged will set it
            return { success: true, isAdmin: true, role: foundAdminConfig.role };
          } catch (error: any) {
            setIsLoading(false);
            // console.error("Admin Firebase login error:", error);
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
          setAdminSession(null); 
          localStorage.removeItem(ADMIN_SESSION_KEY);
          // setIsLoading(false); // onAuthStateChanged will set it
          return { success: true, isAdmin: false };
        } catch (error: any) {
          setIsLoading(false);
          // console.error("Courier login error:", error, "Attempted email:", finalCourierEmail);
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
        adminActionInProgress.current = false; 
        setIsRestoringAdminSessionAfterUserCreation(false); 
        if (!auth) {
          // console.error("Firebase auth not initialized during logout attempt.");
          localStorage.removeItem(ADMIN_SESSION_KEY);
          setUser(null);
          setFirebaseUser(null);
          setAdminSession(null);
          router.push('/login');
          setIsLoading(false);
          return;
        }
        // const currentPath = window.location.pathname; // No longer needed for redirect logic here
        await signOut(auth);
        // onAuthStateChanged(null) will clear session data unless isRestoringAdminSessionAfterUserCreation was true
        // and not reset, which should not be the case for a manual logout.
        router.push('/login'); // Always redirect to login on logout.
        // setIsLoading(false); // onAuthStateChanged will set it
      };
      
      const contextValue: AuthContextTypeInternal = {
        user,
        firebaseUser,
        adminSession,
        login,
        logout,
        isLoading,
        setAdminActionInProgress: setAdminActionInProgressStatus,
        isRestoringAdminSessionAfterUserCreation,
        setIsRestoringAdminSessionAfterUserCreation
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
      const { 
        isRestoringAdminSessionAfterUserCreation: _isRestoring, // Exclude internal state from public type
        setIsRestoringAdminSessionAfterUserCreation: _setIsRestoring, // Exclude internal setter
        ...publicContext 
      } = context;
      return publicContext;
    };

    
    