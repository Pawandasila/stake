import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import MatchList from '@/components/matches/MatchList';
import AIRecommendationClient from '@/components/ai/AIRecommendationClient';
import { mockMatches } from '@/lib/mockData';
import UserBets from '@/components/betting/UserBets';
import { Separator } from '@/components/ui/separator';

export default function HomePage() {
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
        <MatchList matches={mockMatches} />

        <Separator className="my-12" />

        {/* AI Recommendation Section */}
        <AIRecommendationClient />
        
        <Separator className="my-12" />

        {/* User's Bets Section */}
        <UserBets />

      </main>
      <Footer />
    </div>
  );
}
