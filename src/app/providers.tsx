// src/app/providers.tsx
"use client";

import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { VirtualWalletProvider } from '@/contexts/VirtualWalletContext';

// Create a client
const queryClient = new QueryClient();

const AppProviders: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <QueryClientProvider client={queryClient}>
      <VirtualWalletProvider>
        {children}
      </VirtualWalletProvider>
    </QueryClientProvider>
  );
};

export default AppProviders;
