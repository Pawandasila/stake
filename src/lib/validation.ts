// src/lib/validation.ts
import type { PlacedBet } from '@/types';
import { MIN_BET_AMOUNT, MAX_BET_AMOUNT } from '@/lib/constants';
import type { GameType as AppGameType } from '@/types'; // Use GameType from src/types

// Defines the structure for a specific validation error.
export interface ValidationError {
  title: string;
  description: string;
  code?: string; // Optional: for specific error types like 'ALREADY_BET_ON_MATCH'
}

// This will be the standard result type for all validation functions.
export interface ValidationResult {
  isValid: boolean;
  error: ValidationError | null;
}

// Base parameters for any bet/action validation.
export interface BaseValidationParams {
  stake: number;
  currentBalance: number;
  minBetAmount?: number;
  maxBetAmount?: number;
}

// Parameters specific to validating match bets.
export interface MatchBetValidationParams extends BaseValidationParams {
  betType: 'match';
  matchId: string;
  existingBets: PlacedBet[];
  isModalOpening?: boolean; // To differentiate pre-modal check from actual bet placement
}

// Parameters specific to validating game actions.
export interface GameActionValidationParams extends BaseValidationParams {
  gameType: AppGameType;
  actionType: 'place_bet' | 'cash_out' | 'other_action'; // Extend as needed
  gameSpecificParams?: Record<string, any>;
  minTargetMultiplier?: number;
  maxTargetMultiplier?: number;
}

// Validates parameters for placing a bet on a match.
export function validateBetPlacement(params: MatchBetValidationParams): ValidationResult {
  const { stake, currentBalance, existingBets, matchId, minBetAmount = MIN_BET_AMOUNT, maxBetAmount = MAX_BET_AMOUNT } = params;

  if (isNaN(stake) || stake <= 0) {
    return { isValid: false, error: { title: "Invalid Stake", description: "Stake amount must be a positive number." } };
  }
  if (stake < minBetAmount) {
    return { isValid: false, error: { title: "Bet Too Small", description: `Minimum bet amount is ${minBetAmount} units.` } };
  }
  if (stake > maxBetAmount) {
    return { isValid: false, error: { title: "Bet Too Large", description: `Maximum bet amount is ${maxBetAmount} units.` } };
  }
  if (stake > currentBalance) {
    return { isValid: false, error: { title: "Insufficient Balance", description: "You do not have enough funds to place this bet." } };
  }

  const existingBetOnMatch = existingBets.find(
    (bet) => bet.matchId === matchId && bet.status === 'pending' && bet.betType === 'match'
  );
  if (existingBetOnMatch) {
    return {
      isValid: false,
      error: {
        title: "Bet Already Placed",
        description: `You have already placed a bet on the match: ${existingBetOnMatch.matchDescription}. You can only place one bet per match.`,
        code: 'ALREADY_BET_ON_MATCH',
      }
    };
  }

  return { isValid: true, error: null }; // No validation errors
}

// Validates parameters for performing an action within a game.
export function validateGameAction(params: GameActionValidationParams): ValidationResult {
  const { gameType, actionType, stake, currentBalance, minBetAmount = MIN_BET_AMOUNT, maxBetAmount = MAX_BET_AMOUNT, gameSpecificParams, minTargetMultiplier, maxTargetMultiplier } = params;

  if (actionType === 'place_bet') {
    if (isNaN(stake) || stake <= 0) {
      return { isValid: false, error: { title: "Invalid Stake", description: "Stake amount must be a positive number." } };
    }
    if (stake < minBetAmount) {
      return { isValid: false, error: { title: `${gameType} Bet Too Small`, description: `Minimum bet for ${gameType} is ${minBetAmount} units.` } };
    }
    if (stake > maxBetAmount) {
      return { isValid: false, error: { title: `${gameType} Bet Too Large`, description: `Maximum bet for ${gameType} is ${maxBetAmount} units.` } };
    }
    if (stake > currentBalance) {
      return { isValid: false, error: { title: "Insufficient Balance", description: `You do not have enough funds for this ${gameType} bet.` } };
    }

    if (gameType === 'plane' && gameSpecificParams) {
      const targetMultiplierValue = gameSpecificParams.targetMultiplier;
      if (targetMultiplierValue !== undefined && targetMultiplierValue !== null && String(targetMultiplierValue).trim() !== "") {
         const numericTarget = parseFloat(String(targetMultiplierValue));
         if (isNaN(numericTarget)) {
            return { isValid: false, error: { title: "Invalid Target Multiplier", description: "Target multiplier must be a valid number." } };
         }
         if (numericTarget < (minTargetMultiplier || 1.01)) {
           return { isValid: false, error: { title: "Invalid Target Multiplier", description: `Target multiplier must be at least ${minTargetMultiplier || 1.01}.` } };
         }
         if (numericTarget > (maxTargetMultiplier || 100)) {
            return { isValid: false, error: { title: "Invalid Target Multiplier", description: `Target multiplier cannot exceed ${maxTargetMultiplier || 100}.` } };
         }
      }
    }
  }
  // Add more game-specific or action-specific validations here as needed

  return { isValid: true, error: null }; // No validation errors
}
