// src/contexts/VirtualWalletContext.tsx
"use client";

import type { PlacedBet, GameType as LibGameType } from '@/types';
import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { INITIAL_VIRTUAL_BALANCE } from '@/lib/constants';
import { useToast } from '@/hooks/use-toast';
import { v4 as uuidv4 } from 'uuid';
import { validateBetPlacement, validateGameAction } from '@/lib/validation'; // Assuming this path is correct now
import type { ValidationResult, GameActionValidationParams } from '@/lib/validation';
import { useAuth } from './AuthContext';
import { db } from '@/lib/firebase';
import { doc, getDoc, setDoc, writeBatch, collection, query, where, getDocs, updateDoc, increment } from 'firebase/firestore';
import type { User } from 'firebase/auth';


const MATCH_RESOLUTION_DELAY_MS = 2 * 60 * 60 * 1000; // 2 hours for mock match duration
const BET_WITHDRAWAL_CUTOFF_MS = 5 * 60 * 1000; // 5 minutes

export interface VirtualWalletContextType {
  balance: number;
  bets: PlacedBet[];
  addFunds: (amount: number) => Promise<void>;
  placeBet: (matchId: string, matchDescription: string, selectedOutcome: string, stake: number, odds: number, matchTime: Date) => Promise<boolean>;
  placeGameBet: (gameType: LibGameType, stake: number, gameSpecificParams?: Record<string, any>) => Promise<boolean>;
  withdrawBet: (betId: string) => Promise<void>;
  updateBalance: (amount: number, description?: string) => void; // This is more for direct local updates, use with caution
  isLoading: boolean;
  fetchUserWalletData: (userId: string) => Promise<void>;
}

const VirtualWalletContext = createContext<VirtualWalletContextType | undefined>(undefined);

export const VirtualWalletProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser, loading: authLoading } = useAuth();
  const [balance, setBalance] = useState<number>(INITIAL_VIRTUAL_BALANCE);
  const [bets, setBets] = useState<PlacedBet[]>([]);
  const { toast } = useToast();
  const [walletLoading, setWalletLoading] = useState(true);

  const fetchUserWalletData = useCallback(async (userId: string) => {
    setWalletLoading(true);
    try {
      const userWalletRef = doc(db, "wallets", userId);
      const walletSnap = await getDoc(userWalletRef);
      if (walletSnap.exists()) {
        setBalance(walletSnap.data().balance || INITIAL_VIRTUAL_BALANCE);
      } else {
        await setDoc(userWalletRef, { balance: INITIAL_VIRTUAL_BALANCE, userId });
        setBalance(INITIAL_VIRTUAL_BALANCE);
      }

      const betsQuery = query(collection(db, "bets"), where("userId", "==", userId));
      const betsSnap = await getDocs(betsQuery);
      const userBets = betsSnap.docs.map(docSnap => ({
        id: docSnap.id,
        ...docSnap.data(),
        timestamp: docSnap.data().timestamp.toDate(),
        matchTime: docSnap.data().matchTime.toDate(),
      } as PlacedBet));
      setBets(userBets.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));

    } catch (error) {
      console.error("Error fetching user wallet data:", error);
      toast({ title: "Error", description: "Could not load wallet information.", variant: "destructive" });
      setBalance(INITIAL_VIRTUAL_BALANCE); // Reset to default on error
      setBets([]);
    } finally {
      setWalletLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    if (authLoading) {
      setWalletLoading(true); // Ensure wallet loading state reflects auth loading
      return; // Return early if auth is still loading
    }
    if (currentUser) {
      fetchUserWalletData(currentUser.uid);
    } else {
      // Handle guest user or logged-out state
      setBalance(INITIAL_VIRTUAL_BALANCE); // Or load from guest local storage
      setBets([]);
      setWalletLoading(false);
    }
  }, [authLoading, currentUser, fetchUserWalletData]);


  const addFunds = useCallback(async (amount: number) => {
    if (!currentUser) {
      toast({ title: "Login Required", description: "Please log in to add funds.", variant: "destructive" });
      return;
    }
    if (amount <= 0) {
      toast({ title: "Invalid Amount", description: "Amount to add must be positive.", variant: "destructive" });
      return;
    }

    const userWalletRef = doc(db, "wallets", currentUser.uid);
    try {
      await updateDoc(userWalletRef, { balance: increment(amount) });
      setBalance(prevBalance => parseFloat((prevBalance + amount).toFixed(2)));
      toast({ title: "Funds Added", description: `${amount} units added to your balance.`, className: "bg-primary text-primary-foreground" });
    } catch (error) {
      console.error("Error adding funds:", error);
      toast({ title: "Error", description: "Failed to add funds.", variant: "destructive" });
    }
  }, [currentUser, toast]);

  const updateBalance = useCallback((amount: number, description?: string) => {
    // This is a local-only update, primarily for game logic that doesn't persist bets but affects balance.
    // For persistent balance changes (like winning a match bet), the update should happen via Firestore triggers or server-side logic.
    setBalance(prevBalance => parseFloat((prevBalance + amount).toFixed(2)));
    if (description) {
       toast({ title: "Balance Updated", description, className: "bg-primary text-primary-foreground" });
    }
     // If currentUser exists, also update Firestore for non-bet related direct balance updates
    if (currentUser && amount !== 0) { // Only update if there's a change and a user
        const userWalletRef = doc(db, "wallets", currentUser.uid);
        updateDoc(userWalletRef, { balance: increment(amount) }).catch(err => {
            console.error("Error directly updating balance in Firestore from local updateBalance:", err);
            // Potentially revert local change or notify user
        });
    }
  }, [currentUser, toast]);

  const placeBet = useCallback(async (matchId: string, matchDescription: string, selectedOutcome: string, stake: number, odds: number, matchTime: Date): Promise<boolean> => {
    if (!currentUser) {
      toast({ title: "Login Required", description: "Please log in to place bets.", variant: "destructive" });
      return false;
    }

    const validationResult = validateBetPlacement({
      betType: 'match',
      matchId,
      stake,
      currentBalance: balance,
      existingBets: bets,
      minBetAmount: undefined, // Use default
      maxBetAmount: undefined, // Use default
      isModalOpening: false,
    });

    if (validationResult && validationResult.error) {
      toast({ title: validationResult.error.title, description: validationResult.error.description, variant: "destructive" });
      return false;
    }

    const newBet: Omit<PlacedBet, 'id'> = {
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
      userId: currentUser.uid,
    };

    const userWalletRef = doc(db, "wallets", currentUser.uid);
    const betDocRef = doc(collection(db, "bets")); // Auto-generate ID

    try {
      const batch = writeBatch(db);
      batch.set(betDocRef, newBet);
      batch.update(userWalletRef, { balance: increment(-stake) });
      await batch.commit();

      setBalance(prevBalance => parseFloat((prevBalance - stake).toFixed(2)));
      setBets(prevBets => [{ id: betDocRef.id, ...newBet } as PlacedBet, ...prevBets].sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));
      toast({ title: "Bet Placed!", description: `Successfully placed a ${stake} unit bet on ${selectedOutcome}. Potential win: ${newBet.potentialWinnings.toFixed(2)}.`, className: "bg-primary text-primary-foreground", duration: 3000 });
      return true;
    } catch (error) {
      console.error("Error placing bet:", error);
      toast({ title: "Bet Failed", description: "Could not place your bet due to a server error.", variant: "destructive" });
      return false;
    }
  }, [currentUser, balance, bets, toast]);

  const placeGameBet = useCallback(async (gameType: LibGameType, stake: number, gameSpecificParams?: Record<string, any>): Promise<boolean> => {
    if (!currentUser) {
        toast({ title: "Login Required", description: "Please log in to play games.", variant: "destructive" });
        return false;
    }

    const validationParams: GameActionValidationParams = {
        gameType,
        actionType: 'place_bet',
        stake,
        currentBalance: balance,
        minBetAmount: gameSpecificParams?.minBet, // Pass through game specific limits
        maxBetAmount: gameSpecificParams?.maxBet,
        gameSpecificParams,
    };
    const validationResult = validateGameAction(validationParams);

    if (validationResult && validationResult.error) {
        toast({ title: validationResult.error.title, description: validationResult.error.description, variant: "destructive" });
        return false;
    }

    // For game bets, we might not store them as persistently as match bets,
    // or they might be ephemeral and only affect the balance.
    // Here, we'll deduct balance and assume the game component handles its state.
    const userWalletRef = doc(db, "wallets", currentUser.uid);
    try {
      await updateDoc(userWalletRef, { balance: increment(-stake) });
      setBalance(prevBalance => parseFloat((prevBalance - stake).toFixed(2)));
      // Optionally, log game bet for history, but not adding to main 'bets' state for now unless required
      // This simplifies as game outcomes (win/loss) update balance directly via updateBalance.
      toast({ title: `${gameType.charAt(0).toUpperCase() + gameType.slice(1)} Bet Placed!`, description: `Successfully placed a ${stake} unit bet.`, className: "bg-primary text-primary-foreground", duration: 3000 });
      return true;
    } catch (error) {
        console.error(`Error placing ${gameType} game bet:`, error);
        toast({ title: "Game Bet Failed", description: `Could not place your ${gameType} bet.`, variant: "destructive" });
        return false;
    }
  }, [currentUser, balance, toast]);


  const withdrawBet = useCallback(async (betId: string) => {
    if (!currentUser) {
      toast({ title: "Login Required", description: "Please log in to manage bets.", variant: "destructive" });
      return;
    }
    const betToWithdraw = bets.find(b => b.id === betId && b.userId === currentUser.uid);

    if (!betToWithdraw) {
      toast({ title: "Error", description: "Bet not found.", variant: "destructive" });
      return;
    }
    if (betToWithdraw.betType !== 'match') {
      toast({ title: "Withdrawal Failed", description: "This bet type cannot be withdrawn.", variant: "destructive" });
      return;
    }
    if (betToWithdraw.status !== 'pending') {
      toast({ title: "Withdrawal Failed", description: `Bet is already ${betToWithdraw.status}.`, variant: "destructive" });
      return;
    }

    const eventTime = new Date(betToWithdraw.matchTime).getTime();
    if (eventTime - Date.now() <= BET_WITHDRAWAL_CUTOFF_MS) {
      toast({ title: "Withdrawal Failed", description: `Too close to match start (less than ${BET_WITHDRAWAL_CUTOFF_MS / 60000} mins).`, variant: "destructive" });
      return;
    }

    const betDocRef = doc(db, "bets", betId);
    const userWalletRef = doc(db, "wallets", currentUser.uid);
    try {
      const batch = writeBatch(db);
      batch.update(betDocRef, { status: 'withdrawn' });
      batch.update(userWalletRef, { balance: increment(betToWithdraw.stake) });
      await batch.commit();

      setBets(prevBets => prevBets.map(b => b.id === betId ? { ...b, status: 'withdrawn' as const } : b));
      setBalance(prevBal => parseFloat((prevBal + betToWithdraw.stake).toFixed(2)));
      toast({ title: "Bet Withdrawn", description: `Bet on ${betToWithdraw.matchDescription} withdrawn. ${betToWithdraw.stake} units refunded.`, className: "bg-primary text-primary-foreground" });
    } catch (error) {
      console.error("Error withdrawing bet:", error);
      toast({ title: "Error", description: "Failed to withdraw bet.", variant: "destructive" });
    }
  }, [currentUser, bets, toast]);

  // Note: Bet resolution (pending -> won/lost) should ideally be handled by a backend process (e.g., Cloud Function)
  // to ensure reliability and not depend on the client being open.
  // The client-side resolution below is a simplification for this project.
  const resolveBetsAndUpdateState = useCallback(async () => {
    if (!currentUser || bets.length === 0) return;

    const pendingBetsToResolve = bets.filter(
      bet => bet.userId === currentUser.uid &&
             bet.betType === 'match' &&
             bet.status === 'pending' &&
             new Date(bet.matchTime).getTime() < Date.now() - MATCH_RESOLUTION_DELAY_MS
    );

    if (pendingBetsToResolve.length === 0) return;

    const batch = writeBatch(db);
    let totalWinningsThisCycle = 0;
    const updatedBetStatuses: { id: string, status: 'won' | 'lost', winnings?: number }[] = [];

    for (const bet of pendingBetsToResolve) {
      const won = Math.random() < 0.4; // Simulate win/loss
      const betDocRef = doc(db, "bets", bet.id);
      if (won) {
        batch.update(betDocRef, { status: 'won' });
        totalWinningsThisCycle += bet.potentialWinnings;
        updatedBetStatuses.push({ id: bet.id, status: 'won', winnings: bet.potentialWinnings });
      } else {
        batch.update(betDocRef, { status: 'lost' });
        updatedBetStatuses.push({ id: bet.id, status: 'lost' });
      }
    }

    if (totalWinningsThisCycle > 0) {
      const userWalletRef = doc(db, "wallets", currentUser.uid);
      batch.update(userWalletRef, { balance: increment(totalWinningsThisCycle) });
    }

    try {
      await batch.commit();
      // Update local state after successful Firestore update
      setBets(prevBets =>
        prevBets.map(pb => {
          const resolved = updatedBetStatuses.find(ub => ub.id === pb.id);
          return resolved ? { ...pb, status: resolved.status } : pb;
        }).sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      );
      if (totalWinningsThisCycle > 0) {
        setBalance(prevBalance => parseFloat((prevBalance + totalWinningsThisCycle).toFixed(2)));
      }
      // Show toasts after local state update
      updatedBetStatuses.forEach(ub => {
        const bet = pendingBetsToResolve.find(pb => pb.id === ub.id);
        if(bet){
            if(ub.status === 'won'){
                 setTimeout(() => toast({ title: "Bet Resolved!", description: `You WON ${ub.winnings?.toFixed(2)} on ${bet.matchDescription}!`, className: "bg-primary text-primary-foreground animate-pulse", duration: 7000 }), 0);
            } else {
                 setTimeout(() => toast({ title: "Bet Resolved", description: `You lost your bet on ${bet.matchDescription}. Better luck next time!`, variant: "destructive", duration: 7000 }), 0);
            }
        }
      });

    } catch (error) {
      console.error("Error resolving bets:", error);
    }
  }, [currentUser, bets, toast]);


  useEffect(() => {
    if (!currentUser || authLoading || walletLoading) return;
    const intervalId = setInterval(() => {
        resolveBetsAndUpdateState();
    }, 60000); // Check every minute

    return () => clearInterval(intervalId);
  }, [currentUser, authLoading, walletLoading, resolveBetsAndUpdateState]);


  const contextValue: VirtualWalletContextType = useMemo(() => ({
    balance,
    bets,
    addFunds,
    placeBet,
    placeGameBet,
    withdrawBet,
    updateBalance, // Exposing this for direct local updates if needed by games
    isLoading: authLoading || walletLoading,
    fetchUserWalletData,
  }), [balance, bets, addFunds, placeBet, placeGameBet, withdrawBet, updateBalance, authLoading, walletLoading, fetchUserWalletData]);

  return (
    <VirtualWalletContext.Provider value={contextValue}>
      {children}
    </VirtualWalletContext.Provider>
  );
};

export const useVirtualWallet = (): VirtualWalletContextType => {
  const context = useContext(VirtualWalletContext);
  if (context === undefined) {
    // This error message is more specific now.
    throw new Error('useVirtualWallet() hook is being called outside of a <VirtualWalletProvider>. This usually means a component that needs wallet access is not a descendant of VirtualWalletProvider. Please check your component tree.');
  }
  return context;
};
