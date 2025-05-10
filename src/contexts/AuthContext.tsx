
"use client";

import type { User, ProfileFormData } from '@/types';
import React, { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { 
  onAuthStateChanged, 
  signOut as firebaseSignOut, 
  signInWithPopup, 
  User as FirebaseUser,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile as updateFirebaseProfile,
} from 'firebase/auth';
import { auth, googleProvider, db } from '@/lib/firebase'; 
import { doc, setDoc, getDoc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { useRouter, usePathname } from 'next/navigation'; 
import LoadingSpinner from '@/components/layout/LoadingSpinner';
import { useToast } from '@/hooks/use-toast';
import { INITIAL_VIRTUAL_BALANCE } from '@/lib/constants';


interface AuthContextType {
  currentUser: User | null;
  loading: boolean;
  isCheckingProfile: boolean;
  signInWithGoogle: () => Promise<void>;
  signUpWithEmail: (email: string, password: string, displayName: string) => Promise<FirebaseUser | null>;
  signInWithEmail: (email: string, password: string) => Promise<FirebaseUser | null>;
  signOut: () => Promise<void>;
  updateUserProfile: (profileData: ProfileFormData) => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const authUnavailableError = () => {
    return { title: "Authentication Error", description: "Authentication service is currently unavailable. Please try again later or contact support.", variant: "destructive" } as const;
}

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isCheckingProfile, setIsCheckingProfile] = useState(true); 
  const router = useRouter();
  const pathname = usePathname();
  const { toast } = useToast();

  const mapFirebaseUserToAppUser = (firebaseUser: FirebaseUser, firestoreData?: Record<string, any>): User => {
    return {
      uid: firebaseUser.uid,
      email: firebaseUser.email,
      displayName: firebaseUser.displayName,
      photoURL: firebaseUser.photoURL,
      ...(firestoreData || {}), 
    };
  };
  
  const refreshUser = useCallback(async () => {
    if (!auth) {
      console.warn("refreshUser: Firebase Auth is not initialized.");
      return null;
    }
    const fbUser = auth.currentUser;
    if (fbUser && db) {
      try {
        const userDocRef = doc(db, "users", fbUser.uid);
        const userDocSnap = await getDoc(userDocRef);
        if (userDocSnap.exists()) {
          const firestoreData = userDocSnap.data();
          const updatedAppUser = mapFirebaseUserToAppUser(fbUser, firestoreData);
          setCurrentUser(updatedAppUser);
          return updatedAppUser;
        } else {
           console.warn(`refreshUser: No user document found for UID: ${fbUser.uid}`);
        }
      } catch (error) {
        console.error("RefreshUser: Error fetching user document:", error);
        // Potentially toast an error if this manual refresh fails visibly
      }
    }
    return null;
  }, [toast]);


  useEffect(() => {
    if (!auth) {
      console.error("AuthContext Effect: Firebase Auth is not initialized. User authentication cannot proceed.");
      // toast(authUnavailableError()); // Avoid toast on initial load if auth is just not ready
      setLoading(false);
      setIsCheckingProfile(false);
      setCurrentUser(null);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setLoading(true);
      setIsCheckingProfile(true);
      try {
        if (firebaseUser) {
          if (!db) {
            console.error("AuthContext: Firestore (db) is not initialized. Cannot fetch user profile data.");
            toast({ title: "Database Error", description: "User profile service is unavailable.", variant: "destructive" });
            const partialUser = mapFirebaseUserToAppUser(firebaseUser);
            setCurrentUser(partialUser);
            // setLoading(false); // Will be handled by finally
            // setIsCheckingProfile(false); // Will be handled by finally
            if (pathname !== '/profile' && pathname !== '/login' && pathname !== '/signup') {
              // router.push('/profile'); 
            }
            return; // Return early, finally will still execute
          }

          try {
            const userDocRef = doc(db, "users", firebaseUser.uid);
            const userDocSnap = await getDoc(userDocRef);
            let appUser: User;

            if (userDocSnap.exists()) {
              const firestoreData = userDocSnap.data();
              appUser = mapFirebaseUserToAppUser(firebaseUser, firestoreData);
            } else {
              const initialUserData: Partial<User> & {createdAt: any, lastLogin: any, isProfileComplete: boolean} = {
                email: firebaseUser.email,
                displayName: firebaseUser.displayName,
                photoURL: firebaseUser.photoURL,
                createdAt: serverTimestamp(),
                lastLogin: serverTimestamp(),
                isProfileComplete: false, 
              };
              try {
                await setDoc(userDocRef, initialUserData, { merge: true });
                
                const userWalletRef = doc(db, "wallets", firebaseUser.uid);
                const walletSnap = await getDoc(userWalletRef);
                if (!walletSnap.exists()) {
                  await setDoc(userWalletRef, { balance: INITIAL_VIRTUAL_BALANCE, userId: firebaseUser.uid });
                }
                appUser = mapFirebaseUserToAppUser(firebaseUser, initialUserData as Record<string, any>);
              } catch (dbError) {
                console.error("AuthContext: Error creating user document or wallet in Firestore:", dbError);
                toast({ title: "Account Setup Error", description: "Could not fully set up your account details.", variant: "destructive"});
                appUser = mapFirebaseUserToAppUser(firebaseUser, {isProfileComplete: false}); 
              }
            }
            setCurrentUser(appUser);
            
            if (!appUser.isProfileComplete && pathname !== '/profile' && pathname !== '/login' && pathname !== '/signup') {
              router.push('/profile');
            } else if (appUser.isProfileComplete && (pathname === '/login' || pathname === '/signup')) {
              router.push('/');
            }
          } catch (firestoreError: any) {
            console.error("AuthContext: Firestore error during onAuthStateChanged user processing:", firestoreError);
            // Avoid toast if it's a network error that might be transient
            if (firestoreError.code !== 'unavailable') {
              toast({ title: "Data Sync Error", description: `Could not sync your profile data: ${firestoreError.message}`, variant: "destructive" });
            }
            const partialUser = mapFirebaseUserToAppUser(firebaseUser, { isProfileComplete: false });
            setCurrentUser(partialUser);
            if (pathname !== '/profile' && pathname !== '/login' && pathname !== '/signup') {
              // router.push('/profile');
            }
          }
        } else {
          setCurrentUser(null);
        }
      } catch (e: any) {
        console.error("AuthContext: Unexpected error in onAuthStateChanged handler:", e);
        toast({ title: "Authentication Error", description: `An unexpected error occurred: ${e.message}`, variant: "destructive" });
        setCurrentUser(null);
      } finally {
        setLoading(false);
        setIsCheckingProfile(false);
      }
    });

    return () => unsubscribe();
  }, [router, pathname, toast]); 

  const signInWithGoogle = async () => {
    if (!auth || !googleProvider) {
      toast(authUnavailableError());
      return;
    }
    setLoading(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const firebaseUser = result.user;
      if (firebaseUser && db) {
         const userDocRef = doc(db, "users", firebaseUser.uid);
         const userDocSnap = await getDoc(userDocRef);
         if (userDocSnap.exists()) { // If user exists, update last login
            await updateDoc(userDocRef, { lastLogin: serverTimestamp() });
         }
         // New user doc creation and profile completion check is handled by onAuthStateChanged
      }
    } catch (error: any) {
      console.error("Error signing in with Google: ", error);
      if(error.code !== 'auth/popup-closed-by-user'){
        toast({ title: "Sign-in Error", description: error.message || "Failed to sign in with Google.", variant: "destructive" });
      }
    } finally {
      // setLoading(false); // onAuthStateChanged will set loading states
    }
  };

  const signUpWithEmail = async (email: string, password: string, displayName: string): Promise<FirebaseUser | null> => {
    if (!auth) {
      toast(authUnavailableError());
      return null;
    }
    if (!db) {
        toast({ title: "Database Error", description: "Account creation service is unavailable.", variant: "destructive" });
        return null;
    }

    setLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const firebaseUser = userCredential.user;

      await updateFirebaseProfile(firebaseUser, { displayName });

      toast({ title: "Account Created!", description: "Welcome! Please complete your profile.", className: "bg-primary text-primary-foreground" });
      return firebaseUser;
    } catch (error: any) {
      console.error("Error signing up with email: ", error);
      const message = error.code === 'auth/email-already-in-use' 
        ? "This email address is already in use. Try logging in."
        : error.code === 'auth/network-request-failed'
        ? "Network error. Please check your connection and try again."
        : error.message || "Failed to create account.";
      toast({ title: "Sign-up Error", description: message, variant: "destructive" });
      return null;
    } finally {
       setLoading(false); // Explicitly set loading false here
    }
  };
  
  const signInWithEmail = async (email: string, password: string): Promise<FirebaseUser | null> => {
    if (!auth) {
      toast(authUnavailableError());
      return null;
    }
     if (!db) {
        toast({ title: "Database Error", description: "Login service is unavailable.", variant: "destructive" });
        return null;
    }
    setLoading(true);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const firebaseUser = userCredential.user;
      const userDocRef = doc(db, "users", firebaseUser.uid);
      await updateDoc(userDocRef, { lastLogin: serverTimestamp() });
      return firebaseUser;
    } catch (error: any) {
      console.error("Error signing in with email: ", error);
      const message = (error.code === 'auth/invalid-credential' || error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password')
        ? "Invalid email or password. Please try again."
        : error.code === 'auth/network-request-failed'
        ? "Network error. Please check your connection and try again."
        : error.message || "Failed to sign in.";
      toast({ title: "Sign-in Error", description: message, variant: "destructive" });
      return null;
    } finally {
      setLoading(false); // Explicitly set loading false here
    }
  };

  const signOut = async () => {
    if (!auth) {
      toast(authUnavailableError());
      return;
    }
    setLoading(true); 
    try {
      await firebaseSignOut(auth);
      router.push('/login'); 
    } catch (error: any) {
      console.error("Error signing out: ", error);
      toast({ title: "Sign-out Error", description: error.message || "Failed to sign out.", variant: "destructive" });
    } finally {
      setLoading(false); // Explicitly set loading false here
    }
  };
  
  const updateUserProfile = async (profileData: ProfileFormData) => {
    if (!auth || !currentUser || !currentUser.uid ) { 
      toast(authUnavailableError());
      return;
    }
    if (!db) {
        toast({ title: "Database Error", description: "Profile update service is unavailable.", variant: "destructive" });
        return;
    }
    setLoading(true);
    setIsCheckingProfile(true);
    try {
      const userDocRef = doc(db, "users", currentUser.uid);
      const fbUser = auth.currentUser; 

      if (!fbUser) { 
        toast({ title: "Error", description: "Session expired. Please log in again.", variant: "destructive" });
        signOut(); 
        return;
      }

      const updateData: Partial<User> = {
        displayName: profileData.displayName,
        photoURL: profileData.photoURL || currentUser.photoURL || fbUser.photoURL || null,
        address: profileData.address,
        dob: profileData.dob,
        bankName: profileData.bankName,
        accountNumber: profileData.accountNumber,
        isProfileComplete: true, 
      };
      
      await updateFirebaseProfile(fbUser, {
        displayName: profileData.displayName,
        photoURL: profileData.photoURL || fbUser.photoURL || null, 
      });
      
      await updateDoc(userDocRef, updateData);
      
      const refreshedUser = await refreshUser(); 
      if (refreshedUser?.isProfileComplete) {
        toast({ title: "Profile Updated", description: "Your profile has been successfully updated.", className: "bg-primary text-primary-foreground" });
        router.push('/'); 
      } else {
         toast({ title: "Profile Update Note", description: "Profile data saved. Refreshing...", variant: "default" });
      }

    } catch (error: any) {
      console.error("Error updating profile:", error);
      toast({ title: "Profile Update Failed", description: error.message || "Could not update your profile.", variant: "destructive" });
    } finally {
      setLoading(false);
      setIsCheckingProfile(false);
    }
  };

  if (loading || (isCheckingProfile && !pathname.startsWith('/login') && !pathname.startsWith('/signup'))) {
    return <LoadingSpinner />; 
  }
  

  return (
    <AuthContext.Provider value={{ currentUser, loading, isCheckingProfile, signInWithGoogle, signUpWithEmail, signInWithEmail, signOut, updateUserProfile, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

