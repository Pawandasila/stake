// src/components/layout/Footer.tsx
import { APP_NAME } from '@/lib/constants';

const Footer = () => {
  return (
    <footer className="border-t border-border/60 py-8 text-center text-muted-foreground">
      <div className="container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <p className="text-sm">
          &copy; {new Date().getFullYear()} {APP_NAME}. All rights reserved.
        </p>
        <p className="text-xs mt-1">
          This is a simulation platform. No real money is involved.
        </p>
      </div>
    </footer>
  );
};

export default Footer;
