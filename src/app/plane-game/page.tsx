// src/app/plane-game/page.tsx
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import PlaneGameClient from '@/components/games/PlaneGameClient';
import { Rocket } from 'lucide-react';

export default function PlaneGamePage() {
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
