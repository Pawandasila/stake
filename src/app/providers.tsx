// src/app/providers.tsx
"use client";

import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { VirtualWalletProvider } from '@/contexts/VirtualWalletContext';
import { AuthProvider } from '@/contexts/AuthContext'; // Import AuthProvider

// Create a client
const queryClient = new QueryClient();

const AppProviders: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider> {/* Add AuthProvider here */}
        <VirtualWalletProvider>
          {children}
        </VirtualWalletProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default AppProviders;
