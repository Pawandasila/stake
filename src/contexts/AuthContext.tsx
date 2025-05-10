
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
import { auth, googleProvider, db, storage } from '@/lib/firebase'; 
import { doc, setDoc, getDoc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { useRouter, usePathname } from 'next/navigation'; 
import LoadingSpinner from '@/components/layout/LoadingSpinner';
import { useToast } from '@/hooks/use-toast';
import { INITIAL_VIRTUAL_BALANCE } from '@/lib/constants';


interface AuthContextType {
  currentUser: User | null;
  loading: boolean; // True during async auth operations (signin, signup, profile update)
  isCheckingProfile: boolean; // True during initial onAuthStateChanged logic and profile status check
  firebaseReady: boolean; // True if Firebase services (auth, db, storage) are confirmed initialized
  signInWithGoogle: () => Promise<void>;
  signUpWithEmail: (email: string, password: string, displayName: string) => Promise<FirebaseUser | null>;
  signInWithEmail: (email: string, password: string) => Promise<FirebaseUser | null>;
  signOut: () => Promise<void>;
  updateUserProfile: (profileData: ProfileFormData) => Promise<void>;
  refreshUser: () => Promise<User | null>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const authUnavailableError = () => {
    return { title: "Authentication Error", description: "Authentication service is currently unavailable. Please try again later or contact support.", variant: "destructive" } as const;
}
const servicesUnavailableError = () => {
    return { title: "Service Error", description: "Core services are not available. Please check your internet connection or try again later.", variant: "destructive" } as const;
}


export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true); // General loading for async operations
  const [isCheckingProfile, setIsCheckingProfile] = useState(true); // Specific for initial auth/profile check
  const [firebaseReady, setFirebaseReady] = useState(false); // NEW: Tracks Firebase service readiness
  const router = useRouter();
  const pathname = usePathname();
  const { toast } = useToast();

  useEffect(() => {
    // This effect checks if Firebase services are available from firebase.ts
    // It runs once on mount.
    if (auth && db && storage) {
      setFirebaseReady(true);
      console.log('%c[AuthContext] Firebase services confirmed ready.', 'color: green;');
    } else {
      setFirebaseReady(false); // Explicitly set to false if not ready
      console.error('%c[AuthContext] CRITICAL: Firebase services (auth, db, or storage) are NULL. App functionality will be limited. Auth: %o, DB: %o, Storage: %o', 'color: red; font-weight: bold;', auth, db, storage);
      // The global loading spinner will persist due to !firebaseReady
    }
  }, []); // Empty dependency array, runs once to check initial readiness


  const mapFirebaseUserToAppUser = (firebaseUser: FirebaseUser, firestoreData?: Record<string, any>): User => {
    return {
      uid: firebaseUser.uid,
      email: firebaseUser.email,
      displayName: firebaseUser.displayName,
      photoURL: firebaseUser.photoURL,
      isProfileComplete: false, // Default, will be overridden by firestoreData if present
      ...firestoreData, 
    };
  };
  
  const refreshUser = useCallback(async (): Promise<User | null> => {
    if (!firebaseReady || !auth || !db) {
      console.warn("refreshUser: Firebase services not ready or available. Auth: %o, DB: %o", auth, db);
      // Do not toast here as it might be called frequently by other parts.
      // The firebaseReady state should gate operations.
      return null;
    }
    const fbUser = auth.currentUser;
    if (fbUser) {
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
      } catch (error: any) {
        console.error("RefreshUser: Error fetching user document:", error);
        if (error.code === 'unavailable') {
             toast({ title: "Network Issue", description: "Could not refresh user data. Please check your connection.", variant: "destructive" });
        }
      }
    }
    return null;
  }, [firebaseReady, toast]); // Removed auth, db from deps as they are module-level and checked by firebaseReady


  useEffect(() => {
    if (!firebaseReady) { // Wait for Firebase services to be confirmed ready
      setLoading(true); // Keep general loading true
      setIsCheckingProfile(true); // Keep profile checking true
      return;
    }

    // At this point, firebaseReady is true, so auth, db, storage should be non-null.
    // However, a direct check for `auth` before `onAuthStateChanged` is still good practice.
    if (!auth) {
      console.error("AuthContext Effect: Firebase Auth is NULL even after firebaseReady. Authentication cannot proceed.");
      setLoading(false);
      setIsCheckingProfile(false);
      setCurrentUser(null);
      toast(servicesUnavailableError()); // Inform user about critical failure
      return;
    }
    
    console.log('%c[AuthContext] Attaching onAuthStateChanged listener.', 'color: blue;');
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      console.log('%c[AuthContext] onAuthStateChanged triggered. FirebaseUser:', 'color: blue;', firebaseUser ? firebaseUser.uid : null);
      setLoading(true); // For the duration of this async callback
      setIsCheckingProfile(true);
      try {
        if (firebaseUser) {
          if (!db) { // Critical check for db inside the callback too
             console.error("AuthContext/onAuthStateChanged: Firestore (db) is NULL. Cannot process user.");
             toast(servicesUnavailableError());
             setCurrentUser(mapFirebaseUserToAppUser(firebaseUser, {isProfileComplete: false})); // Partial user
             setLoading(false);
             setIsCheckingProfile(false);
             return;
          }
          try {
            const userDocRef = doc(db, "users", firebaseUser.uid);
            const userDocSnap = await getDoc(userDocRef);
            let appUser: User;

            if (userDocSnap.exists()) {
              const firestoreData = userDocSnap.data();
              appUser = mapFirebaseUserToAppUser(firebaseUser, firestoreData);
              console.log('%c[AuthContext] User document exists. AppUser:', 'color: green;', appUser);
            } else {
              console.log('%c[AuthContext] User document does NOT exist. Creating new one for UID:', 'color: orange;', firebaseUser.uid);
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
                  console.log('%c[AuthContext] Initial wallet created for user:', 'color: green;', firebaseUser.uid);
                }
                appUser = mapFirebaseUserToAppUser(firebaseUser, initialUserData as Record<string, any>);
              } catch (dbError: any) {
                console.error("AuthContext: Error creating user document or wallet in Firestore:", dbError);
                toast({ title: "Account Setup Error", description: `Could not fully set up your account details: ${dbError.message}`, variant: "destructive"});
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
            if (firestoreError.code === 'unavailable' || firestoreError.message?.includes('offline')) {
               toast({ title: "Network Sync Issue", description: "Could not sync profile data. Check connection.", variant: "destructive" });
            } else if (firestoreError.code !== 'cancelled') { // Don't toast for query cancellations
              toast({ title: "Data Sync Error", description: `Could not sync your profile data: ${firestoreError.message}`, variant: "destructive" });
            }
            const partialUser = mapFirebaseUserToAppUser(firebaseUser, { isProfileComplete: false }); // Assume incomplete on error
            setCurrentUser(partialUser);
             // Decide on redirection based on partialUser.isProfileComplete
             if (!partialUser.isProfileComplete && pathname !== '/profile' && pathname !== '/login' && pathname !== '/signup') {
                // router.push('/profile'); // Or let user stay if error is transient
             }
          }
        } else {
          console.log('%c[AuthContext] No FirebaseUser from onAuthStateChanged. User is signed out.', 'color: blue;');
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

    return () => {
      console.log('%c[AuthContext] Unsubscribing from onAuthStateChanged.', 'color: blue;');
      unsubscribe();
    }
  }, [firebaseReady, router, pathname, toast, refreshUser]); 


  const signInWithGoogle = async () => {
    if (!firebaseReady || !auth || !googleProvider || !db) {
      toast(servicesUnavailableError());
      return;
    }
    setLoading(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const firebaseUser = result.user;
      // User doc update (lastLogin) or creation is handled by onAuthStateChanged effect
      // No need to explicitly call refreshUser or navigate here, onAuthStateChanged will handle it.
      toast({ title: "Signed In!", description: "Successfully signed in with Google.", className: "bg-primary text-primary-foreground" });
    } catch (error: any) {
      console.error("Error signing in with Google: ", error);
      if(error.code !== 'auth/popup-closed-by-user' && error.code !== 'auth/cancelled-popup-request'){
        if (error.code === 'auth/network-request-failed') {
            toast({ title: "Network Error", description: "Please check your connection and try again.", variant: "destructive" });
        } else {
            toast({ title: "Sign-in Error", description: error.message || "Failed to sign in with Google.", variant: "destructive" });
        }
      }
    } finally {
      setLoading(false); // Loading state for the sign-in operation itself
    }
  };

  const signUpWithEmail = async (email: string, password: string, displayName: string): Promise<FirebaseUser | null> => {
    if (!firebaseReady || !auth || !db ) {
      toast(servicesUnavailableError());
      return null;
    }
    setLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const firebaseUser = userCredential.user;

      await updateFirebaseProfile(firebaseUser, { displayName });
      // User doc creation and wallet init is handled by onAuthStateChanged
      toast({ title: "Account Created!", description: "Welcome! Please complete your profile.", className: "bg-primary text-primary-foreground" });
      // onAuthStateChanged will now pick up this new user, create doc, and navigate if needed.
      return firebaseUser;
    } catch (error: any) {
      console.error("Error signing up with email: ", error);
      const message = error.code === 'auth/email-already-in-use' 
        ? "This email address is already in use. Try logging in."
        : error.code === 'auth/network-request-failed'
        ? "Network error. Please check your connection and try again."
        : error.code === 'auth/weak-password'
        ? "Password is too weak. Please choose a stronger password."
        : error.message || "Failed to create account.";
      toast({ title: "Sign-up Error", description: message, variant: "destructive" });
      return null;
    } finally {
       setLoading(false); 
    }
  };
  
  const signInWithEmail = async (email: string, password: string): Promise<FirebaseUser | null> => {
    if (!firebaseReady || !auth || !db) {
      toast(servicesUnavailableError());
      return null;
    }
    setLoading(true);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      // User doc update (lastLogin) is handled by onAuthStateChanged if it checks for existing doc
      // Or we can do it explicitly here after onAuthStateChanged confirms the user
      // For now, let onAuthStateChanged handle it for consistency
      toast({ title: "Signed In!", description: "Successfully signed in with email.", className: "bg-primary text-primary-foreground" });
      return userCredential.user;
    } catch (error: any)      {
      console.error("Error signing in with email: ", error);
      const message = (error.code === 'auth/invalid-credential' || error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-email')
        ? "Invalid email or password. Please try again."
        : error.code === 'auth/network-request-failed'
        ? "Network error. Please check your connection and try again."
        : error.message || "Failed to sign in.";
      toast({ title: "Sign-in Error", description: message, variant: "destructive" });
      return null;
    } finally {
      setLoading(false); 
    }
  };

  const signOut = async () => {
    if (!firebaseReady || !auth) { // Only auth needed for signOut
      toast(servicesUnavailableError());
      return;
    }
    setLoading(true); 
    try {
      await firebaseSignOut(auth);
      // onAuthStateChanged will set currentUser to null and handle redirection via its effect.
      toast({ title: "Signed Out", description: "You have been successfully signed out.", className: "bg-primary text-primary-foreground" });
    } catch (error: any) {
      console.error("Error signing out: ", error);
      toast({ title: "Sign-out Error", description: error.message || "Failed to sign out.", variant: "destructive" });
    } finally {
      setLoading(false); 
    }
  };
  
  const updateUserProfile = async (profileData: ProfileFormData) => {
    if (!firebaseReady || !auth || !currentUser || !currentUser.uid || !db || !storage) { 
      toast(servicesUnavailableError());
      return;
    }
    
    setLoading(true);
    setIsCheckingProfile(true); // Using this to indicate profile update is in progress
    try {
      const userDocRef = doc(db, "users", currentUser.uid);
      const fbUser = auth.currentUser; 

      if (!fbUser) { 
        toast({ title: "Session Error", description: "Session expired. Please log in again.", variant: "destructive" });
        await signOut(); // Attempt to sign out cleanly
        return;
      }

      let photoDownloadURL = fbUser.photoURL || currentUser.photoURL || null; // Prioritize fbUser's live photoURL

      if (profileData.photoFile) {
        console.log('%c[AuthContext] Uploading new profile photo...', 'color: blue;');
        const filePath = `profileImages/${currentUser.uid}/${profileData.photoFile.name}-${Date.now()}`; // Add timestamp for uniqueness
        const storageRef = ref(storage, filePath);
        await uploadBytes(storageRef, profileData.photoFile);
        photoDownloadURL = await getDownloadURL(storageRef);
        console.log('%c[AuthContext] Profile photo uploaded. URL:', 'color: green;', photoDownloadURL);
      }

      const updateData: Partial<User> = {
        displayName: profileData.displayName,
        photoURL: photoDownloadURL,
        address: profileData.address,
        dob: profileData.dob,
        bankName: profileData.bankName,
        accountNumber: profileData.accountNumber,
        isProfileComplete: true, // Mark profile as complete
        updatedAt: serverTimestamp(), // Add an updatedAt timestamp
      };
      
      // Update Firebase Auth profile (displayName, photoURL)
      await updateFirebaseProfile(fbUser, {
        displayName: profileData.displayName,
        photoURL: photoDownloadURL, 
      });
      console.log('%c[AuthContext] Firebase Auth profile updated.', 'color: green;');
      
      // Update Firestore user document
      await updateDoc(userDocRef, updateData);
      console.log('%c[AuthContext] Firestore user document updated.', 'color: green;');
      
      const refreshedAppUser = await refreshUser(); // This will call setCurrentUser
      if (refreshedAppUser?.isProfileComplete) {
        toast({ title: "Profile Updated", description: "Your profile has been successfully updated.", className: "bg-primary text-primary-foreground" });
        router.push('/'); 
      } else {
         // This case should ideally not be hit if update is successful
         toast({ title: "Profile Update Note", description: "Profile data saved. Refreshing to apply changes...", variant: "default" });
      }

    } catch (error: any) {
      console.error("Error updating profile:", error);
      let errorMessage = "Could not update your profile.";
      if (error.code === 'storage/unauthorized') {
        errorMessage = "You're not authorized to upload this file. Check storage rules.";
      } else if (error.code === 'storage/canceled') {
        errorMessage = "File upload was canceled.";
      } else if (error.code === 'unavailable' || error.message?.includes('offline')) {
        errorMessage = "Network error during profile update. Please check connection.";
      } else if (error.message) {
        errorMessage = error.message;
      }
      toast({ title: "Profile Update Failed", description: errorMessage, variant: "destructive" });
    } finally {
      setLoading(false);
      setIsCheckingProfile(false);
    }
  };

  // Global loading spinner logic:
  // Show if Firebase services aren't ready OR
  // if general loading is true (e.g. during sign-in, sign-up, profile update) OR
  // if still checking initial profile status AND user isn't confirmed AND not on an auth page.
  const showGlobalLoader = !firebaseReady || loading || (isCheckingProfile && !currentUser && !['/login', '/signup', '/profile'].includes(pathname));

  if (showGlobalLoader) {
    let loadingMessage = "Loading...";
    if (!firebaseReady) loadingMessage = "Initializing services...";
    else if (loading && (pathname === '/profile' || pathname.startsWith('/auth'))) loadingMessage = "Processing..."; // More specific for certain actions
    else if (loading) loadingMessage = "Loading session...";
    else if (isCheckingProfile) loadingMessage = "Verifying profile...";
    
    return <LoadingSpinner message={loadingMessage} />; 
  }
  

  return (
    <AuthContext.Provider value={{ currentUser, loading, isCheckingProfile, firebaseReady, signInWithGoogle, signUpWithEmail, signInWithEmail, signOut, updateUserProfile, refreshUser }}>
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
