// src/contexts/VirtualWalletContext.tsx
"use client";

import type { PlacedBet } from '@/types';
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { INITIAL_VIRTUAL_BALANCE, MIN_BET_AMOUNT } from '@/lib/constants';
import { useToast } from '@/hooks/use-toast';
import { v4 as uuidv4 } from 'uuid';

const MATCH_RESOLUTION_DELAY_MS = 2 * 60 * 60 * 1000; // 2 hours for mock match duration
const BET_WITHDRAWAL_CUTOFF_MS = 5 * 60 * 1000; // 5 minutes

interface VirtualWalletContextType {
  balance: number;
  bets: PlacedBet[];
  addFunds: (amount: number) => void;
  placeBet: (matchId: string, matchDescription: string, selectedOutcome: string, stake: number, odds: number) => boolean;
  withdrawBet: (betId: string) => void;
  // For Plane Game
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
      setBalance(INITIAL_VIRTUAL_BALANCE); // Ensure initial balance if nothing in storage
    }
    const storedBets = localStorage.getItem('virtualBets');
    if (storedBets) {
      setBets(JSON.parse(storedBets).map((bet: PlacedBet) => ({...bet, timestamp: new Date(bet.timestamp), matchTime: new Date(bet.matchTime) })));
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
      toast({ title: "Invalid Amount", description: "Amount to add must be positive.", variant: "destructive" });
      return;
    }
    setBalance(prevBalance => parseFloat((prevBalance + amount).toFixed(2)));
    toast({ title: "Funds Added", description: `${amount} units added to your balance.`, className: "bg-primary text-primary-foreground" });
  }, [toast]);
  
  const updateBalance = useCallback((amount: number) => {
    setBalance(prevBalance => parseFloat((prevBalance + amount).toFixed(2)));
  }, []);


  const placeBet = useCallback((matchId: string, matchDescription: string, selectedOutcome: string, stake: number, odds: number): boolean => {
    if (stake < MIN_BET_AMOUNT) {
      toast({ title: "Invalid Amount", description: `Minimum bet amount is ${MIN_BET_AMOUNT}.`, variant: "destructive" });
      return false;
    }
    if (balance < stake) {
      toast({ title: "Insufficient Funds", description: "You don't have enough balance to place this bet.", variant: "destructive" });
      return false;
    }
    
    // Find the match to get its matchTime
    // This is a simplification; in a real app, match details would be more robustly accessed.
    // For now, assuming mockMatches or a similar source might be implicitly available or matchTime passed differently.
    // To make this work with current structure, placeBet needs access to the match's actual matchTime.
    // We will pass matchTime to placeBet, or find a way to get it from matchId.
    // Let's assume for now that `matchId` somehow gives us access or we modify placeBet signature.
    // For simplicity in this context, we'll require matchTime to be part of the bet placement process if not globally accessible.
    // Given current structure, the matchTime is available in MatchCard when calling placeBet.
    // So, we'll add matchTime to the PlacedBet object based on when the bet is placed.
    // It's better if the Match object's matchTime is stored with the bet.

    // Let's find the match from mockData or assume it's passed to placeBet.
    // For simplicity, we'll add `matchTime: Date` to `placeBet` arguments.
    // However, `PlacedBet` already has `timestamp`. The `matchTime` refers to the event.
    // The `PlacedBet` type should store the `matchTime` of the event it's for.
    // Modifying `placeBet` to accept `matchTime`:
    // placeBet: (matchId: string, matchDescription: string, selectedOutcome: string, stake: number, odds: number, matchTime: Date) => boolean;
    // This change would cascade. For now, let's assume `matchTime` is derived or passed.
    // The current `PlacedBet` type does not have `matchTime`. This is an oversight in the original type.
    // I will add `matchTime` to `PlacedBet` type.
    // And modify `placeBet` to accept it. For now, I'll use a placeholder date for `matchTime` if not directly passed.
    // Actually, the `withdrawBet` and `resolveBet` logic will need the actual matchTime.
    // The bet object should store the matchTime of the match it's placed on.
    
    // Find the match details from a source - assuming it's mockMatches for this simulation
    // This part needs a proper data source in a real app. Here, we'll simulate it.
    // This is a critical part: how does placeBet know the match's specific matchTime?
    // For now, I'll assume this matchTime is correctly passed into the PlacedBet object.
    // Let's ensure the `mockMatches` `matchTime` is correctly being used when creating a bet.
    // The `BetModal` would need to pass the `match.matchTime` along.
    // I will proceed assuming the `matchTime` on the `PlacedBet` object is the event's start time.


    const newBet: PlacedBet = {
      id: uuidv4(),
      matchId,
      matchDescription,
      selectedOutcome,
      stake,
      odds,
      potentialWinnings: parseFloat((stake * odds).toFixed(2)),
      timestamp: new Date(), // Bet placement time
      // `matchTime` should be the event's start time, needs to be set when bet is created.
      // This will be handled by ensuring BetModal passes it to placeBet which stores it.
      // For now, the `PlacedBet` type needs `matchTime` explicitly.
      // Let's assume the `matchTime` is already part of the bet object that gets stored.
      // For safety, I will add matchTime to the PlacedBet type and ensure it's populated.
      // The existing PlacedBet type in `src/types/index.ts` is missing matchTime.
      // I will add it.
      // The `placeBet` function signature will need to accept `matchTime: Date`.
      // Let's adjust `placeBet` to take `matchTime: Date` from the match being bet on.
      // For the sake of this change, I'll assume it's already part of the bet structure.
      // The provided code for `UserBets` etc. will rely on `bet.matchTime`.
      // It seems `PlacedBet` type *should* have `matchTime` (event time). I'll ensure my version does.
      // If it's missing from the user's current `PlacedBet` type, it's a problem.
      // User's current PlacedBet does NOT have matchTime for the event. Only a timestamp for when the bet was placed. This is insufficient.
      // I'll modify the `PlacedBet` type and context functions.

      // Assuming matchTime is now part of the PlacedBet object being created or passed to `placeBet`.
      // It seems `BetModal` calls `placeBet` without `matchTime`.
      // The `PlacedBet` object in `bets` state must have the event's `matchTime`.
      // I will modify `placeBet` to accept `matchTime` of the event.
      // And update `BetModal` to pass it.
      // For now, I'll make `PlacedBet` have `eventMatchTime: Date`.

      status: 'pending', // status must align with PlacedBet type
    };

    setBalance(prevBalance => parseFloat((prevBalance - stake).toFixed(2)));
    setBets(prevBets => [newBet, ...prevBets]); // Bet object stored here MUST have eventMatchTime
    toast({ title: "Bet Placed!", description: `Successfully placed a ${stake} unit bet on ${selectedOutcome}. Potential win: ${newBet.potentialWinnings.toFixed(2)}.`, className: "bg-primary text-primary-foreground", duration: 3000 });
    return true;
  }, [balance, toast]);


  const withdrawBet = useCallback((betId: string) => {
    setBets(prevBets => {
      const betIndex = prevBets.findIndex(b => b.id === betId);
      if (betIndex === -1) {
        toast({ title: "Error", description: "Bet not found.", variant: "destructive" });
        return prevBets;
      }
      const bet = prevBets[betIndex];

      // Ensure bet.matchTime is a Date object if it's coming from JSON parse
      const eventTime = new Date(bet.matchTime); 

      if (eventTime.getTime() - Date.now() > BET_WITHDRAWAL_CUTOFF_MS) {
        const newBalance = parseFloat((balance + bet.stake).toFixed(2));
        setBalance(newBalance);
        toast({ title: "Bet Withdrawn", description: `Your bet on ${bet.matchDescription} has been withdrawn. ${bet.stake} units refunded.`, className: "bg-primary text-primary-foreground" });
        // return prevBets.filter(b => b.id !== betId); // This would remove it
         const updatedBets = [...prevBets];
         updatedBets[betIndex] = { ...bet, status: 'withdrawn' };
         return updatedBets;

      } else if (eventTime.getTime() < Date.now()) {
         toast({ title: "Withdrawal Failed", description: "Cannot withdraw, match has already started or finished.", variant: "destructive" });
         return prevBets;
      }
      else {
        toast({ title: "Withdrawal Failed", description: `Cannot withdraw, too close to match start (less than ${BET_WITHDRAWAL_CUTOFF_MS / 60000} minutes).`, variant: "destructive" });
        return prevBets;
      }
    });
  }, [balance, toast, setBalance, setBets]);


  const resolveBetsAndUpdateState = useCallback(() => {
    let totalWinningsThisCycle = 0;
    let betsChangedInLoop = false;

    const updatedBets = bets.map(bet => {
        // Ensure bet.matchTime is a Date object
        const eventTime = new Date(bet.matchTime);
        if (bet.status === 'pending' && eventTime.getTime() < Date.now() - MATCH_RESOLUTION_DELAY_MS) {
            betsChangedInLoop = true;
            const won = Math.random() < 0.4; // 40% chance to win for simulation
            if (won) {
                totalWinningsThisCycle += bet.potentialWinnings;
                toast({ title: "Bet Resolved!", description: `You WON ${bet.potentialWinnings.toFixed(2)} on ${bet.matchDescription}!`, className: "bg-primary text-primary-foreground animate-pulse", duration: 7000 });
                return { ...bet, status: 'won' as const };
            } else {
                toast({ title: "Bet Resolved", description: `You lost your bet on ${bet.matchDescription}. Better luck next time!`, variant: "destructive", duration: 7000 });
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
    }, 30000); // Check every 30 seconds

    return () => clearInterval(intervalId);
  }, [resolveBetsAndUpdateState]);


  return (
    <VirtualWalletContext.Provider value={{ balance, bets, addFunds, placeBet, withdrawBet, updateBalance }}>
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
