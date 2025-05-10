// src/components/betting/AddBalanceForm.tsx
"use client";

import React, { useState } from 'react';
import { useVirtualWallet } from '@/contexts/VirtualWalletContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DollarSign, AlertCircle } from 'lucide-react';
import GsapAnimatedNumber from '../animations/GsapAnimatedNumber';

const AddBalanceForm = () => {
  const [amount, setAmount] = useState<string>('');
  const [error, setError] = useState<string>('');
  const { balance, addFunds } = useVirtualWallet();

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Allow only numbers and at most two decimal places
    if (/^\d*\.?\d{0,2}$/.test(value) || value === '') {
      setAmount(value);
      setError('');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      setError('Please enter a valid positive amount.');
      return;
    }
    if (numericAmount > 10000) { // Arbitrary max add limit for sanity
        setError('You cannot add more than 10,000 units at a time.');
        return;
    }
    addFunds(numericAmount);
    setAmount(''); // Reset input after successful addition
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="p-4 border rounded-md bg-card-foreground/5 text-center">
        <p className="text-sm text-muted-foreground">Current Virtual Balance</p>
        <p className="text-3xl font-bold text-primary">
          <GsapAnimatedNumber value={balance} precision={2} /> units
        </p>
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="amount-to-add" className="font-semibold">Amount to Add</Label>
        <div className="relative">
          <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            id="amount-to-add"
            type="text" // Use text to handle decimal input smoothly
            value={amount}
            onChange={handleAmountChange}
            placeholder="e.g., 100.00"
            className="pl-10 text-lg h-12 border-input focus:border-primary"
            inputMode="decimal"
            required
          />
        </div>
        {error && (
          <p className="text-sm text-destructive flex items-center gap-1"><AlertCircle size={14} /> {error}</p>
        )}
      </div>

      <div className="flex justify-around space-x-2 pt-2">
        {[50, 100, 250, 500].map(val => (
            <Button key={val} type="button" variant="outline" onClick={() => setAmount(val.toString())}>
                Add {val}
            </Button>
        ))}
      </div>

      <Button type="submit" className="w-full bg-primary hover:bg-primary/90 text-primary-foreground text-lg py-3">
        <DollarSign className="mr-2 h-5 w-5" /> Add Funds to Wallet
      </Button>
    </form>
  );
};

export default AddBalanceForm;
