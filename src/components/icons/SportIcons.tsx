// src/components/icons/SportIcons.tsx
// Example for custom sport icons if Lucide doesn't cover them all well.
// For now, we'll rely on Lucide or simple text/placeholders in MatchCard.
// This file is a placeholder for potential future expansion.

// Example: Football Icon (if Lucide's 'Swords' or 'Gamepad2' for esports isn't enough)
export const FootballIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <circle cx="12" cy="12" r="10" />
    <path d="M12 2L12 22" />
    <path d="M17.2426 6.75736C14.8284 9.17157 9.17157 14.8284 6.75736 17.2426" />
    <path d="M6.75736 6.75736C9.17157 9.17157 14.8284 14.8284 17.2426 17.2426" />
    <path d="M2 12L22 12" />
    <path d="M19.0711 4.92893C16.0911 1.94909 10.9089 1.94909 7.92893 4.92893" />
    <path d="M4.92893 19.0711C1.94909 16.0911 1.94909 10.9089 4.92893 7.92893" />
  </svg>
);

// Example: Basketball Icon
export const BasketballIcon = (props: React.SVGProps<SVGSVGElement>) => (
 <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <circle cx="12" cy="12" r="10"></circle>
    <path d="M7.2 4.5A10 10 0 0 0 4.5 7.2M16.8 4.5A10 10 0 0 1 19.5 7.2M7.2 19.5A10 10 0 0 1 4.5 16.8M16.8 19.5A10 10 0 0 0 19.5 16.8M2 12h20M12 2v20"></path>
  </svg>
);

// You would then import and use these like:
// import { FootballIcon } from '@/components/icons/SportIcons';
// <FootballIcon className="h-5 w-5 text-primary" />
// For now, this file serves as an example. MatchCard uses Lucide icons.
