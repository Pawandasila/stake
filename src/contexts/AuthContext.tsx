
"use client";

import type { User } from '@/types';
import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { onAuthStateChanged, signOut as firebaseSignOut, signInWithPopup, User as FirebaseUser } from 'firebase/auth';
import { auth, googleProvider, db } from '@/lib/firebase';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { useRouter } from 'next/navigation'; // Using next/navigation for App Router
import Loading from '@/app/loading'; // Assuming you have a global loading component

interface AuthContextType {
  currentUser: User | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const mapFirebaseUserToAppUser = (firebaseUser: FirebaseUser): User => {
    return {
      uid: firebaseUser.uid,
      email: firebaseUser.email,
      displayName: firebaseUser.displayName,
      photoURL: firebaseUser.photoURL,
      // isAdmin: false, // Default, will be overwritten by Firestore data if exists
    };
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const appUser = mapFirebaseUserToAppUser(firebaseUser);
        // Check for user document in Firestore to get additional roles/info
        const userDocRef = doc(db, "users", firebaseUser.uid);
        const userDocSnap = await getDoc(userDocRef);
        if (userDocSnap.exists()) {
          const userData = userDocSnap.data();
          setCurrentUser({ ...appUser, ...userData });
        } else {
          // Create user document if it doesn't exist
          await setDoc(userDocRef, { 
            email: appUser.email, 
            displayName: appUser.displayName, 
            photoURL: appUser.photoURL,
            createdAt: new Date(),
            // Initialize balance here if you manage it per user in Firestore
            // virtualBalance: INITIAL_VIRTUAL_BALANCE 
          }, { merge: true });
          setCurrentUser(appUser);
        }
      } else {
        setCurrentUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    setLoading(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const firebaseUser = result.user;
      if (firebaseUser) {
        const appUser = mapFirebaseUserToAppUser(firebaseUser);
         const userDocRef = doc(db, "users", firebaseUser.uid);
         // Ensure user document is created/updated on sign-in
         await setDoc(userDocRef, { 
            email: appUser.email, 
            displayName: appUser.displayName, 
            photoURL: appUser.photoURL,
            lastLogin: new Date(),
          }, { merge: true });
      }
      // Auth state listener will update currentUser
      router.push('/'); // Redirect to home after successful sign-in
    } catch (error) {
      console.error("Error signing in with Google: ", error);
      // Handle error (e.g., show toast notification)
      setLoading(false);
    }
  };

  const signOut = async () => {
    setLoading(true);
    try {
      await firebaseSignOut(auth);
      // Auth state listener will set currentUser to null
      router.push('/'); // Redirect to home after sign-out
    } catch (error) {
      console.error("Error signing out: ", error);
      // Handle error
    } finally {
      // setLoading(false); // Already handled by onAuthStateChanged
    }
  };

  if (loading) {
    return <Loading />; // Or your preferred global loading indicator
  }

  return (
    <AuthContext.Provider value={{ currentUser, loading, signInWithGoogle, signOut }}>
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
