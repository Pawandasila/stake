// src/lib/validation.ts
import type { PlacedBet } from '@/types';
import { MIN_BET_AMOUNT, MAX_BET_AMOUNT } from '@/lib/constants';

export type GameType = 'plane' | 'dice' | 'roulette'; // Add more game types as needed

interface ValidationError {
  title: string;
  description: string;
}

interface BaseValidationParams {
  stake: number;
  currentBalance: number;
  minBetAmount?: number;
  maxBetAmount?: number;
}
export interface GameActionValidationResult {
  title: string;
  description: string; 
}

interface MatchBetValidationParams extends BaseValidationParams {
  betType: 'match';
  matchId: string;
  existingBets: PlacedBet[];
}

export interface GameActionValidationParams extends BaseValidationParams {
  gameType: GameType;
  actionType: 'place_bet' | 'cash_out' | 'other_action'; // Extend as needed
  // Add any game-specific parameters if necessary for validation
}

type ValidationParams = MatchBetValidationParams | GameActionValidationParams;

export function validateBetPlacement(params: MatchBetValidationParams): GameActionValidationResult | null {
  const { stake, currentBalance, existingBets, matchId, minBetAmount = MIN_BET_AMOUNT, maxBetAmount = MAX_BET_AMOUNT } = params;

  if (isNaN(stake) || stake <= 0) {
    return { title: "Invalid Stake", description: "Stake amount must be a positive number." };
  }
  if (stake < minBetAmount) {
    return { title: "Bet Too Small", description: `Minimum bet amount is ${minBetAmount} units.` };
  }
  if (stake > maxBetAmount) {
    return { title: "Bet Too Large", description: `Maximum bet amount is ${maxBetAmount} units.` };
  }
  if (stake > currentBalance) {
    return { title: "Insufficient Balance", description: "You do not have enough funds to place this bet." };
  }

  // Check if a bet already exists for this specific match (not outcome, but match itself)
  const existingBetOnMatch = existingBets.find(
    (bet) => bet.matchId === matchId && bet.status === 'pending' && bet.betType === 'match'
  );
  if (existingBetOnMatch) {
    return {
      title: "Bet Already Placed",
      description: `You have already placed a bet on the match: ${existingBetOnMatch.matchDescription}. You can only place one bet per match.`,
    };
  }

  return null; // No validation errors
}

export function validateGameAction(params: GameActionValidationParams): GameActionValidationResult | null {
  const { gameType, actionType, stake, currentBalance, minBetAmount = MIN_BET_AMOUNT, maxBetAmount = MAX_BET_AMOUNT } = params;

  if (actionType === 'place_bet') {
    if (isNaN(stake) || stake <= 0) {
      return { title: "Invalid Stake", description: "Stake amount must be a positive number." };
    }
    if (stake < minBetAmount) {
      return { title: `${gameType} Bet Too Small`, description: `Minimum bet for ${gameType} is ${minBetAmount} units.` };
    }
    if (stake > maxBetAmount) {
      return { title: `${gameType} Bet Too Large`, description: `Maximum bet for ${gameType} is ${maxBetAmount} units.` };
    }
    if (stake > currentBalance) {
      return { title: "Insufficient Balance", description: `You do not have enough funds for this ${gameType} bet.` };
    }
  }

  // Add more game-specific or action-specific validations here
  // For example, for 'plane' game:
  if (gameType === 'plane' && actionType === 'place_bet') {
    // Any specific rules for placing a plane game bet
  }

  return null; // No validation errors
}
