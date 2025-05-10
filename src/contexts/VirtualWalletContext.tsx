// src/contexts/VirtualWalletContext.tsx
"use client";

import type { PlacedBet, GameType } from '@/types'; // Updated GameType import
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { INITIAL_VIRTUAL_BALANCE, MIN_BET_AMOUNT, MAX_BET_AMOUNT } from '@/lib/constants';
import { useToast } from '@/hooks/use-toast';
import { v4 as uuidv4 } from 'uuid';
import { validateBetPlacement, validateGameAction } from '@/lib/validation';


const MATCH_RESOLUTION_DELAY_MS = 2 * 60 * 60 * 1000; // 2 hours for mock match duration
const BET_WITHDRAWAL_CUTOFF_MS = 5 * 60 * 1000; // 5 minutes

interface VirtualWalletContextType {
  balance: number;
  bets: PlacedBet[];
  addFunds: (amount: number) => void;
  placeBet: (matchId: string, matchDescription: string, selectedOutcome: string, stake: number, odds: number, matchTime: Date) => boolean;
  placeGameBet: (gameType: GameType, stake: number, gameSpecificParams?: Record<string, any>) => boolean;
  withdrawBet: (betId: string) => void;
  updateBalance: (amount: number) => void; 
}

const VirtualWalletContext = createContext<VirtualWalletContextType | undefined>(undefined);

export const VirtualWalletProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [balance, setBalance] = useState<number>(INITIAL_VIRTUAL_BALANCE);
  const [bets, setBets] = useState<PlacedBet[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    const storedBalance = localStorage.getItem('virtualBalance');
    if (storedBalance) {
      setBalance(parseFloat(storedBalance));
    } else {
      setBalance(INITIAL_VIRTUAL_BALANCE);
    }
    const storedBets = localStorage.getItem('virtualBets');
    if (storedBets) {
      try {
        const parsedBets = JSON.parse(storedBets) as Array<any>;
        setBets(parsedBets.map((bet: any) => ({
          ...bet, 
          timestamp: new Date(bet.timestamp), 
          matchTime: new Date(bet.matchTime), // Ensure matchTime is always a Date object
          betType: bet.betType || 'match', // Default to match if not specified
          gameType: bet.gameType,
          gameSpecificParams: bet.gameSpecificParams
        } as PlacedBet)));
      } catch (error) {
        console.error("Failed to parse bets from localStorage", error);
        setBets([]); 
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('virtualBalance', balance.toString());
  }, [balance]);

  useEffect(() => {
    localStorage.setItem('virtualBets', JSON.stringify(bets));
  }, [bets]);

  const addFunds = useCallback((amount: number) => {
    if (amount <= 0) {
      setTimeout(() => toast({ title: "Invalid Amount", description: "Amount to add must be positive.", variant: "destructive" }), 0);
      return;
    }
    setBalance(prevBalance => parseFloat((prevBalance + amount).toFixed(2)));
    setTimeout(() => toast({ title: "Funds Added", description: `${amount} units added to your balance.`, className: "bg-primary text-primary-foreground" }), 0);
  }, [toast]);
  
  const updateBalance = useCallback((amount: number) => {
    setBalance(prevBalance => parseFloat((prevBalance + amount).toFixed(2)));
  }, []);


  const placeBet = useCallback((matchId: string, matchDescription: string, selectedOutcome: string, stake: number, odds: number, matchTime: Date): boolean => {
    const validationError = validateBetPlacement({
      betType: 'match',
      matchId,
      stake,
      currentBalance: balance,
      existingBets: bets,
      minBetAmount: MIN_BET_AMOUNT,
      maxBetAmount: MAX_BET_AMOUNT,
    });

    if (validationError) {
      setTimeout(() => toast({ title: validationError.title, description: validationError.description, variant: "destructive" }), 0);
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
    };

    setBalance(prevBalance => parseFloat((prevBalance - stake).toFixed(2)));
    setBets(prevBets => [newBet, ...prevBets]);
    setTimeout(() => toast({ title: "Bet Placed!", description: `Successfully placed a ${stake} unit bet on ${selectedOutcome}. Potential win: ${newBet.potentialWinnings.toFixed(2)}.`, className: "bg-primary text-primary-foreground", duration: 3000 }), 0);
    return true;
  }, [balance, bets, toast]);

  const placeGameBet = useCallback((gameType: GameType, stake: number, gameSpecificParams?: Record<string, any>): boolean => {
    const validationError = validateGameAction({
      gameType,
      actionType: 'place_bet',
      stake,
      currentBalance: balance,
      minBetAmount: gameSpecificParams?.minBet ?? MIN_BET_AMOUNT, 
      maxBetAmount: gameSpecificParams?.maxBet ?? MAX_BET_AMOUNT,
    });

    if (validationError) {
        setTimeout(() => toast({ title: validationError.title, description: validationError.description, variant: "destructive" }), 0);
        return false;
    }
    
    const newBet: PlacedBet = {
        id: uuidv4(),
        matchId: `${gameType}-${uuidv4()}`, 
        matchDescription: `${gameType.charAt(0).toUpperCase() + gameType.slice(1)} Game`,
        selectedOutcome: `Bet on ${gameType}`, 
        stake,
        odds: 1, 
        potentialWinnings: stake, 
        timestamp: new Date(),
        matchTime: new Date(), // For game bets, matchTime might be effectively now or not strictly applicable like sports
        status: 'pending', 
        betType: 'game',
        gameType: gameType,
        gameSpecificParams,
    };

    setBalance(prevBalance => parseFloat((prevBalance - stake).toFixed(2)));
    setBets(prevBets => [newBet, ...prevBets]);
    setTimeout(() => toast({ title: "Game Bet Placed!", description: `Successfully placed a ${stake} unit bet on the ${newBet.matchDescription}.`, className: "bg-primary text-primary-foreground", duration: 3000 }), 0);
    return true;
  }, [balance, toast]);


  const withdrawBet = useCallback((betId: string) => {
    const betToWithdraw = bets.find(b => b.id === betId);

    if (!betToWithdraw) {
      setTimeout(() => toast({ title: "Error", description: "Bet not found.", variant: "destructive" }), 0);
      return;
    }

    if (betToWithdraw.betType !== 'match') {
      setTimeout(() => toast({ title: "Withdrawal Failed", description: "This bet type cannot be withdrawn (only match bets).", variant: "destructive" }), 0);
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
      setTimeout(() => toast({ title: "Bet Withdrawn", description: `Your bet on ${betToWithdraw.matchDescription} has been withdrawn. ${betToWithdraw.stake} units refunded.`, className: "bg-primary text-primary-foreground" }), 0);
    } else if (eventTime.getTime() < timeNow) {
      setTimeout(() => toast({ title: "Withdrawal Failed", description: "Cannot withdraw, match has already started or finished.", variant: "destructive" }), 0);
    } else {
      setTimeout(() => toast({ title: "Withdrawal Failed", description: `Cannot withdraw, too close to match start (less than ${BET_WITHDRAWAL_CUTOFF_MS / 60000} minutes).`, variant: "destructive" }), 0);
    }
  }, [bets, toast, setBalance, setBets]);


  const resolveBetsAndUpdateState = useCallback(() => {
    let totalWinningsThisCycle = 0;
    let betsChangedInLoop = false;

    const updatedBets = bets.map(bet => {
        if (bet.betType === 'match' && bet.status === 'pending' && new Date(bet.matchTime).getTime() < Date.now() - MATCH_RESOLUTION_DELAY_MS) {
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
    }
  }, [bets, setBalance, setBets, toast]);

  useEffect(() => {
    const intervalId = setInterval(() => {
        resolveBetsAndUpdateState();
    }, 30000); 

    return () => clearInterval(intervalId);
  }, [resolveBetsAndUpdateState]);


  return (
    <VirtualWalletContext.Provider value={{ balance, bets, addFunds, placeBet, placeGameBet, withdrawBet, updateBalance }}>
      {children}
    </VirtualWalletContext.Provider>
  );
};

export const useVirtualWallet = (): VirtualWalletContextType => {
  const context = useContext(VirtualWalletContext);
  if (context === undefined) {
    throw new Error('useVirtualWallet must be used within a VirtualWalletProvider');
  }
  return context;
};
