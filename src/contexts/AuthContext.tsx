
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
      ...(firestoreData || {}), // Spread Firestore data which might include isProfileComplete, etc.
    };
  };
  
  const refreshUser = useCallback(async () => {
    const fbUser = auth.currentUser;
    if (fbUser) {
      const userDocRef = doc(db, "users", fbUser.uid);
      const userDocSnap = await getDoc(userDocRef);
      if (userDocSnap.exists()) {
        const firestoreData = userDocSnap.data();
        const updatedAppUser = mapFirebaseUserToAppUser(fbUser, firestoreData);
        setCurrentUser(updatedAppUser);
        return updatedAppUser; // Return for immediate use if needed
      }
    }
    return null;
  }, []);


  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setLoading(true);
      setIsCheckingProfile(true);
      if (firebaseUser) {
        const userDocRef = doc(db, "users", firebaseUser.uid);
        const userDocSnap = await getDoc(userDocRef);
        let appUser: User;

        if (userDocSnap.exists()) {
          const firestoreData = userDocSnap.data();
          appUser = mapFirebaseUserToAppUser(firebaseUser, firestoreData);
        } else {
          // New user (likely via Google Sign-In for the first time)
          const initialUserData: Partial<User> & {createdAt: any, lastLogin: any, isProfileComplete: boolean} = {
            email: firebaseUser.email,
            displayName: firebaseUser.displayName,
            photoURL: firebaseUser.photoURL,
            createdAt: serverTimestamp(),
            lastLogin: serverTimestamp(),
            isProfileComplete: false, // New users must complete profile
          };
          await setDoc(userDocRef, initialUserData, { merge: true });
          
          // Initialize wallet for new user
          const userWalletRef = doc(db, "wallets", firebaseUser.uid);
          const walletSnap = await getDoc(userWalletRef);
          if (!walletSnap.exists()) {
            await setDoc(userWalletRef, { balance: INITIAL_VIRTUAL_BALANCE, userId: firebaseUser.uid });
          }
          appUser = mapFirebaseUserToAppUser(firebaseUser, initialUserData as Record<string, any>);
        }
        setCurrentUser(appUser);
        
        // Profile completion check and redirect
        if (!appUser.isProfileComplete && pathname !== '/profile' && pathname !== '/login' && pathname !== '/signup') {
          router.push('/profile');
        } else if (appUser.isProfileComplete && (pathname === '/login' || pathname === '/signup')) {
          router.push('/');
        }

      } else {
        setCurrentUser(null);
        if (pathname !== '/login' && pathname !== '/signup' && !pathname.startsWith('/auth')) { // Avoid redirect loops
            // router.push('/login'); // Optional: redirect to login if not on public pages
        }
      }
      setLoading(false);
      setIsCheckingProfile(false);
    });

    return () => unsubscribe();
  }, [router, pathname]);

  const signInWithGoogle = async () => {
    setLoading(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const firebaseUser = result.user;
      if (firebaseUser) {
         const userDocRef = doc(db, "users", firebaseUser.uid);
         const userDocSnap = await getDoc(userDocRef);
         if (userDocSnap.exists()) {
            await updateDoc(userDocRef, { lastLogin: serverTimestamp() });
         } else {
            // This case is handled by onAuthStateChanged, which will create the doc
         }
      }
      // onAuthStateChanged will handle setting currentUser and redirection
    } catch (error: any) {
      console.error("Error signing in with Google: ", error);
      toast({ title: "Sign-in Error", description: error.message || "Failed to sign in with Google.", variant: "destructive" });
      setLoading(false);
    }
  };

  const signUpWithEmail = async (email: string, password: string, displayName: string): Promise<FirebaseUser | null> => {
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
        photoURL: firebaseUser.photoURL, // Might be null initially
        createdAt: serverTimestamp(),
        lastLogin: serverTimestamp(),
        isProfileComplete: false,
      };
      await setDoc(userDocRef, initialUserData);

      // Initialize wallet
      const userWalletRef = doc(db, "wallets", firebaseUser.uid);
      await setDoc(userWalletRef, { balance: INITIAL_VIRTUAL_BALANCE, userId: firebaseUser.uid });

      // onAuthStateChanged will handle setting currentUser and redirection to /profile
      toast({ title: "Account Created!", description: "Welcome! Please complete your profile.", className: "bg-primary text-primary-foreground" });
      return firebaseUser;
    } catch (error: any) {
      console.error("Error signing up with email: ", error);
      toast({ title: "Sign-up Error", description: error.message || "Failed to create account.", variant: "destructive" });
      setLoading(false);
      return null;
    }
  };
  
  const signInWithEmail = async (email: string, password: string): Promise<FirebaseUser | null> => {
    setLoading(true);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const firebaseUser = userCredential.user;
      const userDocRef = doc(db, "users", firebaseUser.uid);
      await updateDoc(userDocRef, { lastLogin: serverTimestamp() });
      // onAuthStateChanged will handle setting currentUser and redirection
      return firebaseUser;
    } catch (error: any) {
      console.error("Error signing in with email: ", error);
      toast({ title: "Sign-in Error", description: error.message || "Invalid email or password.", variant: "destructive" });
      setLoading(false);
      return null;
    }
  };

  const signOut = async () => {
    setLoading(true);
    try {
      await firebaseSignOut(auth);
      // onAuthStateChanged will set currentUser to null
      router.push('/login'); // Redirect to login after sign-out
    } catch (error: any) {
      console.error("Error signing out: ", error);
      toast({ title: "Sign-out Error", description: error.message || "Failed to sign out.", variant: "destructive" });
    } finally {
      // setLoading(false); // Handled by onAuthStateChanged
    }
  };
  
  const updateUserProfile = async (profileData: ProfileFormData) => {
    if (!currentUser) {
      toast({ title: "Error", description: "You must be logged in to update your profile.", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const userDocRef = doc(db, "users", currentUser.uid);
      const fbUser = auth.currentUser;

      const updateData: Partial<User> = {
        displayName: profileData.displayName,
        photoURL: profileData.photoURL || currentUser.photoURL || null, // Keep existing if not provided
        address: profileData.address,
        dob: profileData.dob,
        bankName: profileData.bankName,
        accountNumber: profileData.accountNumber,
        isProfileComplete: true, // Mark profile as complete
      };
      
      if (fbUser) {
        await updateFirebaseProfile(fbUser, {
          displayName: profileData.displayName,
          photoURL: profileData.photoURL || fbUser.photoURL,
        });
      }
      
      await updateDoc(userDocRef, updateData);
      await refreshUser(); // Refresh currentUser state with updated data

      toast({ title: "Profile Updated", description: "Your profile has been successfully updated.", className: "bg-primary text-primary-foreground" });
      router.push('/'); // Redirect to home page
    } catch (error: any) {
      console.error("Error updating profile:", error);
      toast({ title: "Profile Update Failed", description: error.message || "Could not update your profile.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };


  if (loading || isCheckingProfile) {
    return <Loading />; 
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
