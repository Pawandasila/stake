
// src/components/layout/Header.tsx
"use client";

import Link from 'next/link';
import Image from 'next/image';
import { DollarSign, ShieldCheck, Landmark, Ticket, Rocket, LogIn, LogOut, UserCircle, Menu } from 'lucide-react';
import { APP_NAME } from '@/lib/constants';
import { useVirtualWallet } from '@/contexts/VirtualWalletContext';
import { useAuth } from '@/contexts/AuthContext';
import GsapAnimatedNumber from '@/components/animations/GsapAnimatedNumber';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"


const Header = () => {
  const { balance } = useVirtualWallet();
  const { currentUser, signOut, loading } = useAuth();

  const getAvatarFallback = (name?: string | null) => {
    if (!name) return "VV";
    const parts = name.split(" ");
    if (parts.length > 1) {
      return parts[0][0].toUpperCase() + parts[1][0].toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  }

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
          {currentUser && (
            <>
              <Link href="/add-balance" className="text-muted-foreground hover:text-primary transition-colors flex items-center gap-1.5">
                <Landmark size={16} /> Add Balance
              </Link>
              <Separator orientation="vertical" className="h-5" />
              <Link href="/my-bets" className="text-muted-foreground hover:text-primary transition-colors flex items-center gap-1.5">
                <Ticket size={16} /> My Bets
              </Link>
              <Separator orientation="vertical" className="h-5" />
            </>
          )}
          <Link href="/plane-game" className="text-muted-foreground hover:text-primary transition-colors flex items-center gap-1.5">
            <Rocket size={16} /> Plane Game
          </Link>
        </nav>

        <div className="flex items-center gap-3">
          {currentUser && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-card border border-border text-sm font-medium">
              <DollarSign className="h-5 w-5 text-primary" />
              <span className="text-foreground hidden sm:inline">Balance:</span>
              <GsapAnimatedNumber value={balance} className="font-semibold text-lg text-primary" />
            </div>
          )}
          
          {loading ? (
             <Button variant="ghost" size="icon" className="opacity-50">
                <UserCircle className="h-6 w-6 animate-pulse" />
            </Button>
          ) : currentUser ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-9 w-9 rounded-full">
                  <Avatar className="h-9 w-9">
                    <AvatarImage src={currentUser.photoURL || undefined} alt={currentUser.displayName || "User"} />
                    <AvatarFallback>{getAvatarFallback(currentUser.displayName)}</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">{currentUser.displayName || "Victory User"}</p>
                    <p className="text-xs leading-none text-muted-foreground">
                      {currentUser.email}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {/* Add more items like Profile, Settings here if needed */}
                 <DropdownMenuItem onClick={signOut} className="cursor-pointer text-destructive focus:text-destructive focus:bg-destructive/10">
                  <LogOut className="mr-2 h-4 w-4" />
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Link href="/login" passHref legacyBehavior>
              <Button variant="outline" size="sm">
                <LogIn className="mr-2 h-4 w-4" /> Login
              </Button>
            </Link>
          )}
          
          {/* Mobile Navigation Trigger */}
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
                {currentUser && (
                  <>
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
                  </>
                )}
                <DropdownMenuItem asChild>
                   <Link href="/plane-game" className="flex items-center gap-2">
                    <Rocket size={16} /> Plane Game
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                 {currentUser ? (
                    <DropdownMenuItem onClick={signOut} className="cursor-pointer text-destructive focus:text-destructive focus:bg-destructive/10">
                        <LogOut className="mr-2 h-4 w-4" /> Log out
                    </DropdownMenuItem>
                 ) : (
                    <DropdownMenuItem asChild>
                        <Link href="/login" className="flex items-center gap-2">
                            <LogIn className="mr-2 h-4 w-4" /> Login
                        </Link>
                    </DropdownMenuItem>
                 )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header; // Ensure this line exists
