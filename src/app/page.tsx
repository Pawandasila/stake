
"use client"; // Making this a client component to use useAuth hook

import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import MatchList from '@/components/matches/MatchList';
import AIRecommendationClient from '@/components/ai/AIRecommendationClient';
import { mockMatches } from '@/lib/mockData'; // Will be replaced with Firestore data
import UserBets from '@/components/betting/UserBets';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ShieldQuestion, Trophy } from 'lucide-react';

export default function HomePage() {
  const { currentUser, loading } = useAuth();

  // If still loading auth state, can show a loader or simplified page
  if (loading) {
    return (
      <div className="flex flex-col min-h-screen bg-background text-foreground">
        <Header />
        <main className="flex-grow flex items-center justify-center">
          <Trophy className="h-16 w-16 animate-spin text-primary" />
        </main>
        <Footer />
      </div>
    );
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

        {/* Matches Section */}
        {/* TODO: Replace mockMatches with data fetched from Firestore */}
        <MatchList matches={mockMatches} />

        <Separator className="my-12" />

        {currentUser ? (
          <>
            {/* AI Recommendation Section - Shown if logged in */}
            <AIRecommendationClient />
            
            <Separator className="my-12" />

            {/* User's Bets Section - Shown if logged in */}
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
