// src/components/layout/Header.tsx
"use client";

import Link from 'next/link';
import { DollarSign, ShieldCheck, Landmark, Ticket, Rocket } from 'lucide-react';
import { APP_NAME } from '@/lib/constants';
import { useVirtualWallet } from '@/contexts/VirtualWalletContext';
import GsapAnimatedNumber from '@/components/animations/GsapAnimatedNumber';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Menu } from 'lucide-react';


const Header = () => {
  const { balance } = useVirtualWallet();

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/60 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 shadow-md">
      <div className="container flex h-16 items-center justify-between max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2">
          <ShieldCheck className="h-8 w-8 text-primary" />
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
            {APP_NAME}
          </h1>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-3 lg:gap-4 text-sm font-medium">
          <Link href="/add-balance" className="text-muted-foreground hover:text-primary transition-colors flex items-center gap-1.5">
            <Landmark size={16} /> Add Balance
          </Link>
          <Separator orientation="vertical" className="h-5" />
          <Link href="/my-bets" className="text-muted-foreground hover:text-primary transition-colors flex items-center gap-1.5">
            <Ticket size={16} /> My Bets
          </Link>
          <Separator orientation="vertical" className="h-5" />
          <Link href="/plane-game" className="text-muted-foreground hover:text-primary transition-colors flex items-center gap-1.5">
            <Rocket size={16} /> Plane Game
          </Link>
        </nav>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-card border border-border text-sm font-medium">
            <DollarSign className="h-5 w-5 text-primary" />
            <span className="text-foreground hidden sm:inline">Balance:</span>
            <GsapAnimatedNumber value={balance} className="font-semibold text-lg text-primary" />
          </div>
          
          {/* Mobile Navigation */}
          <div className="md:hidden">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Menu className="h-6 w-6" />
                  <span className="sr-only">Open menu</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuLabel>Navigation</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/add-balance" className="flex items-center gap-2">
                    <Landmark size={16} /> Add Balance
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/my-bets" className="flex items-center gap-2">
                    <Ticket size={16} /> My Bets
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                   <Link href="/plane-game" className="flex items-center gap-2">
                    <Rocket size={16} /> Plane Game
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
