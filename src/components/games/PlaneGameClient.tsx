// src/components/games/PlaneGameClient.tsx
"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useVirtualWallet } from '@/contexts/VirtualWalletContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, DollarSign, Target, Rocket, TrendingUp, Zap, CheckCircle2, XCircle } from 'lucide-react';
import GsapAnimatedNumber from '../animations/GsapAnimatedNumber';
import { useToast } from '@/hooks/use-toast';

type GamePhase = 'idle' | 'betting' | 'running' | 'crashed' | 'cashed_out';

const MIN_BET = 1;
const MAX_BET = 100;
const MIN_MULTIPLIER_TARGET = 1.01;
const MAX_MULTIPLIER_TARGET = 100; // Max auto cash-out target

const PlaneGameClient = () => {
  const { balance, updateBalance } = useVirtualWallet();
  const { toast } = useToast();

  const [betAmount, setBetAmount] = useState<string>('10');
  const [targetMultiplier, setTargetMultiplier] = useState<string>('2.0');
  const [currentMultiplier, setCurrentMultiplier] = useState<number>(1.0);
  const [gamePhase, setGamePhase] = useState<GamePhase>('idle');
  
  const [crashPoint, setCrashPoint] = useState<number>(0);
  const [message, setMessage] = useState<string>('Place your bet to start the game!');
  const [messageType, setMessageType] = useState<'info' | 'success' | 'error'>('info');

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const gameLogicTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const stopGameInterval = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (gameLogicTimeoutRef.current) {
      clearTimeout(gameLogicTimeoutRef.current);
      gameLogicTimeoutRef.current = null;
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopGameInterval();
    };
  }, [stopGameInterval]);


  const handleBetAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
     if (/^\d*\.?\d{0,2}$/.test(value) || value === '') {
       setBetAmount(value);
    }
  };

  const handleTargetMultiplierChange = (e: React.ChangeEvent<HTMLInputElement>) => {
     const value = e.target.value;
     if (/^\d*\.?\d{0,2}$/.test(value) || value === '') {
       setTargetMultiplier(value);
    }
  };

  const startGame = () => {
    const numericBetAmount = parseFloat(betAmount);
    const numericTargetMultiplier = parseFloat(targetMultiplier);

    if (isNaN(numericBetAmount) || numericBetAmount < MIN_BET || numericBetAmount > MAX_BET) {
      setMessage(`Bet amount must be between ${MIN_BET} and ${MAX_BET}.`);
      setMessageType('error');
      return;
    }
    if (numericBetAmount > balance) {
      setMessage('Insufficient balance for this bet.');
      setMessageType('error');
      return;
    }
    if (isNaN(numericTargetMultiplier) || numericTargetMultiplier < MIN_MULTIPLIER_TARGET || numericTargetMultiplier > MAX_MULTIPLIER_TARGET) {
      setMessage(`Target multiplier must be between ${MIN_MULTIPLIER_TARGET}x and ${MAX_MULTIPLIER_TARGET}x.`);
      setMessageType('error');
      return;
    }

    updateBalance(-numericBetAmount); // Deduct bet amount
    setGamePhase('running');
    setCurrentMultiplier(1.00);
    
    // Determine crash point ( skewed towards lower numbers, but can go high)
    // Example: 60% chance crash < 2x, 30% < 5x, 10% >= 5x
    const randomFactor = Math.random();
    let determinedCrashPoint;
    if (randomFactor < 0.05) determinedCrashPoint = 1.00; // Instant crash 5%
    else if (randomFactor < 0.60) determinedCrashPoint = 1.01 + Math.random() * (2 - 1.01); // up to 2x
    else if (randomFactor < 0.90) determinedCrashPoint = 2 + Math.random() * (5 - 2);   // up to 5x
    else determinedCrashPoint = 5 + Math.random() * (20 - 5); // up to 20x (can be higher)
    
    setCrashPoint(parseFloat(determinedCrashPoint.toFixed(2)));
    setMessage('Plane taking off... Cash out before it flies away!');
    setMessageType('info');

    stopGameInterval(); // Clear any existing intervals

    intervalRef.current = setInterval(() => {
      setCurrentMultiplier(prev => parseFloat((prev + 0.01 + (prev * 0.005)).toFixed(2))); // Slightly accelerating
    }, 100); // Update multiplier faster
  };

  const handleCashOut = useCallback(() => {
    if (gamePhase !== 'running') return;
    stopGameInterval();
    setGamePhase('cashed_out');
    const numericBetAmount = parseFloat(betAmount);
    const winnings = numericBetAmount * currentMultiplier;
    updateBalance(winnings);
    setMessage(`Cashed out at ${currentMultiplier.toFixed(2)}x! You won ${winnings.toFixed(2)} units.`);
    setMessageType('success');
    toast({
      title: "Cashed Out!",
      description: `You won ${winnings.toFixed(2)} units at ${currentMultiplier.toFixed(2)}x.`,
      className: "bg-primary text-primary-foreground",
    });
  }, [gamePhase, betAmount, currentMultiplier, updateBalance, stopGameInterval, toast]);


  useEffect(() => {
    if (gamePhase === 'running') {
      if (currentMultiplier >= crashPoint) {
        stopGameInterval();
        setGamePhase('crashed');
        setMessage(`Oh no! Plane flew away at ${crashPoint.toFixed(2)}x.`);
        setMessageType('error');
        toast({
          title: "Plane Flew Away!",
          description: `Crashed at ${crashPoint.toFixed(2)}x. Better luck next time.`,
          variant: "destructive",
        });
      } else {
        // Auto cash-out if target is met
        const numericTargetMultiplier = parseFloat(targetMultiplier);
        if (!isNaN(numericTargetMultiplier) && currentMultiplier >= numericTargetMultiplier) {
          handleCashOut();
        }
      }
    }
  }, [currentMultiplier, crashPoint, gamePhase, targetMultiplier, handleCashOut, stopGameInterval, toast]);


  const resetGame = () => {
    stopGameInterval();
    setGamePhase('idle');
    setCurrentMultiplier(1.00);
    setMessage('Place your bet to start the game!');
    setMessageType('info');
  };

  const getMessageColor = () => {
    if (messageType === 'success') return 'text-primary';
    if (messageType === 'error') return 'text-destructive';
    return 'text-muted-foreground';
  };

  return (
    <Card className="w-full shadow-xl">
      <CardHeader>
        <div className="flex items-center justify-center gap-2 text-primary mb-2">
            <Rocket size={32} className={gamePhase === 'running' ? 'animate-ping': ''} />
            <CardTitle className="text-3xl font-bold">Plane Game</CardTitle>
        </div>
        <CardDescription className="text-center">
          Current Balance: <GsapAnimatedNumber value={balance} precision={2} /> units
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Game Display */}
        <div className="h-48 flex flex-col items-center justify-center bg-card-foreground/5 rounded-lg p-6 border border-border relative overflow-hidden">
          {gamePhase === 'running' && (
             <TrendingUp className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-32 w-32 text-primary/10 opacity-50" />
          )}
           {gamePhase === 'crashed' && (
             <Zap className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-32 w-32 text-destructive/20 opacity-70" />
          )}
          {gamePhase === 'cashed_out' && (
             <CheckCircle2 className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-32 w-32 text-primary/20 opacity-70" />
          )}

          <p className="text-6xl font-bold text-primary z-10">
            <GsapAnimatedNumber value={currentMultiplier} precision={2} duration={0.1} />x
          </p>
          <p className={`mt-2 text-sm font-medium z-10 ${getMessageColor()}`}>{message}</p>
        </div>

        {/* Controls */}
        { (gamePhase === 'idle' || gamePhase === 'betting' || gamePhase === 'crashed' || gamePhase === 'cashed_out') && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
            <div>
              <Label htmlFor="bet-amount-plane" className="font-semibold">Bet Amount ({MIN_BET}-{MAX_BET})</Label>
              <div className="relative mt-1">
                 <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  id="bet-amount-plane"
                  type="text"
                  value={betAmount}
                  onChange={handleBetAmountChange}
                  className="pl-10 h-11 text-md"
                  disabled={gamePhase === 'running'}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="target-multiplier-plane" className="font-semibold">Auto Cash Out At (Optional)</Label>
               <div className="relative mt-1">
                 <Target className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  id="target-multiplier-plane"
                  type="text"
                  value={targetMultiplier}
                  onChange={handleTargetMultiplierChange}
                  placeholder={`${MIN_MULTIPLIER_TARGET}x - ${MAX_MULTIPLIER_TARGET}x`}
                  className="pl-10 h-11 text-md"
                  disabled={gamePhase === 'running'}
                />
              </div>
            </div>
          </div>
        )}
      </CardContent>
      <CardFooter className="flex flex-col gap-3">
        { (gamePhase === 'idle' || gamePhase === 'betting') && (
          <Button onClick={startGame} className="w-full bg-primary hover:bg-primary/90 text-primary-foreground text-lg py-3">
            <Rocket className="mr-2 h-5 w-5" /> Place Bet & Start
          </Button>
        )}
        { gamePhase === 'running' && (
          <Button onClick={handleCashOut} className="w-full bg-green-500 hover:bg-green-600 text-white text-lg py-3">
            <CheckCircle2 className="mr-2 h-5 w-5" /> Cash Out @ {currentMultiplier.toFixed(2)}x
          </Button>
        )}
        { (gamePhase === 'crashed' || gamePhase === 'cashed_out') && (
          <Button onClick={resetGame} className="w-full bg-secondary hover:bg-secondary/80 text-secondary-foreground text-lg py-3">
            Play Again
          </Button>
        )}
         {gamePhase !== 'idle' && gamePhase !== 'betting' && gamePhase !== 'running' && (
            <p className="text-xs text-muted-foreground">Game Over. Click "Play Again" to restart.</p>
         )}
      </CardFooter>
    </Card>
  );
};

export default PlaneGameClient;
