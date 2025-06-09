
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
    import { doc, getDoc } from 'firebase/firestore';
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
          setIsLoading(true); // Set loading true at the very start of handling an auth state change.
          // console.log("AuthCTX: onAuthStateChanged triggered. fbUser UID:", fbUser?.uid, "adminActionInProgress:", adminActionInProgress.current, "isRestoringAdmin:", isRestoringAdminSessionAfterUserCreation);

          const storedAdminSessionRaw = localStorage.getItem(ADMIN_SESSION_KEY);
          const storedAdminSession: AdminSession | null = storedAdminSessionRaw ? JSON.parse(storedAdminSessionRaw) : null;

          if (fbUser) {
            if (adminActionInProgress.current && storedAdminSession && fbUser.uid !== storedAdminSession.firebaseUid) {
              // Admin action: New user detected. Sign out this new user.
              // The admin's session should ideally be restored by Firebase if their token is still valid.
              // console.log("AuthCTX: Admin action - New user (UID:", fbUser.uid, ") detected. Admin session UID:", storedAdminSession.firebaseUid, ". Signing out new user.");
              setIsRestoringAdminSessionAfterUserCreation(true);
              await signOut(auth);
              // DO NOT set isLoading to false here. Let the subsequent onAuthStateChanged(null) or the potential admin re-auth handle it.
              return; // Expect onAuthStateChanged to fire again with fbUser = null for the signed-out new user.
            }

            // This block handles:
            // 1. A stable login (admin or courier).
            // 2. Firebase re-authenticating the original admin after the new user (created by admin) was signed out.
            // console.log("AuthCTX: Processing stable fbUser:", fbUser.uid);
            setFirebaseUser(fbUser);

            if (storedAdminSession && storedAdminSession.firebaseUid === fbUser.uid) {
              // console.log("AuthCTX: Restoring admin session from localStorage for UID:", fbUser.uid);
              setAdminSession(storedAdminSession);
              setUser(null);
              // Reset flags as we've stabilized on an admin session
              adminActionInProgress.current = false;
              setIsRestoringAdminSessionAfterUserCreation(false);
            } else {
              // console.log("AuthCTX: Not an admin session from localStorage or different user. Attempting to load courier user data for UID:", fbUser.uid);
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
                  if (appUserData.contractStatus !== 'Aktif' && appUserData.jobTitle !== 'Admin' && appUserData.jobTitle !== 'Master Admin' && appUserData.jobTitle !== 'PIC') { // Admins/PICs are always "active" in terms of login
                    // console.log(`AuthCTX: User ${appUserData.id} contract is not active. Logging out.`);
                    await signOut(auth); // This will trigger onAuthStateChanged(null)
                    // Return here because a new onAuthStateChanged will be triggered.
                    return;
                  } else {
                    setUser(appUserData);
                  }
                } else {
                  // console.warn("AuthCTX: User document not found in Firestore for UID:", fbUser.uid, ". Signing out.");
                  await signOut(auth); // This will trigger onAuthStateChanged(null)
                  return;
                }
              } catch (error) {
                // console.error("AuthCTX: Error fetching user document from Firestore:", error);
                await signOut(auth); // This will trigger onAuthStateChanged(null)
                return;
              }
              // Reset flags as we've stabilized on a courier session or failed to load one (leading to logout)
              adminActionInProgress.current = false;
              setIsRestoringAdminSessionAfterUserCreation(false);
            }
          } else { // fbUser is null
            // console.log("AuthCTX: fbUser is null. isRestoringAdmin:", isRestoringAdminSessionAfterUserCreation);
            if (isRestoringAdminSessionAfterUserCreation) {
              // This null state is after signing out the newly created user by admin.
              // We are waiting for Firebase to potentially re-assert the admin's original session.
              // So, we don't clear the admin session from React state or localStorage yet.
              // console.log("AuthCTX: Null user after admin action, admin session potentially preserved in state/localStorage. Waiting for possible admin re-auth.");
              // The `isLoading` will be set to false at the end of this onAuthStateChanged call.
              // If Firebase re-auths admin, next call will handle it. If not, pages will see isLoading=false and no fbUser.
            } else {
              // This is a genuine logout or session expiry, or failure to load user data.
              // console.log("AuthCTX: Genuine null user state. Clearing user/admin session.");
              setUser(null);
              setFirebaseUser(null);
              setAdminSession(null);
              localStorage.removeItem(ADMIN_SESSION_KEY);
              adminActionInProgress.current = false; // Ensure flag is reset on any genuine logout
            }
            // Always reset this flag after handling a null user state.
            setIsRestoringAdminSessionAfterUserCreation(false);
          }
          setIsLoading(false); // Set loading to false at the very end of processing this auth state.
        });
        return () => {
            // console.log("AuthCTX: Unsubscribing from onAuthStateChanged.");
            unsubscribe();
        }
      // eslint-disable-next-line react-hooks/exhaustive-deps
      }, []); // Removed isRestoringAdminSessionAfterUserCreation from dep array to simplify and rely on its internal reset

      const login = async (idOrEmailFromInput: string, pass: string): Promise<AuthLoginResponse> => {
        setIsLoading(true);
        adminActionInProgress.current = false; 
        setIsRestoringAdminSessionAfterUserCreation(false); 

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
            // console.log("AuthCTX: Attempting admin sign-in with Firebase for email:", adminEmailForFirebase);
            const adminFirebaseUserCredential = await signInWithEmailAndPassword(auth, adminEmailForFirebase, pass);
            // `onAuthStateChanged` will handle setting adminSession and isLoading
            // console.log("AuthCTX: Admin Firebase sign-in successful for:", adminFirebaseUserCredential.user.uid);
            return { success: true, isAdmin: true, role: foundAdminConfig.role };
          } catch (error: any) {
            // console.error("AuthCTX: Admin Firebase login error:", error);
            setIsLoading(false);
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
          // console.log("AuthCTX: Attempting courier sign-in with Firebase for email:", finalCourierEmail);
          await signInWithEmailAndPassword(auth, finalCourierEmail, pass);
          // `onAuthStateChanged` will handle setting user and isLoading
          // console.log("AuthCTX: Courier Firebase sign-in successful (pending onAuthStateChanged).");
          return { success: true, isAdmin: false };
        } catch (error: any) {
          // console.error("AuthCTX: Courier login error:", error, "Attempted email:", finalCourierEmail);
          setIsLoading(false);
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
          console.error("AuthCTX: Firebase auth not initialized during logout attempt.");
          localStorage.removeItem(ADMIN_SESSION_KEY);
          setUser(null);
          setFirebaseUser(null);
          setAdminSession(null);
          setIsLoading(false); // Set loading false before push
          router.push('/login');
          return;
        }
        // console.log("AuthCTX: Logging out user.");
        await signOut(auth);
        // `onAuthStateChanged` will be triggered with null, which will then clear session data and set isLoading to false.
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
        isRestoringAdminSessionAfterUserCreation: _isRestoring, 
        setIsRestoringAdminSessionAfterUserCreation: _setIsRestoring, 
        ...publicContext 
      } = context;
      return publicContext;
    };
    
    