// src/app/my-bets/page.tsx
"use client";

import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import AllBetsList from '@/components/betting/AllBetsList';
import { Ticket } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import LoadingSpinner from '@/components/layout/LoadingSpinner';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function MyBetsPage() {
  const { currentUser, loading: authLoading, firebaseReady } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (firebaseReady && !authLoading && !currentUser) {
      router.push('/login');
    }
  }, [firebaseReady, authLoading, currentUser, router]);

  if (!firebaseReady || authLoading) {
    return <LoadingSpinner message={!firebaseReady ? "Initializing..." : "Loading session..."} />;
  }

  if (!currentUser) {
    return <LoadingSpinner message="Redirecting to login..." />;
  }

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      <Header />
      <main className="flex-grow container max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-10">
            <Ticket className="mx-auto h-16 w-16 text-primary mb-4" />
            <h1 className="text-4xl font-extrabold tracking-tight text-primary">
                My Simulated Bets
            </h1>
            <p className="mt-3 max-w-2xl mx-auto text-lg text-muted-foreground">
                Review all your past and pending simulated bets. Track your performance and decisions.
            </p>
        </div>
        <AllBetsList />
      </main>
      <Footer />
    </div>
  );
}
