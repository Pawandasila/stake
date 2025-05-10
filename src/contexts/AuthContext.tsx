
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
import { auth, googleProvider, db } from '@/lib/firebase'; // `auth` here can be null if Firebase init failed
import { doc, setDoc, getDoc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { useRouter, usePathname } from 'next/navigation'; 
import Loading from '@/app/loading';
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
  const [isCheckingProfile, setIsCheckingProfile] = useState(true); // For profile completion check
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
      // console.warn("refreshUser: Firebase Auth is not initialized."); // Already handled by initial onAuthStateChanged
      return null;
    }
    const fbUser = auth.currentUser;
    if (fbUser && db) {
      const userDocRef = doc(db, "users", fbUser.uid);
      const userDocSnap = await getDoc(userDocRef);
      if (userDocSnap.exists()) {
        const firestoreData = userDocSnap.data();
        const updatedAppUser = mapFirebaseUserToAppUser(fbUser, firestoreData);
        setCurrentUser(updatedAppUser);
        return updatedAppUser;
      }
    }
    return null;
  }, []);


  useEffect(() => {
    if (!auth) {
      console.error("AuthContext Effect: Firebase Auth is not initialized. User authentication cannot proceed.");
      toast(authUnavailableError());
      setLoading(false);
      setIsCheckingProfile(false);
      setCurrentUser(null);
      // Optionally, redirect to an error page or show a persistent banner
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setLoading(true);
      setIsCheckingProfile(true);
      if (firebaseUser) {
        if (!db) {
          console.error("AuthContext: Firestore (db) is not initialized. Cannot fetch user profile data.");
          toast({ title: "Database Error", description: "User profile service is unavailable.", variant: "destructive" });
          // Keep the Firebase user but profile might be incomplete
          const partialUser = mapFirebaseUserToAppUser(firebaseUser);
          setCurrentUser(partialUser);
          setLoading(false);
          setIsCheckingProfile(false);
          // Potentially redirect to a degraded experience or error page
          if (pathname !== '/profile' && pathname !== '/login' && pathname !== '/signup') {
            router.push('/profile'); // Force profile if DB is down, as we can't check completeness
          }
          return;
        }

        const userDocRef = doc(db, "users", firebaseUser.uid);
        const userDocSnap = await getDoc(userDocRef);
        let appUser: User;

        if (userDocSnap.exists()) {
          const firestoreData = userDocSnap.data();
          appUser = mapFirebaseUserToAppUser(firebaseUser, firestoreData);
        } else {
          // New user (likely via Google Sign-In for the first time or first email signup)
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
            appUser = mapFirebaseUserToAppUser(firebaseUser, {isProfileComplete: false}); // Assume profile incomplete
          }
        }
        setCurrentUser(appUser);
        
        if (!appUser.isProfileComplete && pathname !== '/profile' && pathname !== '/login' && pathname !== '/signup') {
          router.push('/profile');
        } else if (appUser.isProfileComplete && (pathname === '/login' || pathname === '/signup')) {
          router.push('/');
        }

      } else {
        setCurrentUser(null);
        // No specific redirect here unless desired for all logged-out states
      }
      setLoading(false);
      setIsCheckingProfile(false);
    });

    return () => unsubscribe();
  }, [router, pathname]); // `auth` and `db` are stable or null, so not strictly needed in deps if handled at top

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
         if (userDocSnap.exists()) {
            await updateDoc(userDocRef, { lastLogin: serverTimestamp() });
         }
         // New user doc creation is handled by onAuthStateChanged
      }
    } catch (error: any) {
      console.error("Error signing in with Google: ", error);
      toast({ title: "Sign-in Error", description: error.message || "Failed to sign in with Google.", variant: "destructive" });
    } finally {
      setLoading(false); // onAuthStateChanged will also set loading, but this handles immediate UI feedback on error
    }
  };

  const signUpWithEmail = async (email: string, password: string, displayName: string): Promise<FirebaseUser | null> => {
    if (!auth) {
      toast(authUnavailableError());
      setLoading(false);
      return null;
    }
    if (!db) {
        toast({ title: "Database Error", description: "Account creation service is unavailable.", variant: "destructive" });
        setLoading(false);
        return null;
    }

    setLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const firebaseUser = userCredential.user;

      await updateFirebaseProfile(firebaseUser, { displayName });

      const userDocRef = doc(db, "users", firebaseUser.uid);
      const initialUserData: Partial<User> & {createdAt: any, lastLogin: any, isProfileComplete: boolean} = {
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        displayName: displayName,
        photoURL: firebaseUser.photoURL, 
        createdAt: serverTimestamp(),
        lastLogin: serverTimestamp(),
        isProfileComplete: false,
      };
      await setDoc(userDocRef, initialUserData);

      const userWalletRef = doc(db, "wallets", firebaseUser.uid);
      await setDoc(userWalletRef, { balance: INITIAL_VIRTUAL_BALANCE, userId: firebaseUser.uid });

      toast({ title: "Account Created!", description: "Welcome! Please complete your profile.", className: "bg-primary text-primary-foreground" });
      // onAuthStateChanged will handle setting currentUser and redirection to /profile
      return firebaseUser;
    } catch (error: any) {
      console.error("Error signing up with email: ", error);
      // Firebase often provides good error messages, e.g., auth/email-already-in-use
      const message = error.code === 'auth/email-already-in-use' 
        ? "This email address is already in use. Try logging in."
        : error.message || "Failed to create account.";
      toast({ title: "Sign-up Error", description: message, variant: "destructive" });
      return null;
    } finally {
      setLoading(false);
    }
  };
  
  const signInWithEmail = async (email: string, password: string): Promise<FirebaseUser | null> => {
    if (!auth) {
      toast(authUnavailableError());
      setLoading(false);
      return null;
    }
     if (!db) {
        toast({ title: "Database Error", description: "Login service is unavailable.", variant: "destructive" });
        setLoading(false);
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
        : error.message || "Failed to sign in.";
      toast({ title: "Sign-in Error", description: message, variant: "destructive" });
      return null;
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    if (!auth) {
      toast(authUnavailableError());
      return;
    }
    setLoading(true); // To give feedback, though onAuthStateChanged handles most state changes
    try {
      await firebaseSignOut(auth);
      // onAuthStateChanged will set currentUser to null
      router.push('/login'); 
    } catch (error: any) {
      console.error("Error signing out: ", error);
      toast({ title: "Sign-out Error", description: error.message || "Failed to sign out.", variant: "destructive" });
      setLoading(false); // Ensure loading is false if sign-out itself fails
    }
  };
  
  const updateUserProfile = async (profileData: ProfileFormData) => {
    if (!auth || !currentUser) {
      toast(authUnavailableError());
      return;
    }
    if (!db) {
        toast({ title: "Database Error", description: "Profile update service is unavailable.", variant: "destructive" });
        return;
    }
    setLoading(true);
    try {
      const userDocRef = doc(db, "users", currentUser.uid);
      const fbUser = auth.currentUser; // Get the most current Firebase auth user state

      if (!fbUser) { // Should not happen if currentUser is set, but a safeguard
        toast({ title: "Error", description: "Session expired. Please log in again.", variant: "destructive" });
        setLoading(false);
        signOut(); // Force sign out
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
      
      // Update Firebase Auth profile (displayName, photoURL)
      await updateFirebaseProfile(fbUser, {
        displayName: profileData.displayName,
        photoURL: profileData.photoURL || fbUser.photoURL, 
      });
      
      // Update Firestore document
      await updateDoc(userDocRef, updateData);
      
      // Refresh local currentUser state with merged data
      const refreshedUser = await refreshUser(); 
      if (refreshedUser?.isProfileComplete) {
        toast({ title: "Profile Updated", description: "Your profile has been successfully updated.", className: "bg-primary text-primary-foreground" });
        router.push('/'); 
      } else {
         // This case should ideally not be hit if update was successful
         toast({ title: "Profile Update Note", description: "Profile data saved. Refreshing...", variant: "default" });
      }

    } catch (error: any) {
      console.error("Error updating profile:", error);
      toast({ title: "Profile Update Failed", description: error.message || "Could not update your profile.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  // Show loading indicator if auth or db is not yet confirmed available by useEffect,
  // or if any auth operation is in progress.
  if (auth === undefined || loading || (auth && isCheckingProfile)) {
    return <Loading />; 
  }
  
  // If auth explicitly failed to initialize (is null), show a message or a degraded app state.
  // For now, children will render, but auth operations will fail with toasts.
  // A more robust solution might be a global error boundary or a specific "service unavailable" page.

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
