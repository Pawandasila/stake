// src/components/betting/UserBets.tsx
"use client";

import { useVirtualWallet } from '@/contexts/VirtualWalletContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Ticket, DollarSign, Clock } from 'lucide-react';
import { format } from 'date-fns';

const UserBets = () => {
  const { bets } = useVirtualWallet();

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
           <Ticket /> My Simulated Bets
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[300px] pr-4">
          <div className="space-y-4">
            {bets.map((bet) => (
              <div key={bet.id} className="p-4 rounded-md border border-border bg-background hover:border-primary/50 transition-colors">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-semibold text-foreground">{bet.matchDescription}</p>
                    <p className="text-sm text-primary">Selected: {bet.selectedOutcome} @{bet.odds.toFixed(2)}</p>
                  </div>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full
                    ${bet.status === 'pending' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' : 
                    bet.status === 'won' ? 'bg-primary/20 text-primary border border-primary/30' : 
                    'bg-destructive/20 text-destructive border border-destructive/30'}`}>
                    {bet.status}
                  </span>
                </div>
                <Separator className="my-2" />
                <div className="flex justify-between items-center text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <DollarSign size={14} /> Stake: {bet.stake} units
                  </div>
                  <div className="flex items-center gap-1">
                    <DollarSign size={14} className="text-primary"/> Win: {bet.potentialWinnings.toFixed(2)} units
                  </div>
                </div>
                <div className="text-xs text-muted-foreground/70 mt-1 flex items-center gap-1">
                  <Clock size={12} /> {format(new Date(bet.timestamp), 'MMM d, yyyy HH:mm')}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

export default UserBets;
