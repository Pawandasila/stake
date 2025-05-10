// src/app/plane-game/page.tsx
"use client";

import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import PlaneGameClient from '@/components/games/PlaneGameClient';
import { Rocket } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import LoadingSpinner from '@/components/layout/LoadingSpinner';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function PlaneGamePage() {
  const { currentUser, loading: authLoading, firebaseReady } = useAuth();
  const router = useRouter(); // Router can be used if redirect logic for non-authed users is needed

  // Optional: Redirect if not logged in, though games might be playable anonymously with local state
  // useEffect(() => {
  //   if (firebaseReady && !authLoading && !currentUser) {
  //     // router.push('/login'); // Example: redirect if login is strictly required
  //   }
  // }, [firebaseReady, authLoading, currentUser, router]);

  if (!firebaseReady || authLoading) { // Ensure services are ready and auth state is resolved
    return <LoadingSpinner message={!firebaseReady ? "Initializing game services..." : "Loading game session..."} />;
  }
  
  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      <Header />
      <main className="flex-grow container max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
         <div className="text-center mb-10">
            <Rocket className="mx-auto h-16 w-16 text-primary mb-4 animate-pulse" />
            <h1 className="text-4xl font-extrabold tracking-tight text-primary">
                Sky High Stakes - Plane Game
            </h1>
            <p className="mt-3 max-w-2xl mx-auto text-lg text-muted-foreground">
                Place your bet and cash out before the plane flies away! Test your nerve and timing.
            </p>
        </div>
        <PlaneGameClient />
      </main>
      <Footer />
    </div>
  );
}
