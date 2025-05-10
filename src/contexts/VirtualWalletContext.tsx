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
  placeBet: (matchId: string, matchDescription: string, selectedOutcome: string, stake: number, odds: number, matchTime: Date) => boolean;
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
          matchTime: new Date(bet.matchTime) // Ensure matchTime is converted to Date
        } as PlacedBet)));
      } catch (error) {
        console.error("Failed to parse bets from localStorage", error);
        setBets([]); // Reset to empty array if parsing fails
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
      toast({ title: "Invalid Amount", description: "Amount to add must be positive.", variant: "destructive" });
      return;
    }
    setBalance(prevBalance => parseFloat((prevBalance + amount).toFixed(2)));
    toast({ title: "Funds Added", description: `${amount} units added to your balance.`, className: "bg-primary text-primary-foreground" });
  }, [toast]);
  
  const updateBalance = useCallback((amount: number) => {
    setBalance(prevBalance => parseFloat((prevBalance + amount).toFixed(2)));
  }, []);


  const placeBet = useCallback((matchId: string, matchDescription: string, selectedOutcome: string, stake: number, odds: number, matchTime: Date): boolean => {
    if (stake < MIN_BET_AMOUNT) {
      toast({ title: "Invalid Amount", description: `Minimum bet amount is ${MIN_BET_AMOUNT}.`, variant: "destructive" });
      return false;
    }
    if (balance < stake) {
      toast({ title: "Insufficient Funds", description: "You don't have enough balance to place this bet.", variant: "destructive" });
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
      timestamp: new Date(), // Bet placement time
      matchTime: matchTime, // Store the event's match time
      status: 'pending',
    };

    setBalance(prevBalance => parseFloat((prevBalance - stake).toFixed(2)));
    setBets(prevBets => [newBet, ...prevBets]);
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
      const eventTime = new Date(bet.matchTime); 

      if (eventTime.getTime() - Date.now() > BET_WITHDRAWAL_CUTOFF_MS) {
        const newBalance = parseFloat((balance + bet.stake).toFixed(2));
        setBalance(newBalance);
        toast({ title: "Bet Withdrawn", description: `Your bet on ${bet.matchDescription} has been withdrawn. ${bet.stake} units refunded.`, className: "bg-primary text-primary-foreground" });
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
        const eventTime = new Date(bet.matchTime);
        if (bet.status === 'pending' && eventTime.getTime() < Date.now() - MATCH_RESOLUTION_DELAY_MS) {
            betsChangedInLoop = true;
            const won = Math.random() < 0.4; 
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
    }, 30000); 

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

