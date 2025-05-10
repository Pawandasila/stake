// src/components/betting/UserBets.tsx
"use client";

import Link from 'next/link';
import { useVirtualWallet } from '@/contexts/VirtualWalletContext';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Ticket, DollarSign, Clock, AlertTriangle, ArrowRight, RotateCcw } from 'lucide-react';
import { format } from 'date-fns';

const BET_WITHDRAWAL_CUTOFF_MS = 5 * 60 * 1000; // 5 minutes

const UserBets = () => {
  const { bets, withdrawBet } = useVirtualWallet();
  const recentBets = bets.slice(0, 3);

  const canWithdraw = (betMatchTime: Date): boolean => {
    return new Date(betMatchTime).getTime() - Date.now() > BET_WITHDRAWAL_CUTOFF_MS;
  };

  const getStatusColor = (status: PlacedBet['status']) => {
    switch (status) {
      case 'pending': return 'bg-blue-500/20 text-blue-400 border border-blue-500/30';
      case 'won': return 'bg-primary/20 text-primary border border-primary/30 animate-pulse';
      case 'lost': return 'bg-destructive/20 text-destructive border border-destructive/30';
      case 'withdrawn': return 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30';
      default: return 'bg-muted text-muted-foreground border-border';
    }
  };


  if (bets.length === 0) {
    return (
      <Card className="mt-8 shadow-lg">
        <CardHeader>
          <CardTitle className="text-xl flex items-center gap-2 text-primary">
            <Ticket /> My Simulated Bets
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-4">You haven't placed any simulated bets yet.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mt-8 shadow-lg">
      <CardHeader>
        <CardTitle className="text-xl flex items-center gap-2 text-primary">
           <Ticket /> Recent Simulated Bets
        </CardTitle>
      </CardHeader>
      <CardContent>
        {recentBets.length === 0 && <p className="text-muted-foreground text-center py-4">No recent bets.</p>}
        <ScrollArea className={recentBets.length > 0 ? "h-[300px] pr-4" : ""}>
          <div className="space-y-4">
            {recentBets.map((bet) => (
              <div key={bet.id} className="p-4 rounded-md border border-border bg-background hover:border-primary/50 transition-colors">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-semibold text-foreground">{bet.matchDescription}</p>
                    <p className="text-sm text-primary">Selected: {bet.selectedOutcome} @{bet.odds.toFixed(2)}</p>
                  </div>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${getStatusColor(bet.status)}`}>
                    {bet.status}
                  </span>
                </div>
                <Separator className="my-2" />
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center text-sm text-muted-foreground gap-2">
                  <div className='space-y-1'>
                    <div className="flex items-center gap-1">
                      <DollarSign size={14} /> Stake: {bet.stake} units
                    </div>
                    <div className="flex items-center gap-1">
                      <DollarSign size={14} className={bet.status === 'won' ? 'text-primary': ''}/> 
                      {bet.status === 'won' ? 'Won: ' : 'Potential: '} 
                      {bet.potentialWinnings.toFixed(2)} units
                    </div>
                  </div>
                  {bet.status === 'pending' && canWithdraw(bet.matchTime) && (
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="border-yellow-500/50 text-yellow-500 hover:bg-yellow-500/10 hover:text-yellow-400 text-xs"
                      onClick={() => withdrawBet(bet.id)}
                    >
                      <RotateCcw size={14} className="mr-1.5" /> Withdraw Bet
                    </Button>
                  )}
                   {bet.status === 'pending' && !canWithdraw(bet.matchTime) && new Date(bet.matchTime).getTime() > Date.now() && (
                     <p className="text-xs text-muted-foreground/70 flex items-center gap-1"><AlertTriangle size={12}/> Withdrawal unavailable</p>
                   )}
                </div>
                <div className="text-xs text-muted-foreground/70 mt-2 flex items-center gap-1">
                  <Clock size={12} /> Placed: {format(new Date(bet.timestamp), 'MMM d, HH:mm')}
                </div>
                 <div className="text-xs text-muted-foreground/70 mt-1 flex items-center gap-1">
                  <Clock size={12} /> Match: {format(new Date(bet.matchTime), 'MMM d, HH:mm')}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
      {bets.length > 3 && (
        <CardFooter>
          <Link href="/my-bets" legacyBehavior>
            <a className="text-sm text-primary hover:underline flex items-center gap-1">
              View All My Bets <ArrowRight size={16} />
            </a>
          </Link>
        </CardFooter>
      )}
    </Card>
  );
};

export default UserBets;
