// src/components/layout/Header.tsx
"use client";

import Link from 'next/link';
import { DollarSign, ShieldCheck } from 'lucide-react';
import { APP_NAME } from '@/lib/constants';
import { useVirtualWallet } from '@/contexts/VirtualWalletContext';
import GsapAnimatedNumber from '@/components/animations/GsapAnimatedNumber';
import { Button } from '@/components/ui/button';

const Header = () => {
  const { balance } = useVirtualWallet();

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/60 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 shadow-md">
      <div className="container flex h-16 items-center justify-between max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2">
          <ShieldCheck className="h-8 w-8 text-primary" />
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            {APP_NAME}
          </h1>
        </Link>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-card border border-border text-sm font-medium">
            <DollarSign className="h-5 w-5 text-primary" />
            <span className="text-foreground">Balance:</span>
            <GsapAnimatedNumber value={balance} className="font-semibold text-lg text-primary" />
          </div>
          {/* Future: User Profile/Auth Button */}
          {/* <Button variant="outline" size="sm">Login</Button> */}
        </div>
      </div>
    </header>
  );
};

export default Header;
