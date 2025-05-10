// src/contexts/VirtualWalletContext.tsx
"use client";

import type { PlacedBet, GameType as AppGameType } from '@/types';
import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { INITIAL_VIRTUAL_BALANCE } from '@/lib/constants';
import { useToast } from '@/hooks/use-toast';
// import { v4 as uuidv4 } from 'uuid'; // No longer needed as Firestore generates IDs
import { validateBetPlacement, validateGameAction } from '@/lib/validation';
import type { ValidationResult, GameActionValidationParams } from '@/lib/validation';
import { useAuth } from './AuthContext';
import { db } from '@/lib/firebase';
import { doc, getDoc, setDoc, writeBatch, collection, query, where, getDocs, updateDoc, increment, serverTimestamp } from 'firebase/firestore';


const MATCH_RESOLUTION_DELAY_MS = 2 * 60 * 60 * 1000; // 2 hours for mock match duration
const BET_WITHDRAWAL_CUTOFF_MS = 5 * 60 * 1000; // 5 minutes

export interface VirtualWalletContextType {
  balance: number;
  bets: PlacedBet[];
  addFunds: (amount: number) => Promise<void>;
  placeBet: (matchId: string, matchDescription: string, selectedOutcome: string, stake: number, odds: number, matchTime: Date) => Promise<boolean>;
  placeGameBet: (gameType: AppGameType, stake: number, gameSpecificParams?: Record<string, any>) => Promise<boolean>;
  withdrawBet: (betId: string) => Promise<void>;
  updateBalance: (amount: number, description?: string) => void; // This is for local updates, e.g., game wins not involving a "bet" doc
  isLoading: boolean; // Combined loading state
  fetchUserWalletData: (userId: string) => Promise<void>;
}

const VirtualWalletContext = createContext<VirtualWalletContextType | undefined>(undefined);

export const VirtualWalletProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser, loading: authLoading, firebaseReady } = useAuth(); // Use firebaseReady from AuthContext
  const [balance, setBalance] = useState<number>(INITIAL_VIRTUAL_BALANCE);
  const [bets, setBets] = useState<PlacedBet[]>([]);
  const { toast } = useToast();
  const [walletLoading, setWalletLoading] = useState(true); // Specific to wallet data fetching


  const fetchUserWalletData = useCallback(async (userId: string) => {
    if (!firebaseReady) { // Check if Firebase services are ready
      console.warn("VirtualWalletContext (fetchUserWalletData): Firebase services not ready. Skipping fetch.");
      setWalletLoading(false); // Stop loading if services aren't ready
      return;
    }
    if (!db) {
      console.error("VirtualWalletContext (fetchUserWalletData): Firestore (db) is not initialized. Cannot fetch user wallet data.");
      toast({ title: "Database Error", description: "Wallet service is currently unavailable.", variant: "destructive" });
      setBalance(INITIAL_VIRTUAL_BALANCE); 
      setBets([]);
      setWalletLoading(false);
      return;
    }

    console.log(`%c[VirtualWalletContext] Fetching wallet data for user: ${userId}`, 'color: blue;');
    setWalletLoading(true);
    try {
      const userWalletRef = doc(db, "wallets", userId);
      const walletSnap = await getDoc(userWalletRef);
      if (walletSnap.exists()) {
        setBalance(walletSnap.data().balance ?? INITIAL_VIRTUAL_BALANCE); // Use ?? for null/undefined check
        console.log(`%c[VirtualWalletContext] Wallet found. Balance: ${walletSnap.data().balance}`, 'color: green;');
      } else {
        console.log(`%c[VirtualWalletContext] No wallet found for ${userId}. Creating new one.`, 'color: orange;');
        await setDoc(userWalletRef, { balance: INITIAL_VIRTUAL_BALANCE, userId, createdAt: serverTimestamp() });
        setBalance(INITIAL_VIRTUAL_BALANCE);
      }

      const betsQuery = query(collection(db, "bets"), where("userId", "==", userId));
      const betsSnap = await getDocs(betsQuery);
      const userBets = betsSnap.docs.map(docSnap => ({
        id: docSnap.id,
        ...docSnap.data(),
        timestamp: docSnap.data().timestamp.toDate(), // Ensure conversion from Firebase Timestamp
        matchTime: docSnap.data().matchTime.toDate(), // Ensure conversion
      } as PlacedBet));
      setBets(userBets.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));
      console.log(`%c[VirtualWalletContext] Fetched ${userBets.length} bets.`, 'color: green;');

    } catch (error: any) {
      console.error("Error fetching user wallet data:", error);
      if (error.code === 'unavailable' || error.message?.includes('offline')) {
        toast({ title: "Network Issue", description: "Could not load wallet information. Please check your connection.", variant: "destructive" });
      } else {
        toast({ title: "Wallet Error", description: "Could not load wallet information.", variant: "destructive" });
      }
      setBalance(INITIAL_VIRTUAL_BALANCE); 
      setBets([]);
    } finally {
      setWalletLoading(false);
    }
  }, [firebaseReady, toast]); // Added firebaseReady as dependency

  useEffect(() => {
    if (authLoading || !firebaseReady) { // Also wait for firebaseReady
      setWalletLoading(true); 
      return; 
    }
    if (currentUser) {
      fetchUserWalletData(currentUser.uid);
    } else {
      // User signed out or not yet available, reset wallet state
      setBalance(INITIAL_VIRTUAL_BALANCE); 
      setBets([]);
      setWalletLoading(false);
    }
  }, [authLoading, firebaseReady, currentUser, fetchUserWalletData]);


  const addFunds = useCallback(async (amount: number) => {
    if (!firebaseReady || !db) {
        toast({ title: "Service Error", description: "Fund service unavailable. Core services not ready.", variant: "destructive" });
        return;
    }
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
      await updateDoc(userWalletRef, { balance: increment(amount), lastUpdated: serverTimestamp() });
      setBalance(prevBalance => parseFloat((prevBalance + amount).toFixed(2)));
      toast({ title: "Funds Added", description: `${amount} units added to your balance.`, className: "bg-primary text-primary-foreground" });
    } catch (error: any) {
      console.error("Error adding funds:", error);
      const desc = error.code === 'unavailable' ? "Network error. Please try again." : "Failed to add funds.";
      toast({ title: "Error", description: desc, variant: "destructive" });
    }
  }, [currentUser, firebaseReady, toast]);

  // Used by games for direct balance updates without creating a "bet" document
  const updateBalance = useCallback((amount: number, description?: string) => {
    if (!firebaseReady || !db) {
      console.warn("VirtualWalletContext (updateBalance): Core services not ready. Local balance updated, remote sync skipped.");
      setBalance(prevBalance => parseFloat((prevBalance + amount).toFixed(2)));
      if (description) {
        toast({ title: "Balance Updated (Locally)", description, className: "bg-secondary text-secondary-foreground" });
      }
      return; // Do not proceed with Firestore update if services not ready
    }

    setBalance(prevBalance => parseFloat((prevBalance + amount).toFixed(2)));
    if (description) {
       toast({ title: "Balance Updated", description, className: "bg-primary text-primary-foreground" });
    }

    if (currentUser && amount !== 0) { 
        const userWalletRef = doc(db, "wallets", currentUser.uid);
        updateDoc(userWalletRef, { balance: increment(amount), lastUpdated: serverTimestamp() }).catch(err => {
            console.error("Error directly updating balance in Firestore from local updateBalance:", err);
            // Potentially revert local balance change or notify user of sync failure
            if (err.code === 'unavailable') {
                 toast({ title: "Sync Issue", description: "Balance updated locally, but failed to sync with server.", variant: "destructive" });
            }
        });
    }
  }, [currentUser, firebaseReady, toast]);

  const placeBet = useCallback(async (matchId: string, matchDescription: string, selectedOutcome: string, stake: number, odds: number, matchTime: Date): Promise<boolean> => {
     if (!firebaseReady || !db) {
      toast({ title: "Service Error", description: "Betting service unavailable. Core services not ready.", variant: "destructive" });
      return false;
    }
    if (!currentUser) {
      toast({ title: "Login Required", description: "Please log in to place bets.", variant: "destructive" });
      return false;
    }
    
    const validationResult: ValidationResult = validateBetPlacement({
      betType: 'match',
      matchId,
      stake,
      currentBalance: balance,
      existingBets: bets, // Pass current local bets for validation
      minBetAmount: undefined, // Uses default from constants
      maxBetAmount: undefined, // Uses default from constants
      isModalOpening: false, 
    });

    if (!validationResult.isValid && validationResult.error) {
      toast({ title: validationResult.error.title, description: validationResult.error.description, variant: "destructive" });
      return false;
    }

    const newBetData = { // Data to be stored in Firestore, excluding local 'id'
      matchId,
      matchDescription,
      selectedOutcome,
      stake,
      odds,
      potentialWinnings: parseFloat((stake * odds).toFixed(2)),
      timestamp: serverTimestamp(), // Use serverTimestamp for Firestore
      matchTime: matchTime, // Already a Date object, Firestore handles conversion
      status: 'pending',
      betType: 'match' as const, // Ensure correct literal type
      userId: currentUser.uid,
    };

    const userWalletRef = doc(db, "wallets", currentUser.uid);
    const betDocRef = doc(collection(db, "bets")); // Auto-generate ID

    try {
      const batch = writeBatch(db);
      batch.set(betDocRef, newBetData);
      batch.update(userWalletRef, { balance: increment(-stake), lastUpdated: serverTimestamp() });
      await batch.commit();

      // Update local state optimistically AFTER successful commit
      // Convert serverTimestamp placeholder to local Date for UI consistency
      const localBet: PlacedBet = {
        ...newBetData,
        id: betDocRef.id,
        timestamp: new Date(), // Approximate with local time for immediate UI update
        matchTime: new Date(matchTime), // Ensure it's a Date object locally
      };
      setBalance(prevBalance => parseFloat((prevBalance - stake).toFixed(2)));
      setBets(prevBets => [localBet, ...prevBets].sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));
      toast({ title: "Bet Placed!", description: `Successfully placed a ${stake} unit bet on ${selectedOutcome}. Potential win: ${localBet.potentialWinnings.toFixed(2)}.`, className: "bg-primary text-primary-foreground", duration: 3000 });
      return true;
    } catch (error: any) {
      console.error("Error placing bet:", error);
      const desc = error.code === 'unavailable' ? "Network error. Please try again." : "Could not place your bet due to a server error.";
      toast({ title: "Bet Failed", description: desc, variant: "destructive" });
      return false;
    }
  }, [currentUser, balance, bets, firebaseReady, toast]);

  const placeGameBet = useCallback(async (gameType: AppGameType, stake: number, gameSpecificParams?: Record<string, any>): Promise<boolean> => {
    if (!firebaseReady || !db) {
      toast({ title: "Service Error", description: "Game betting service unavailable. Core services not ready.", variant: "destructive" });
      return false;
    }
    if (!currentUser) {
        toast({ title: "Login Required", description: "Please log in to play games.", variant: "destructive" });
        return false;
    }
    
    const validationParams: GameActionValidationParams = {
        gameType,
        actionType: 'place_bet',
        stake,
        currentBalance: balance,
        minBetAmount: gameSpecificParams?.minBet, 
        maxBetAmount: gameSpecificParams?.maxBet,
        gameSpecificParams,
        minTargetMultiplier: gameSpecificParams?.minTargetMultiplier,
        maxTargetMultiplier: gameSpecificParams?.maxTargetMultiplier,
    };
    const validationResult = validateGameAction(validationParams);

    if (!validationResult.isValid && validationResult.error) {
        toast({ title: validationResult.error.title, description: validationResult.error.description, variant: "destructive" });
        return false;
    }

    const userWalletRef = doc(db, "wallets", currentUser.uid);
    try {
      // For game bets, we typically only deduct from balance. Game outcome updates balance later.
      await updateDoc(userWalletRef, { balance: increment(-stake), lastUpdated: serverTimestamp() });
      setBalance(prevBalance => parseFloat((prevBalance - stake).toFixed(2)));
      // No "bet" document is created here; game logic handles wins/losses and updates balance directly via updateBalance.
      toast({ title: `${gameType.charAt(0).toUpperCase() + gameType.slice(1)} Bet Placed!`, description: `Successfully placed a ${stake} unit bet. Good luck!`, className: "bg-primary text-primary-foreground", duration: 3000 });
      return true;
    } catch (error: any) {
        console.error(`Error placing ${gameType} game bet:`, error);
        const desc = error.code === 'unavailable' ? "Network error. Please try again." : `Could not place your ${gameType} bet.`;
        toast({ title: "Game Bet Failed", description: desc, variant: "destructive" });
        return false;
    }
  }, [currentUser, balance, firebaseReady, toast]);


  const withdrawBet = useCallback(async (betId: string) => {
    if (!firebaseReady || !db) {
      toast({ title: "Service Error", description: "Bet withdrawal unavailable. Core services not ready.", variant: "destructive" });
      return;
    }
    if (!currentUser) {
      toast({ title: "Login Required", description: "Please log in to manage bets.", variant: "destructive" });
      return;
    }
    
    const betToWithdraw = bets.find(b => b.id === betId && b.userId === currentUser.uid);

    if (!betToWithdraw) {
      toast({ title: "Error", description: "Bet not found or unauthorized.", variant: "destructive" });
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
      batch.update(betDocRef, { status: 'withdrawn' as const, lastUpdated: serverTimestamp() });
      batch.update(userWalletRef, { balance: increment(betToWithdraw.stake), lastUpdated: serverTimestamp() });
      await batch.commit();

      setBets(prevBets => prevBets.map(b => b.id === betId ? { ...b, status: 'withdrawn' as const } : b));
      setBalance(prevBal => parseFloat((prevBal + betToWithdraw.stake).toFixed(2)));
      toast({ title: "Bet Withdrawn", description: `Bet on ${betToWithdraw.matchDescription} withdrawn. ${betToWithdraw.stake} units refunded.`, className: "bg-primary text-primary-foreground" });
    } catch (error: any) {
      console.error("Error withdrawing bet:", error);
      const desc = error.code === 'unavailable' ? "Network error. Please try again." : "Failed to withdraw bet.";
      toast({ title: "Error", description: desc, variant: "destructive" });
    }
  }, [currentUser, bets, firebaseReady, toast]);
  
  const resolveBetsAndUpdateState = useCallback(async () => {
    if (!firebaseReady || !db || !currentUser || bets.length === 0) {
      // Silently return if services not ready, no user, or no bets.
      if (firebaseReady && db && currentUser && bets.length > 0) {
          console.warn("VirtualWalletContext (resolveBetsAndUpdateState): Conditions not fully met. Skipping bet resolution.");
      }
      return;
    }

    const pendingBetsToResolve = bets.filter(
      bet => bet.userId === currentUser.uid &&
             bet.betType === 'match' &&
             bet.status === 'pending' &&
             new Date(bet.matchTime).getTime() < Date.now() // Resolve if match time has passed (no artificial delay here)
    );

    if (pendingBetsToResolve.length === 0) return;

    console.log(`%c[VirtualWalletContext] Resolving ${pendingBetsToResolve.length} pending bets...`, 'color: blue;');
    const batch = writeBatch(db);
    let totalWinningsThisCycle = 0;
    const updatedBetStatuses: { id: string, status: 'won' | 'lost', winnings?: number }[] = [];

    for (const bet of pendingBetsToResolve) {
      const won = Math.random() < 0.4; // Simulate win/loss (40% win rate)
      const betDocRef = doc(db, "bets", bet.id);
      if (won) {
        batch.update(betDocRef, { status: 'won' as const, lastUpdated: serverTimestamp() });
        totalWinningsThisCycle += bet.potentialWinnings;
        updatedBetStatuses.push({ id: bet.id, status: 'won', winnings: bet.potentialWinnings });
      } else {
        batch.update(betDocRef, { status: 'lost' as const, lastUpdated: serverTimestamp() });
        updatedBetStatuses.push({ id: bet.id, status: 'lost' });
      }
    }

    if (totalWinningsThisCycle > 0) {
      const userWalletRef = doc(db, "wallets", currentUser.uid);
      batch.update(userWalletRef, { balance: increment(totalWinningsThisCycle), lastUpdated: serverTimestamp() });
    }

    try {
      await batch.commit();
      setBets(prevBets =>
        prevBets.map(pb => {
          const resolved = updatedBetStatuses.find(ub => ub.id === pb.id);
          return resolved ? { ...pb, status: resolved.status } : pb;
        }).sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      );
      if (totalWinningsThisCycle > 0) {
        setBalance(prevBalance => parseFloat((prevBalance + totalWinningsThisCycle).toFixed(2)));
      }
      updatedBetStatuses.forEach(ub => {
        const bet = pendingBetsToResolve.find(pb => pb.id === ub.id);
        if(bet){
          const toastOptions: any = { duration: 7000 };
           if(ub.status === 'won'){
             toastOptions.title = "Bet Resolved!";
             toastOptions.description = `You WON ${ub.winnings?.toFixed(2)} on ${bet.matchDescription}!`;
             toastOptions.className = "bg-primary text-primary-foreground animate-pulse";
           } else {
             toastOptions.title = "Bet Resolved";
             toastOptions.description = `You lost your bet on ${bet.matchDescription}. Better luck next time!`;
             toastOptions.variant = "destructive";
           }
           setTimeout(() => toast(toastOptions), Math.random() * 500); // Stagger toasts slightly
        }
      });
      console.log(`%c[VirtualWalletContext] Bets resolved successfully. Winnings this cycle: ${totalWinningsThisCycle}`, 'color: green;');
    } catch (error: any) {
      console.error("Error resolving bets:", error);
      if (error.code === 'unavailable') {
         toast({ title: "Network Issue", description: "Failed to resolve some bets due to network. Will retry.", variant: "destructive" });
      }
    }
  }, [currentUser, bets, firebaseReady, toast]);


  useEffect(() => {
    if (!firebaseReady || authLoading || walletLoading || !db || !currentUser) {
        // If services not ready, or auth is loading, or wallet is loading, or no DB, or no user, don't start interval.
        return;
    }
    
    console.log('%c[VirtualWalletContext] Initializing bet resolution interval.', 'color: blue;');
    // Initial immediate check
    resolveBetsAndUpdateState(); 

    const intervalId = setInterval(() => {
        resolveBetsAndUpdateState();
    }, 60000); // Check every 60 seconds

    return () => {
      console.log('%c[VirtualWalletContext] Clearing bet resolution interval.', 'color: blue;');
      clearInterval(intervalId);
    }
  }, [authLoading, walletLoading, firebaseReady, db, currentUser, resolveBetsAndUpdateState]);


  const contextValue: VirtualWalletContextType = useMemo(() => ({
    balance,
    bets,
    addFunds,
    placeBet,
    placeGameBet,
    withdrawBet,
    updateBalance, 
    isLoading: authLoading || walletLoading || !firebaseReady, //isLoading is true if auth/wallet loading OR firebase not ready
    fetchUserWalletData,
  }), [balance, bets, addFunds, placeBet, placeGameBet, withdrawBet, updateBalance, authLoading, walletLoading, firebaseReady, fetchUserWalletData]);

  return (
    <VirtualWalletContext.Provider value={contextValue}>
      {children}
    </VirtualWalletContext.Provider>
  );
};

export const useVirtualWallet = (): VirtualWalletContextType => {
  const context = useContext(VirtualWalletContext);
  if (context === undefined) {
    throw new Error('useVirtualWallet() hook is being called outside of a <VirtualWalletProvider>. This usually means a component that needs wallet access is not a descendant of VirtualWalletProvider. Please check your component tree.');
  }
  return context;
};
