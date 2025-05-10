
"use client"; 

import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import MatchList from '@/components/matches/MatchList';
import AIRecommendationClient from '@/components/ai/AIRecommendationClient';
// import { mockMatches } from '@/lib/mockData'; // Will be replaced with Firestore data
import UserBets from '@/components/betting/UserBets';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ShieldQuestion, Trophy, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import React, { useEffect, useState } from 'react';
import LoadingSpinner from '@/components/layout/LoadingSpinner'; // Replaced general Loading component
import { db } from '@/lib/firebase';
import { collection, getDocs, query, orderBy, limit, Timestamp } from 'firebase/firestore';
import type { Match, Team } from '@/types';


export default function HomePage() {
  const { currentUser, loading: authLoading, isCheckingProfile, firebaseReady } = useAuth();
  const router = useRouter();
  const [matches, setMatches] = useState<Match[]>([]);
  const [matchesLoading, setMatchesLoading] = useState(true);

  useEffect(() => {
    if (!firebaseReady) return; // Wait for Firebase to be ready

    const fetchMatches = async () => {
      if (!db) {
        console.error("HomePage: Firestore (db) is not available for fetching matches.");
        setMatchesLoading(false);
        return;
      }
      setMatchesLoading(true);
      try {
        const matchesCol = collection(db, 'matches');
        // TODO: Add filtering for upcoming matches, e.g., where('matchTime', '>', new Date())
        // For now, just ordering by matchTime and limiting
        const matchesQuery = query(matchesCol, orderBy('matchTime', 'asc'), limit(10));
        const matchSnapshot = await getDocs(matchesQuery);
        const fetchedMatches: Match[] = matchSnapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            teamA: data.teamA as Team, // Assuming team data is stored directly
            teamB: data.teamB as Team, // Or fetch team details if stored as references
            matchTime: (data.matchTime as Timestamp).toDate(),
            sport: data.sport,
            league: data.league,
            odds: data.odds,
          };
        });
        setMatches(fetchedMatches);
      } catch (error) {
        console.error("Error fetching matches:", error);
        // Potentially set an error state to show in UI
      } finally {
        setMatchesLoading(false);
      }
    };

    fetchMatches();
  }, [firebaseReady]); // Depend on firebaseReady

  useEffect(() => {
    if (!authLoading && !isCheckingProfile && firebaseReady) { // Ensure firebase is ready before redirect checks
      if (currentUser && !currentUser.isProfileComplete) {
        router.push('/profile');
      }
    }
  }, [currentUser, authLoading, isCheckingProfile, firebaseReady, router]);


  // Combined loading state determination
  // Show loader if firebase is not ready OR auth is loading OR profile check is in progress OR matches are loading
  const isLoading = !firebaseReady || authLoading || isCheckingProfile || matchesLoading;


  if (isLoading) {
    let message = "Loading Victory Vision...";
    if (!firebaseReady) message = "Initializing services...";
    else if (authLoading) message = "Authenticating...";
    else if (isCheckingProfile) message = "Checking profile...";
    else if (matchesLoading) message = "Fetching matches...";
    return <LoadingSpinner message={message} />;
  }
  
  // If firebase is ready, auth is done, profile checked, but user exists and profile is NOT complete
  // (and previous useEffect for redirect hasn't kicked in fully or was bypassed by direct navigation)
  if (currentUser && !currentUser.isProfileComplete) {
     // This should ideally be caught by the useEffect above, but as a fallback:
     return <LoadingSpinner message="Redirecting to profile..." />;
  }


  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      <Header />
      <main className="flex-grow container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-primary">
            Welcome to Victory Vision
          </h1>
          <p className="mt-3 max-w-2xl mx-auto text-lg md:text-xl text-muted-foreground">
            Analyze matches, simulate your bets, and get AI-powered insights to sharpen your prediction skills.
          </p>
        </div>

        {matches.length > 0 ? (
           <MatchList matches={matches} />
        ) : (
          <div className="text-center py-10 bg-card rounded-lg shadow-md">
            <Trophy className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold text-foreground">No Matches Available</h3>
            <p className="text-muted-foreground">Check back soon for upcoming matches!</p>
          </div>
        )}
        

        <Separator className="my-12" />

        {currentUser ? (
          <>
            <AIRecommendationClient />
            <Separator className="my-12" />
            <UserBets />
          </>
        ) : (
          <div className="text-center p-8 bg-card rounded-lg shadow-lg my-12">
            <ShieldQuestion className="mx-auto h-16 w-16 text-primary mb-4" />
            <h2 className="text-2xl font-semibold text-foreground mb-3">Unlock More Features</h2>
            <p className="text-muted-foreground mb-6">
              Log in or create an account to track your bets, manage your virtual balance, and get personalized AI recommendations.
            </p>
            <div className="flex justify-center gap-4">
              <Link href="/login" passHref legacyBehavior><Button size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground">Log In</Button></Link>
              <Link href="/signup" passHref legacyBehavior><Button variant="outline" size="lg">Sign Up</Button></Link>
            </div>
          </div>
        )}

      </main>
      <Footer />
    </div>
  );
}
