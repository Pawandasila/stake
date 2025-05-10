// src/components/betting/AllBetsList.tsx
"use client";

import { useVirtualWallet } from '@/contexts/VirtualWalletContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { DollarSign, Clock, AlertTriangle, RotateCcw, TicketCheck, ShieldX, CheckCircle2 } from 'lucide-react';
import { format } from 'date-fns';
import type { PlacedBet } from '@/types';

const BET_WITHDRAWAL_CUTOFF_MS = 5 * 60 * 1000; // 5 minutes

const AllBetsList = () => {
  const { bets, withdrawBet } = useVirtualWallet();

  const canWithdraw = (betMatchTime: Date): boolean => {
    return new Date(betMatchTime).getTime() - Date.now() > BET_WITHDRAWAL_CUTOFF_MS;
  };

  const getStatusIconAndColor = (status: PlacedBet['status']) => {
    switch (status) {
      case 'pending': return { icon: <Clock size={16}/>, className: 'bg-blue-500/20 text-blue-400 border border-blue-500/30' };
      case 'won': return { icon: <TicketCheck size={16}/>, className: 'bg-primary/20 text-primary border border-primary/30 animate-pulse' };
      case 'lost': return { icon: <ShieldX size={16}/>, className: 'bg-destructive/20 text-destructive border border-destructive/30' };
      case 'withdrawn': return { icon: <RotateCcw size={16}/>, className: 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' };
      default: return { icon: <Clock size={16}/>, className: 'bg-muted text-muted-foreground border-border' };
    }
  };

  if (bets.length === 0) {
    return (
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl text-center text-primary">No Bets Placed Yet</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-6">
            You haven't placed any simulated bets. Explore upcoming matches and try your luck!
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {bets.map((bet) => {
        const { icon, className: statusClassName } = getStatusIconAndColor(bet.status);
        return (
          <Card key={bet.id} className="shadow-md hover:shadow-primary/10 transition-shadow duration-200">
            <CardHeader className="pb-3">
              <div className="flex justify-between items-center">
                <CardTitle className="text-lg font-semibold text-foreground">{bet.matchDescription}</CardTitle>
                <span className={`text-xs font-medium px-3 py-1 rounded-full flex items-center gap-1.5 ${statusClassName}`}>
                  {icon} {bet.status.charAt(0).toUpperCase() + bet.status.slice(1)}
                </span>
              </div>
              <p className="text-sm text-primary">Selected: {bet.selectedOutcome} @{bet.odds.toFixed(2)}</p>
            </CardHeader>
            <CardContent className="pt-0">
              <Separator className="mb-3" />
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                <div className="text-muted-foreground">
                  <p className="flex items-center gap-1"><DollarSign size={14} /> Stake: {bet.stake} units</p>
                  <p className="flex items-center gap-1">
                    <DollarSign size={14} className={bet.status === 'won' ? 'text-primary' : ''} /> 
                    {bet.status === 'won' ? 'Won: ' : 'Potential: '} 
                    <span className={bet.status === 'won' ? 'text-primary font-semibold' : ''}>{bet.potentialWinnings.toFixed(2)} units</span>
                  </p>
                </div>
                <div className="text-muted-foreground text-xs">
                  <p className="flex items-center gap-1"><Clock size={12} /> Placed: {format(new Date(bet.timestamp), 'MMM d, yyyy HH:mm')}</p>
                  <p className="flex items-center gap-1"><Clock size={12} /> Match: {format(new Date(bet.matchTime), 'MMM d, yyyy HH:mm')}</p>
                </div>
                <div className="flex md:justify-end items-center">
                  {bet.status === 'pending' && canWithdraw(bet.matchTime) && (
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="border-yellow-500/50 text-yellow-500 hover:bg-yellow-500/10 hover:text-yellow-400 w-full md:w-auto"
                      onClick={() => withdrawBet(bet.id)}
                    >
                      <RotateCcw size={14} className="mr-1.5" /> Withdraw
                    </Button>
                  )}
                  {bet.status === 'pending' && !canWithdraw(bet.matchTime) && new Date(bet.matchTime).getTime() > Date.now() && (
                     <p className="text-xs text-muted-foreground/80 flex items-center gap-1 w-full md:w-auto md:text-right">
                        <AlertTriangle size={12}/> Withdrawal unavailable (too close to start)
                    </p>
                   )}
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

export default AllBetsList;
