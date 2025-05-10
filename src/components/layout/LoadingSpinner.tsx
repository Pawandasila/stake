// src/components/layout/LoadingSpinner.tsx
import { Loader2 } from 'lucide-react';

const LoadingSpinner = ({ message = "Loading..." }: { message?: string }) => {
  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-background/90 backdrop-blur-sm">
      <Loader2 className="h-16 w-16 animate-spin text-primary mb-4" />
      <p className="text-xl font-semibold text-foreground">{message}</p>
      <p className="text-sm text-muted-foreground">Please wait a moment.</p>
    </div>
  );
};

export default LoadingSpinner;