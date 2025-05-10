// src/app/profile/page.tsx
"use client";

import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import ProfileForm from '@/components/profile/ProfileForm';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { UserCog } from 'lucide-react';
import LoadingSpinner from '@/components/layout/LoadingSpinner';

export default function ProfilePage() {
  const { currentUser, loading: authLoading, isCheckingProfile, firebaseReady, refreshUser } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!firebaseReady) { // Wait for Firebase services to be confirmed ready
      return; 
    }

    // Initial check: if not authLoading, not checking profile, AND no currentUser after firebase is ready -> redirect to login
    if (!authLoading && !isCheckingProfile && !currentUser) {
      console.log("[ProfilePage] No current user after checks, redirecting to login.");
      router.push('/login');
      return; // Important to return after push
    }
    
    // Refresh user data when component mounts AND firebase is ready AND currentUser exists
    // This ensures we have the latest profile status.
    if (currentUser) {
        console.log("[ProfilePage] Firebase ready and current user exists, attempting to refresh user data.");
        refreshUser(); // refreshUser itself will handle setCurrentUser
    }
  }, [firebaseReady, authLoading, isCheckingProfile, currentUser, router, refreshUser]);

  // Global loading state:
  // Show if Firebase services aren't ready OR
  // if general auth loading is true OR
  // if still checking initial profile status.
  if (!firebaseReady || authLoading || isCheckingProfile) {
    let message = "Loading profile...";
    if (!firebaseReady) message = "Initializing services...";
    else if (authLoading) message = "Verifying session...";
    else if (isCheckingProfile) message = "Fetching profile details...";
    return <LoadingSpinner message={message} />;
  }
  
  // If, after all loading is done and firebase is ready, there's still no currentUser,
  // it implies the user is not authenticated. The useEffect above should have redirected.
  // This is a fallback / safeguard.
  if (!currentUser) {
    // This state should ideally be caught by the useEffect redirecting to /login
    console.log("[ProfilePage] Fallback: No current user after all loading states. Showing loader, redirect should occur.");
    return <LoadingSpinner message="Session not found, redirecting..." />;
  }

  // If firebase is ready, auth loading done, profile check done, AND currentUser EXISTS but profile is complete,
  // and user somehow landed on /profile, redirect them to home.
  // This is less critical than the incomplete profile case for / but good for UX.
  // Note: The primary redirect for completed profiles from /login or /signup is handled in those pages or AuthContext.
  // This is more for if a logged-in, profile-complete user types /profile directly.
  // Consider if this redirect is always desired. For now, it's commented out as main concern is incomplete profiles.
  /*
  if (currentUser.isProfileComplete) {
    console.log("[ProfilePage] User profile is complete, redirecting to home.");
    router.push('/');
    return <LoadingSpinner message="Redirecting..." />; // Show loader during redirect
  }
  */


  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      <Header />
      <main className="flex-grow container max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <Card className="shadow-xl">
          <CardHeader className="text-center">
            <UserCog className="mx-auto h-12 w-12 text-primary mb-2" />
            <CardTitle className="text-3xl font-bold">
              {currentUser?.isProfileComplete ? "Update Your Profile" : "Complete Your Profile"}
            </CardTitle>
            <CardDescription>
              {currentUser?.isProfileComplete 
                ? "Keep your information up to date." 
                : "Please fill in your details to complete your registration and access all features."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ProfileForm />
          </CardContent>
        </Card>
      </main>
      <Footer />
    </div>
  );
}
