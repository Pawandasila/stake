// src/components/betting/BetModal.tsx
"use client";

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useVirtualWallet } from '@/contexts/VirtualWalletContext';
import { MIN_BET_AMOUNT, MAX_BET_AMOUNT } from '@/lib/constants';
import GsapAnimatedNumber from '@/components/animations/GsapAnimatedNumber';
import { AlertCircle } from 'lucide-react';

interface BetModalProps {
  isOpen: boolean;
  onClose: () => void;
  matchId: string;
  matchDescription: string;
  selectedOutcomeName: string;
  odds: number;
  eventMatchTime: Date; // Added eventMatchTime
}

const BetModal: React.FC<BetModalProps> = ({
  isOpen,
  onClose,
  matchId,
  matchDescription,
  selectedOutcomeName,
  odds,
  eventMatchTime, // Use eventMatchTime
}) => {
  const [stake, setStake] = useState<number>(MIN_BET_AMOUNT);
  const [potentialWinnings, setPotentialWinnings] = useState<number>(0);
  const { balance, placeBet } = useVirtualWallet();
  const [error, setError] = useState<string>('');

  useEffect(() => {
    if (stake && odds) {
      setPotentialWinnings(parseFloat((stake * odds).toFixed(2)));
    } else {
      setPotentialWinnings(0);
    }
  }, [stake, odds]);

  useEffect(() => {
    if (isOpen) {
      setStake(MIN_BET_AMOUNT);
      setError('');
    }
  }, [isOpen]);
  
  const handleStakeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    if (isNaN(value) || value < 0) {
      setStake(0);
    } else {
      setStake(value);
    }
    setError(''); 
  };

  const validateAndPlaceBet = () => {
    if (stake < MIN_BET_AMOUNT) {
      setError(`Minimum bet amount is ${MIN_BET_AMOUNT}.`);
      return;
    }
    if (stake > MAX_BET_AMOUNT) {
      setError(`Maximum bet amount is ${MAX_BET_AMOUNT}.`);
      return;
    }
    if (stake > balance) {
      setError('Insufficient balance.');
      return;
    }
    setError('');
    
    // Pass eventMatchTime to placeBet
    const success = placeBet(matchId, matchDescription, selectedOutcomeName, stake, odds, eventMatchTime);
    if (success) {
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[480px] bg-card border-border shadow-xl rounded-lg">
        <DialogHeader className="p-6">
          <DialogTitle className="text-2xl font-bold text-primary text-center">Place Your Simulated Bet</DialogTitle>
          <DialogDescription className="text-center text-muted-foreground pt-1">
            You are betting on: <span className="font-semibold text-foreground">{selectedOutcomeName}</span> for {matchDescription} at odds <span className="font-semibold text-foreground">@{odds.toFixed(2)}</span>.
          </DialogDescription>
        </DialogHeader>
        
        <div className="p-6 space-y-6">
          <div className="space-y-2">
            <Label htmlFor="stake-amount" className="text-sm font-medium text-foreground">
              Stake Amount
            </Label>
            <Input
              id="stake-amount"
              type="number"
              value={stake}
              onChange={handleStakeChange}
              min={0}
              step="1"
              className="h-12 text-lg border-input focus:border-primary focus:ring-primary"
            />
            {error && (
              <p className="text-sm text-destructive flex items-center gap-1"><AlertCircle size={14} /> {error}</p>
            )}
          </div>

          <div className="flex justify-center space-x-2">
            {[10, 25, 50, 100].map(amount => (
              <Button key={amount} variant="outline" size="sm" onClick={() => setStake(Math.min(amount, balance))}>
                {amount}
              </Button>
            ))}
             <Button variant="outline" size="sm" onClick={() => setStake(Math.min(MAX_BET_AMOUNT, balance))}>
                Max
              </Button>
          </div>
          
          <div className="text-center space-y-1 p-4 bg-background rounded-md border border-border">
            <p className="text-sm text-muted-foreground">Potential Winnings:</p>
            <p className="text-2xl font-bold text-primary">
              <GsapAnimatedNumber value={potentialWinnings} precision={2} /> units
            </p>
            <p className="text-xs text-muted-foreground">
              Your current balance: <GsapAnimatedNumber value={balance} precision={2} /> units
            </p>
          </div>
        </div>

        <DialogFooter className="p-6 bg-background rounded-b-lg border-t border-border">
          <DialogClose asChild>
            <Button variant="outline" className="w-full sm:w-auto">Cancel</Button>
          </DialogClose>
          <Button
            onClick={validateAndPlaceBet}
            className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-primary-foreground"
            disabled={stake <= 0 || stake > balance || !!error}
          >
            Confirm Bet
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default BetModal;
