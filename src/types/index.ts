export type Team = {
  id: string;
  name: string;
  logo?: string; // URL or path to logo, can be placeholder
  dataAiHint?: string; // For picsum.photos image placeholder
};

export type Match = {
  id: string;
  teamA: Team;
  teamB: Team;
  matchTime: Date;
  sport: string; // e.g., 'Football', 'Basketball', 'Esports'
  league?: string;
  odds: {
    teamAWin: number;
    draw: number;
    teamBWin: number;
  };
};

export type PlacedBet = {
  id: string;
  matchId: string;
  matchDescription: string; // e.g., "Team A vs Team B"
  selectedOutcome: string; // e.g., "Team A Win", "Draw", "Team B Win"
  stake: number;
  odds: number;
  potentialWinnings: number;
  timestamp: Date;
  status: 'pending' | 'won' | 'lost' | 'withdrawn' | 'cashed_out_early';
};

export type TeamPerformanceDataPoint = {
  name: string; // e.g., date or opponent
  value: number; // e.g., score, form points
};

export type TeamPerformance = {
  teamId: string;
  data: TeamPerformanceDataPoint[];
};
