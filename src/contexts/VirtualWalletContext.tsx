// src/contexts/VirtualWalletContext.tsx
"use client";

import type { PlacedBet, GameType } from '@/types';
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { INITIAL_VIRTUAL_BALANCE, MIN_BET_AMOUNT, MAX_BET_AMOUNT } from '@/lib/constants';
import { useToast } from '@/hooks/use-toast';
import { v4 as uuidv4 } from 'uuid';
import { validateBetPlacement, validateGameAction, type ValidationResultError } from '@/lib/validation';
import { useAuth } from './AuthContext'; // Import useAuth

const MATCH_RESOLUTION_DELAY_MS = 2 * 60 * 60 * 1000; // 2 hours for mock match duration
const BET_WITHDRAWAL_CUTOFF_MS = 5 * 60 * 1000; // 5 minutes

interface VirtualWalletContextType {
  balance: number;
  bets: PlacedBet[];
  addFunds: (amount: number) => void;
  placeBet: (matchId: string, matchDescription: string, selectedOutcome: string, stake: number, odds: number, matchTime: Date) => boolean;
  placeGameBet: (gameType: GameType, stake: number, gameSpecificParams?: Record<string, any>) => boolean;
  withdrawBet: (betId: string) => void;
  updateBalance: (amount: number, description?: string) => void; 
}

const VirtualWalletContext = createContext<VirtualWalletContextType | undefined>(undefined);

export const VirtualWalletProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser } = useAuth(); // Get current user
  const [balance, setBalance] = useState<number>(INITIAL_VIRTUAL_BALANCE);
  const [bets, setBets] = useState<PlacedBet[]>([]);
  const { toast } = useToast();

  // TODO: When Firestore is integrated, balance and bets will be fetched and stored per user.
  // For now, localStorage will be user-agnostic or keyed by a generic ID if no user.
  const storageKeySuffix = currentUser ? `_${currentUser.uid}` : '_guest';

  useEffect(() => {
    const storedBalance = localStorage.getItem(`virtualBalance${storageKeySuffix}`);
    if (storedBalance) {
      setBalance(parseFloat(storedBalance));
    } else {
      setBalance(INITIAL_VIRTUAL_BALANCE);
    }
    const storedBets = localStorage.getItem(`virtualBets${storageKeySuffix}`);
    if (storedBets) {
      try {
        const parsedBets = JSON.parse(storedBets) as Array<any>;
        setBets(parsedBets.map((bet: any) => ({
          ...bet, 
          timestamp: new Date(bet.timestamp), 
          matchTime: new Date(bet.matchTime),
          betType: bet.betType || 'match',
          gameType: bet.gameType,
          gameSpecificParams: bet.gameSpecificParams,
          userId: bet.userId || (currentUser ? currentUser.uid : undefined) // Ensure userId is present
        } as PlacedBet)));
      } catch (error) {
        console.error("Failed to parse bets from localStorage", error);
        setBets([]); 
      }
    } else {
        setBets([]); // Initialize with empty array if nothing in storage
    }
  }, [currentUser, storageKeySuffix]); // Re-run if user changes

  useEffect(() => {
    localStorage.setItem(`virtualBalance${storageKeySuffix}`, balance.toString());
  }, [balance, storageKeySuffix]);

  useEffect(() => {
    localStorage.setItem(`virtualBets${storageKeySuffix}`, JSON.stringify(bets));
  }, [bets, storageKeySuffix]);

  const addFunds = useCallback((amount: number) => {
    if (!currentUser) {
      setTimeout(() => toast({ title: "Login Required", description: "Please log in to add funds.", variant: "destructive" }), 0);
      return;
    }
    if (amount <= 0) {
      setTimeout(() => toast({ title: "Invalid Amount", description: "Amount to add must be positive.", variant: "destructive" }), 0);
      return;
    }
    setBalance(prevBalance => parseFloat((prevBalance + amount).toFixed(2)));
    // TODO: In Firestore, this would be an update to the user's balance field.
    setTimeout(() => toast({ title: "Funds Added", description: `${amount} units added to your balance.`, className: "bg-primary text-primary-foreground" }), 0);
  }, [currentUser, toast]);
  
  const updateBalance = useCallback((amount: number, description?: string) => {
    if (!currentUser && amount < 0) { // Allow guest balance to be reduced (e.g. game bet) but not increased without login
        // For guests, we might allow balance reduction but not addition.
        // Or, if it's a general update (like from game win not tied to logged-in state), handle carefully.
        // For now, we'll mostly assume logged-in for positive balance updates.
    }
    setBalance(prevBalance => parseFloat((prevBalance + amount).toFixed(2)));
    if (description) {
       setTimeout(() => toast({ title: "Balance Updated", description, className: "bg-primary text-primary-foreground" }), 0);
    }
  }, [currentUser, toast]);


  const placeBet = useCallback((matchId: string, matchDescription: string, selectedOutcome: string, stake: number, odds: number, matchTime: Date): boolean => {
    if (!currentUser) {
      setTimeout(() => toast({ title: "Login Required", description: "Please log in to place bets.", variant: "destructive" }), 0);
      return false;
    }
    
    const validationResult = validateBetPlacement({
      betType: 'match',
      matchId,
      stake,
      currentBalance: balance,
      existingBets: bets.filter(b => b.userId === currentUser.uid), // Validate against current user's bets
      minBetAmount: MIN_BET_AMOUNT,
      maxBetAmount: MAX_BET_AMOUNT,
    });

    if (!validationResult.isValid && validationResult.error) {
      setTimeout(() => toast({ title: validationResult.error.title, description: validationResult.error.description, variant: "destructive" }), 0);
      return false;
    }
    
    const newBet: PlacedBet = {
      id: uuidv4(),
      matchId,
      matchDescription,
      selectedOutcome,
      stake,
      odds,
      potentialWinnings: parseFloat((stake * odds).toFixed(2)),
      timestamp: new Date(), 
      matchTime: matchTime, 
      status: 'pending',
      betType: 'match',
      userId: currentUser.uid, // Associate bet with user
    };

    setBalance(prevBalance => parseFloat((prevBalance - stake).toFixed(2)));
    setBets(prevBets => [newBet, ...prevBets]);
    // TODO: In Firestore, create a new bet document in a "bets" collection, associated with the user.
    // TODO: Update user's balance in their Firestore document.
    setTimeout(() => toast({ title: "Bet Placed!", description: `Successfully placed a ${stake} unit bet on ${selectedOutcome}. Potential win: ${newBet.potentialWinnings.toFixed(2)}.`, className: "bg-primary text-primary-foreground", duration: 3000 }), 0);
    return true;
  }, [currentUser, balance, bets, toast]);

  const placeGameBet = useCallback((gameType: GameType, stake: number, gameSpecificParams?: Record<string, any>): boolean => {
    // Allow guest to place game bets, but their balance/bets won't persist across sessions without login.
    // If currentUser exists, associate bet.
    const userIdForBet = currentUser?.uid;

    const validationResult = validateGameAction({
      gameType,
      actionType: 'place_bet',
      stake,
      currentBalance: balance,
      minBetAmount: gameSpecificParams?.minBet ?? MIN_BET_AMOUNT, 
      maxBetAmount: gameSpecificParams?.maxBet ?? MAX_BET_AMOUNT,
      gameSpecificParams, // Pass through for potential specific game validation rules
    });

    if (!validationResult.isValid && validationResult.error) {
        setTimeout(() => toast({ title: validationResult.error.title, description: validationResult.error.description, variant: "destructive" }), 0);
        return false;
    }
    
    const newBet: PlacedBet = {
        id: uuidv4(),
        matchId: `${gameType}-${uuidv4()}`, 
        matchDescription: `${gameType.charAt(0).toUpperCase() + gameType.slice(1)} Game`,
        selectedOutcome: `Bet on ${gameType}`, 
        stake,
        odds: 1, // Placeholder, actual win depends on game logic (e.g., multiplier)
        potentialWinnings: stake, // Placeholder, will be updated by game logic
        timestamp: new Date(),
        matchTime: new Date(), 
        status: 'pending', // Game bets might resolve differently, e.g. 'cashed_out'
        betType: 'game',
        gameType: gameType,
        gameSpecificParams,
        userId: userIdForBet,
    };

    setBalance(prevBalance => parseFloat((prevBalance - stake).toFixed(2)));
    setBets(prevBets => [newBet, ...prevBets]);
    // TODO: If user logged in, store game bet in Firestore.
    setTimeout(() => toast({ title: "Game Bet Placed!", description: `Successfully placed a ${stake} unit bet on the ${newBet.matchDescription}.`, className: "bg-primary text-primary-foreground", duration: 3000 }), 0);
    return true;
  }, [currentUser, balance, toast]);


  const withdrawBet = useCallback((betId: string) => {
    if (!currentUser) {
      setTimeout(() => toast({ title: "Login Required", description: "Please log in to manage your bets.", variant: "destructive" }), 0);
      return;
    }
    const betToWithdraw = bets.find(b => b.id === betId && b.userId === currentUser.uid);

    if (!betToWithdraw) {
      setTimeout(() => toast({ title: "Error", description: "Bet not found or does not belong to you.", variant: "destructive" }), 0);
      return;
    }

    if (betToWithdraw.betType !== 'match') {
      setTimeout(() => toast({ title: "Withdrawal Failed", description: "This bet type cannot be withdrawn.", variant: "destructive" }), 0);
      return;
    }

    if (betToWithdraw.status !== 'pending') {
      setTimeout(() => toast({ title: "Withdrawal Failed", description: `Cannot withdraw bet with status: ${betToWithdraw.status}.`, variant: "destructive" }), 0);
      return;
    }
    
    const eventTime = new Date(betToWithdraw.matchTime);
    const timeNow = Date.now();

    if (eventTime.getTime() - timeNow > BET_WITHDRAWAL_CUTOFF_MS) {
      setBets(prevBets => prevBets.map(b => b.id === betId ? { ...b, status: 'withdrawn' } : b));
      setBalance(prevBal => parseFloat((prevBal + betToWithdraw.stake).toFixed(2)));
      // TODO: Update bet status and user balance in Firestore.
      setTimeout(() => toast({ title: "Bet Withdrawn", description: `Your bet on ${betToWithdraw.matchDescription} has been withdrawn. ${betToWithdraw.stake} units refunded.`, className: "bg-primary text-primary-foreground" }), 0);
    } else if (eventTime.getTime() < timeNow) {
      setTimeout(() => toast({ title: "Withdrawal Failed", description: "Cannot withdraw, match has already started or finished.", variant: "destructive" }), 0);
    } else {
      setTimeout(() => toast({ title: "Withdrawal Failed", description: `Cannot withdraw, too close to match start (less than ${BET_WITHDRAWAL_CUTOFF_MS / 60000} minutes).`, variant: "destructive" }), 0);
    }
  }, [currentUser, bets, toast, setBalance, setBets]);


  const resolveBetsAndUpdateState = useCallback(() => {
    // This logic will need significant updates when using Firestore,
    // potentially moving to Cloud Functions for reliable, server-side resolution.
    // For now, it simulates resolution for local state.
    if (!currentUser) return; // Only resolve bets for logged-in users in this context

    let totalWinningsThisCycle = 0;
    let betsChangedInLoop = false;

    const updatedBets = bets.map(bet => {
        if (bet.userId === currentUser.uid && bet.betType === 'match' && bet.status === 'pending' && new Date(bet.matchTime).getTime() < Date.now() - MATCH_RESOLUTION_DELAY_MS) {
            betsChangedInLoop = true;
            const won = Math.random() < 0.4; 
            if (won) {
                totalWinningsThisCycle += bet.potentialWinnings;
                setTimeout(() => toast({ title: "Bet Resolved!", description: `You WON ${bet.potentialWinnings.toFixed(2)} on ${bet.matchDescription}!`, className: "bg-primary text-primary-foreground animate-pulse", duration: 7000 }), 0);
                return { ...bet, status: 'won' as const };
            } else {
                setTimeout(() => toast({ title: "Bet Resolved", description: `You lost your bet on ${bet.matchDescription}. Better luck next time!`, variant: "destructive", duration: 7000 }), 0);
                return { ...bet, status: 'lost' as const };
            }
        }
        return bet;
    });

    if (betsChangedInLoop) {
        setBets(updatedBets);
        if (totalWinningsThisCycle > 0) {
            setBalance(prevBalance => parseFloat((prevBalance + totalWinningsThisCycle).toFixed(2)));
        }
        // TODO: Batch update bet statuses and user balance in Firestore.
    }
  }, [currentUser, bets, setBalance, setBets, toast]);

  useEffect(() => {
    if (!currentUser) return; // Don't run resolver if no user is logged in
    const intervalId = setInterval(() => {
        resolveBetsAndUpdateState();
    }, 30000); 

    return () => clearInterval(intervalId);
  }, [currentUser, resolveBetsAndUpdateState]);


  return (
    <VirtualWalletContext.Provider value={{ balance, bets: bets.filter(b => !currentUser || b.userId === currentUser.uid), addFunds, placeBet, placeGameBet, withdrawBet, updateBalance }}>
      {children}
    </VirtualWalletContext.Provider>
  );
};

export const useVirtualWallet = (): VirtualWalletContextType => {
  const context = useContext(VirtualWalletContext);
  if (context === undefined) {
    throw new Error('useVirtualWallet must be used within a VirtualWalletProvider');
  }
};
