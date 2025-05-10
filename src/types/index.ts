// src/types/index.ts
import type { GameType as LibGameType } from '@/lib/validation'; // Import to re-export

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
  // Consider more structured address if needed:
  // addressLine1?: string;
  // city?: string;
  // postalCode?: string;
  // country?: string;
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

export type GameType = LibGameType; // Re-export GameType

export type PlacedBet = {
  id: string;
  matchId: string; // For sports bets, this is the actual match ID. For game bets, could be a game instance ID.
  matchDescription: string; // e.g., "Team A vs Team B" or "Plane Game Round #123"
  selectedOutcome: string; // e.g., "Team A Win", "Draw", "Cashed out at 2.5x"
  stake: number;
  odds: number; // For sports bets, fixed odds. For game bets, can be initial multiplier or final cash-out multiplier.
  potentialWinnings: number;
  timestamp: Date; // Time the bet was placed or action taken
  matchTime: Date; // Time of the actual match/event (for sports bets)
  status: 'pending' | 'won' | 'lost' | 'withdrawn' | 'cashed_out'; // Added 'cashed_out'
  betType: 'match' | 'game'; // Distinguishes between sports match bets and game bets
  gameType?: GameType; // Specifies the type of game if betType is 'game'
  gameSpecificParams?: Record<string, any>; // Store any game-specific data like target multiplier for plane game
  userId?: string; // To associate bet with a user
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
  photoURL?: string;
  address?: string;
  dob?: string; // YYYY-MM-DD
  bankName?: string;
  accountNumber?: string;
};
