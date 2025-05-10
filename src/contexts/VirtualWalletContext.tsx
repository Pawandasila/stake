// src/contexts/VirtualWalletContext.tsx
"use client";

import type { PlacedBet } from '@/types';
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { INITIAL_VIRTUAL_BALANCE } from '@/lib/constants';
import { useToast } from '@/hooks/use-toast';
import { v4 as uuidv4 } from 'uuid'; // Needs: npm install uuid && npm install --save-dev @types/uuid

interface VirtualWalletContextType {
  balance: number;
  bets: PlacedBet[];
  placeBet: (matchId: string, matchDescription: string, selectedOutcome: string, stake: number, odds: number) => boolean;
  // Potential future functions: resolveBet, cashOutBet
}

const VirtualWalletContext = createContext<VirtualWalletContextType | undefined>(undefined);

export const VirtualWalletProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [balance, setBalance] = useState<number>(INITIAL_VIRTUAL_BALANCE);
  const [bets, setBets] = useState<PlacedBet[]>([]);
  const { toast } = useToast();

  // Load state from localStorage
  useEffect(() => {
    const storedBalance = localStorage.getItem('virtualBalance');
    if (storedBalance) {
      setBalance(parseFloat(storedBalance));
    }
    const storedBets = localStorage.getItem('virtualBets');
    if (storedBets) {
      setBets(JSON.parse(storedBets));
    }
  }, []);

  // Save state to localStorage
  useEffect(() => {
    localStorage.setItem('virtualBalance', balance.toString());
  }, [balance]);

  useEffect(() => {
    localStorage.setItem('virtualBets', JSON.stringify(bets));
  }, [bets]);

  const placeBet = useCallback((matchId: string, matchDescription: string, selectedOutcome: string, stake: number, odds: number): boolean => {
    if (stake <= 0) {
      toast({ title: "Invalid Amount", description: "Bet amount must be positive.", variant: "destructive" });
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
      timestamp: new Date(),
      status: 'pending',
    };

    setBalance(prevBalance => parseFloat((prevBalance - stake).toFixed(2)));
    setBets(prevBets => [newBet, ...prevBets]);
    toast({ title: "Bet Placed!", description: `Successfully placed a ${stake} unit bet on ${selectedOutcome}. Potential win: ${newBet.potentialWinnings}.`, className: "bg-primary text-primary-foreground" });
    return true;
  }, [balance, toast]);

  return (
    <VirtualWalletContext.Provider value={{ balance, bets, placeBet }}>
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
