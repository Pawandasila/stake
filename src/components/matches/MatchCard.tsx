// src/components/matches/MatchCard.tsx
"use client";

import type { Match, Team } from '@/types';
import Image from 'next/image';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Clock, Shield, Swords, Trophy, Zap } from 'lucide-react';
import React, { useState, useEffect } from 'react';
import BetModal from '@/components/betting/BetModal';
import { BarChart } from 'lucide-react';
import TeamPerformanceBarChart from '@/components/charts/TeamPerformanceBarChart'; // Assuming this exists
import { mockTeamPerformance } from '@/lib/mockData'; // For chart example

interface MatchCardProps {
  match: Match;
}

const TeamDisplay: React.FC<{ team: Team; odds?: number }> = ({ team, odds }) => (
  <div className="flex flex-col items-center text-center gap-2 flex-1 min-w-0">
    <Image 
      src={team.logo || `https://picsum.photos/seed/${team.id}/60/60`} 
      alt={`${team.name} logo`} 
      width={48} 
      height={48} 
      className="rounded-full object-cover bg-muted"
      data-ai-hint={team.dataAiHint || "team logo"}
    />
    <span className="font-semibold text-sm md:text-base truncate w-full" title={team.name}>{team.name}</span>
    {odds && <span className="text-xs text-primary font-bold">@{odds.toFixed(2)}</span>}
  </div>
);

const MatchCard: React.FC<MatchCardProps> = ({ match }) => {
  const [isBetModalOpen, setIsBetModalOpen] = useState(false);
  const [selectedOutcome, setSelectedOutcome] = useState<{ name: string; odds: number } | null>(null);
  const [showChart, setShowChart] = useState(false);
  const [timeToMatch, setTimeToMatch] = useState('');

  useEffect(() => {
    const calculateTime = () => {
      const now = new Date();
      const diff = match.matchTime.getTime() - now.getTime();
      if (diff <= 0) {
        setTimeToMatch("Live / Finished"); // Or handle live scores
        return;
      }
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      setTimeToMatch(`${hours}h ${minutes}m`);
    };
    calculateTime();
    const interval = setInterval(calculateTime, 60000); // Update every minute
    return () => clearInterval(interval);
  }, [match.matchTime]);

  const handleBetButtonClick = (name: string, odds: number) => {
    setSelectedOutcome({ name, odds });
    setIsBetModalOpen(true);
  };

  const teamAPerformance = mockTeamPerformance.find(p => p.teamId === match.teamA.id);
  const teamBPerformance = mockTeamPerformance.find(p => p.teamId === match.teamB.id);

  const getSportIcon = (sport: string) => {
    switch (sport.toLowerCase()) {
      case 'football': return <Swords className="h-4 w-4 text-muted-foreground" />;
      case 'esports': return <Zap className="h-4 w-4 text-muted-foreground" />;
      case 'basketball': return <Shield className="h-4 w-4 text-muted-foreground" />; // Placeholder, find basketball icon
      default: return <Trophy className="h-4 w-4 text-muted-foreground" />;
    }
  };

  return (
    <Card className="overflow-hidden shadow-lg hover:shadow-primary/20 transition-shadow duration-300 bg-card flex flex-col">
      <CardHeader className="p-4">
        <div className="flex justify-between items-center text-xs text-muted-foreground mb-2">
          <div className="flex items-center gap-1.5">
            {getSportIcon(match.sport)}
            <span>{match.sport} {match.league ? `- ${match.league}` : ''}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Clock className="h-4 w-4" />
            <span>{timeToMatch}</span>
          </div>
        </div>
        <div className="flex items-center justify-around gap-2 md:gap-4">
          <TeamDisplay team={match.teamA} />
          <div className="text-2xl font-bold text-muted-foreground">VS</div>
          <TeamDisplay team={match.teamB} />
        </div>
      </CardHeader>
      
      <CardContent className="p-4 flex-grow">
        {showChart && (teamAPerformance || teamBPerformance) && (
          <div className="mt-4 space-y-3">
            {teamAPerformance && (
              <div>
                <h4 className="text-sm font-semibold mb-1">{match.teamA.name} Recent Performance</h4>
                <TeamPerformanceBarChart data={teamAPerformance.data} barColor="var(--chart-1)" height="100px" />
              </div>
            )}
            {teamBPerformance && (
               <div>
                <h4 className="text-sm font-semibold mb-1">{match.teamB.name} Recent Performance</h4>
                <TeamPerformanceBarChart data={teamBPerformance.data} barColor="var(--chart-2)" height="100px" />
              </div>
            )}
          </div>
        )}
      </CardContent>

      <Separator className="my-0" />
      <CardFooter className="p-3 bg-card/50 grid grid-cols-3 gap-2 items-center">
        <Button 
          variant="outline" 
          className="w-full text-xs md:text-sm py-2 h-auto border-primary/50 hover:bg-primary/10 text-primary"
          onClick={() => handleBetButtonClick(`${match.teamA.name} Win`, match.odds.teamAWin)}
        >
          {match.teamA.name.substring(0,3).toUpperCase()} Wins <span className="font-bold ml-1">@{match.odds.teamAWin.toFixed(2)}</span>
        </Button>
        {match.odds.draw > 0 && ( // Only show draw if applicable
          <Button 
            variant="outline" 
            className="w-full text-xs md:text-sm py-2 h-auto border-muted-foreground/50 hover:bg-secondary/50"
            onClick={() => handleBetButtonClick('Draw', match.odds.draw)}
          >
            Draw <span className="font-bold ml-1">@{match.odds.draw.toFixed(2)}</span>
          </Button>
        )}
         <Button 
          variant="outline" 
          className={`w-full text-xs md:text-sm py-2 h-auto border-primary/50 hover:bg-primary/10 text-primary ${match.odds.draw === 0 ? 'col-start-2' : ''}`} // Adjust grid if no draw
          onClick={() => handleBetButtonClick(`${match.teamB.name} Win`, match.odds.teamBWin)}
        >
          {match.teamB.name.substring(0,3).toUpperCase()} Wins <span className="font-bold ml-1">@{match.odds.teamBWin.toFixed(2)}</span>
        </Button>
        <Button 
            variant="ghost" 
            size="sm"
            className="col-span-3 mt-1 text-muted-foreground hover:text-primary"
            onClick={() => setShowChart(!showChart)}
        >
            <BarChart className="h-4 w-4 mr-2" />
            {showChart ? 'Hide Stats' : 'Show Stats'}
        </Button>
      </CardFooter>

      {isBetModalOpen && selectedOutcome && (
        <BetModal
          isOpen={isBetModalOpen}
          onClose={() => setIsBetModalOpen(false)}
          matchId={match.id}
          matchDescription={`${match.teamA.name} vs ${match.teamB.name}`}
          selectedOutcomeName={selectedOutcome.name}
          odds={selectedOutcome.odds}
        />
      )}
    </Card>
  );
};

export default MatchCard;
