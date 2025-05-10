// src/components/games/PlaneGameClient.tsx
"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useVirtualWallet } from '@/contexts/VirtualWalletContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label as ShadcnLabel } from '@/components/ui/label'; // Renamed to avoid conflict with Recharts Label
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign, Target, Rocket, CheckCircle2 } from 'lucide-react';
import GsapAnimatedNumber from '../animations/GsapAnimatedNumber';
import { useToast } from '@/hooks/use-toast';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, Label as RechartsLabelComponent } from 'recharts'; // Imported Label as RechartsLabelComponent

type GamePhase = 'idle' | 'betting' | 'running' | 'crashed' | 'cashed_out';
type MultiplierDataPoint = { time: number; value: number };

const MIN_BET = 1;
const MAX_BET = 100;
const MIN_MULTIPLIER_TARGET = 1.01;
const MAX_MULTIPLIER_TARGET = 100;

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

  const [multiplierHistory, setMultiplierHistory] = useState<MultiplierDataPoint[]>([{ time: 0, value: 1.0 }]);
  const [startTime, setStartTime] = useState<number | null>(null);

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

    if (isNaN(numericBetAmount) || numericBetAmount < MIN_BET || numericBetAmount > MAX_BET) {
      setMessage(`Bet amount must be between ${MIN_BET} and ${MAX_BET}.`);
      setMessageType('error');
      toast({ title: "Invalid Bet Amount", description: `Bet amount must be between ${MIN_BET} and ${MAX_BET}.`, variant: "destructive"});
      return;
    }
    if (numericBetAmount > balance) {
      setMessage('Insufficient balance for this bet.');
      setMessageType('error');
      toast({ title: "Insufficient Balance", description: "Your balance is too low for this bet.", variant: "destructive"});
      return;
    }

    if (targetMultiplier.trim() !== "") { // Only validate if targetMultiplier is not empty or just whitespace
      const numericTargetMultiplierValue = parseFloat(targetMultiplier);
      if (isNaN(numericTargetMultiplierValue) || numericTargetMultiplierValue < MIN_MULTIPLIER_TARGET || numericTargetMultiplierValue > MAX_MULTIPLIER_TARGET) {
           setMessage(`Target multiplier must be between ${MIN_MULTIPLIER_TARGET}x and ${MAX_MULTIPLIER_TARGET}x, or empty.`);
           setMessageType('error');
           toast({ title: "Invalid Target Multiplier", description: `Target must be ${MIN_MULTIPLIER_TARGET}x - ${MAX_MULTIPLIER_TARGET}x, or empty if not used.`, variant: "destructive"});
           return;
      }
    }


    updateBalance(-numericBetAmount);
    setGamePhase('running');
    setCurrentMultiplier(1.00);
    setMultiplierHistory([{ time: 0, value: 1.0 }]); 
    setStartTime(Date.now());
    
    const randomFactor = Math.random();
    let determinedCrashPoint;
    if (randomFactor < 0.05) determinedCrashPoint = 1.00; 
    else if (randomFactor < 0.60) determinedCrashPoint = 1.01 + Math.random() * (2 - 1.01);
    else if (randomFactor < 0.90) determinedCrashPoint = 2 + Math.random() * (5 - 2);
    else determinedCrashPoint = 5 + Math.random() * (20 - 5); 
    
    setCrashPoint(parseFloat(determinedCrashPoint.toFixed(2)));
    setMessage('Plane taking off... Cash out before it flies away!');
    setMessageType('info');

    stopGameInterval(); 

    intervalRef.current = setInterval(() => {
      setCurrentMultiplier(prev => {
        const prevMultiplier = typeof prev === 'number' ? prev : 1.0;
        const newValue = parseFloat((prevMultiplier + 0.01 + (prevMultiplier * 0.005 * (Math.random() * 0.2 + 0.9) )).toFixed(2)); 
        
        setStartTime(st => { 
          if (st) {
            const elapsedTime = (Date.now() - st) / 1000; 
            setMultiplierHistory(prevHistory => [...prevHistory, { time: elapsedTime, value: newValue }]);
          }
          return st;
        });
        return newValue;
      });
    }, 100); 
  };

  const handleCashOut = useCallback(() => {
    if (gamePhase !== 'running') return;
    stopGameInterval();
    
    const finalCashOutMultiplier = currentMultiplier; 

    setGamePhase('cashed_out');
    setCurrentMultiplier(finalCashOutMultiplier); 

    const numericBetAmount = parseFloat(betAmount);
    const winnings = numericBetAmount * finalCashOutMultiplier;
    updateBalance(winnings);
    setMessage(`Cashed out at ${finalCashOutMultiplier.toFixed(2)}x! You won ${winnings.toFixed(2)} units.`);
    setMessageType('success');
    toast({
      title: "Cashed Out!",
      description: `You won ${winnings.toFixed(2)} units at ${finalCashOutMultiplier.toFixed(2)}x.`,
      className: "bg-primary text-primary-foreground",
    });

    if (startTime) { 
      const elapsedTime = (Date.now() - startTime) / 1000;
      setMultiplierHistory(prevHistory => {
        const newHistory = [...prevHistory];
        const lastPoint = newHistory.length > 0 ? newHistory[newHistory.length - 1] : null;
        const pointTime = lastPoint ? Math.max(elapsedTime, lastPoint.time + 0.001) : elapsedTime;

        if (!lastPoint) { 
          newHistory.push({ time: 0, value: 1.0 }); 
          if (finalCashOutMultiplier > 1.0) { 
            newHistory.push({ time: pointTime, value: finalCashOutMultiplier });
          }
        } else if (lastPoint.value < finalCashOutMultiplier) { 
          newHistory.push({ time: pointTime, value: finalCashOutMultiplier });
        }
        return newHistory;
      });
    }
  }, [gamePhase, betAmount, currentMultiplier, updateBalance, stopGameInterval, toast, startTime]);


  useEffect(() => {
    if (gamePhase === 'running') {
      if (currentMultiplier >= crashPoint) {
        stopGameInterval(); 
        
        const finalCrashedMultiplier = crashPoint; 

        setGamePhase('crashed');
        setCurrentMultiplier(finalCrashedMultiplier); 

        if (startTime) { 
            const elapsedTime = (Date.now() - startTime) / 1000;
            setMultiplierHistory(prevHistory => {
                const newHistory = [...prevHistory];
                const lastPoint = newHistory.length > 0 ? newHistory[newHistory.length - 1] : null;
                const pointTime = lastPoint ? Math.max(elapsedTime, lastPoint.time + 0.001) : elapsedTime;

                if (!lastPoint) {
                  newHistory.push({ time: 0, value: 1.0 });
                  if (finalCrashedMultiplier > 1.0) { 
                    newHistory.push({ time: pointTime, value: finalCrashedMultiplier });
                  }
                } else if (lastPoint.value < finalCrashedMultiplier) {
                  newHistory.push({ time: pointTime, value: finalCrashedMultiplier });
                }
                return newHistory;
            });
        }
        
        setMessage(`Oh no! Plane flew away at ${finalCrashedMultiplier.toFixed(2)}x.`);
        setMessageType('error');
        toast({
          title: "Plane Flew Away!",
          description: `Crashed at ${finalCrashedMultiplier.toFixed(2)}x. Better luck next time.`,
          variant: "destructive",
        });
      } else {
        const numericTargetMultiplier = parseFloat(targetMultiplier);
        if (targetMultiplier.trim() !== "" && !isNaN(numericTargetMultiplier) && numericTargetMultiplier >= MIN_MULTIPLIER_TARGET && currentMultiplier >= numericTargetMultiplier) {
          handleCashOut(); 
        }
      }
    }
  }, [currentMultiplier, crashPoint, gamePhase, targetMultiplier, handleCashOut, stopGameInterval, toast, startTime]);


  const resetGame = () => {
    stopGameInterval();
    setGamePhase('idle');
    setCurrentMultiplier(1.00);
    setMultiplierHistory([{ time: 0, value: 1.0 }]);
    setStartTime(null);
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
            <Rocket size={32} className={gamePhase === 'running' ? 'animate-pulse': ''} />
            <CardTitle className="text-3xl font-bold">Plane Game</CardTitle>
        </div>
        <CardDescription className="text-center">
          Current Balance: <GsapAnimatedNumber value={balance} precision={2} /> units
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="min-h-[280px] md:min-h-[320px] flex flex-col items-center justify-between bg-card-foreground/5 rounded-lg p-4 border border-border relative overflow-hidden">
          <div className="text-center z-10 py-2">
            <p className="text-5xl md:text-6xl font-bold text-primary">
              <GsapAnimatedNumber value={currentMultiplier} precision={2} duration={0.1} />x
            </p>
            <p className={`mt-1 text-xs md:text-sm font-medium ${getMessageColor()}`}>{message}</p>
          </div>

          <div className="w-full h-[150px] md:h-[180px] z-0 mt-2">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={multiplierHistory} margin={{ top: 5, right: 25, left: -15, bottom: 5 }}>
                <XAxis 
                  dataKey="time" 
                  type="number" 
                  domain={['dataMin', 'dataMax']} 
                  tickFormatter={(tick) => `${tick.toFixed(0)}s`}
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={10}
                  interval="preserveStartEnd"
                  tickCount={5}
                />
                <YAxis 
                  dataKey="value" 
                  type="number" 
                  domain={[1, 'dataMax + 0.5']} 
                  allowDataOverflow 
                  tickFormatter={(tick) => `${tick.toFixed(1)}x`}
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={10}
                  mirror={gamePhase === 'crashed'} 
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--popover))',
                    borderColor: 'hsl(var(--border))',
                    borderRadius: 'var(--radius)',
                    color: 'hsl(var(--popover-foreground))'
                  }}
                  itemStyle={{ color: 'hsl(var(--primary))' }}
                  formatter={(value: number) => [`${value.toFixed(2)}x`, "Multiplier"]}
                  labelFormatter={(label: number) => `Time: ${label.toFixed(1)}s`}
                  cursor={{ stroke: 'hsl(var(--primary))', strokeWidth: 1, strokeDasharray: '3 3' }}
                />
                <Line 
                  type="monotone" 
                  dataKey="value" 
                  stroke={gamePhase === 'crashed' ? "hsl(var(--destructive))" : "hsl(var(--primary))"}
                  strokeWidth={3} 
                  dot={false} 
                  isAnimationActive={true} 
                  animationDuration={90} 
                  animationEasing="linear" 
                />
                {gamePhase === 'crashed' && crashPoint > 0 && (
                  <ReferenceLine y={crashPoint} stroke="hsl(var(--destructive))" strokeDasharray="4 4" ifOverflow="extendDomain">
                    <RechartsLabelComponent value={`Crashed @ ${crashPoint.toFixed(2)}x`} position="top" fill="hsl(var(--destructive))" fontSize={10} dy={-5} />
                  </ReferenceLine>
                )}
                 {gamePhase === 'cashed_out' && (
                    <ReferenceLine y={currentMultiplier} stroke="hsl(var(--primary))" strokeDasharray="4 4" ifOverflow="extendDomain">
                        <RechartsLabelComponent value={`Cashed @ ${currentMultiplier.toFixed(2)}x`} position="top" fill="hsl(var(--primary))" fontSize={10} dy={-5} />
                    </ReferenceLine>
                )}
                {(gamePhase === 'running' || gamePhase === 'betting' || gamePhase === 'idle') && 
                  targetMultiplier.trim() !== "" && parseFloat(targetMultiplier) >= MIN_MULTIPLIER_TARGET && 
                  !isNaN(parseFloat(targetMultiplier)) && (
                   <ReferenceLine y={parseFloat(targetMultiplier)} stroke="hsl(var(--secondary))" strokeDasharray="3 3" ifOverflow="extendDomain">
                     <RechartsLabelComponent value={`Target @ ${parseFloat(targetMultiplier).toFixed(2)}x`} position="top" fill="hsl(var(--secondary))" fontSize={10} dy={-5} />
                   </ReferenceLine>
                )}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        { (gamePhase === 'idle' || gamePhase === 'betting' || gamePhase === 'crashed' || gamePhase === 'cashed_out') && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
            <div>
              <ShadcnLabel htmlFor="bet-amount-plane" className="font-semibold">Bet Amount ({MIN_BET}-{MAX_BET})</ShadcnLabel>
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
              <ShadcnLabel htmlFor="target-multiplier-plane" className="font-semibold">Auto Cash Out (e.g. 2.0x)</ShadcnLabel>
               <div className="relative mt-1">
                 <Target className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  id="target-multiplier-plane"
                  type="text"
                  value={targetMultiplier}
                  onChange={handleTargetMultiplierChange}
                  placeholder={`${MIN_MULTIPLIER_TARGET}x - ${MAX_MULTIPLIER_TARGET}x (optional)`}
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

```