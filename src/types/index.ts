// src/types/index.ts

export type User = {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  isAdmin?: boolean; // Example for admin role
  isProfileComplete?: boolean;
  address?: string;
  dob?: string; // Store as ISO string (YYYY-MM-DD)
  // Bank details are placeholders for simulation
  bankName?: string;
  accountNumber?: string; 
};

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

export type GameType = 'plane' | 'other_game_type'; // Define specific game types

export type PlacedBet = {
  id: string;
  matchId: string; 
  matchDescription: string; 
  selectedOutcome: string; 
  stake: number;
  odds: number; 
  potentialWinnings: number;
  timestamp: Date; 
  matchTime: Date; 
  status: 'pending' | 'won' | 'lost' | 'withdrawn' | 'cashed_out'; 
  betType: 'match' | 'game'; 
  gameType?: GameType; 
  gameSpecificParams?: Record<string, any>; 
  userId?: string; 
};

export type TeamPerformanceDataPoint = {
  name: string; // e.g., date or opponent
  value: number; // e.g., score, form points
};

export type TeamPerformance = {
  teamId: string;
  data: TeamPerformanceDataPoint[];
};

// For profile form
export type ProfileFormData = {
  displayName: string;
  address?: string;
  dob?: string; // YYYY-MM-DD
  bankName?: string;
  accountNumber?: string;
  photoFile?: File | null; // For new image uploads
  // photoURL is part of User type, not directly form data to be validated for URL format here
  // if file is uploaded, this will be generated.
};
