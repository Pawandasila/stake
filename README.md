# Victory Vision

Victory Vision is a Next.js application for simulated sports match predictions. Users can analyze upcoming matches, place virtual bets, and leverage AI-powered recommendations to enhance their prediction strategies. The platform features interactive data visualizations and a sleek, modern interface inspired by platforms like Stake.com.

## Core Features

- **Prediction Display**: View upcoming matches with key information like team names, match times, and simulated odds.
- **Interactive Data Visualization**: (Planned) Interactive graphs and charts to visualize team performance and historical data.
- **Simulated Betting System**: Place simulated bets with a virtual currency and track potential winnings. No real money is involved.
- **Animated UI Elements**: Engaging user interactions and transitions, with GSAP animations for elements like balance updates.
- **AI-Powered Recommendations**: A tool for users to get AI-powered team suggestions based on betting history and team performance data.

## Getting Started

This is a Next.js project bootstrapped with `create-next-app` and enhanced for Firebase Studio.

### Prerequisites

- Node.js (version 18.x or later recommended)
- npm or yarn

### Installation

1.  Clone the repository (if applicable).
2.  Install dependencies:
    ```bash
    npm install
    # or
    yarn install
    ```

### Running the Development Server

To start the development server:

```bash
npm run dev
# or
yarn dev
```

Open [http://localhost:9002](http://localhost:9002) (or the port specified in `package.json`) with your browser to see the result.

You can start editing the main page by modifying `src/app/page.tsx`. The page auto-updates as you edit the file.

### Genkit AI Flows

This project uses Genkit for AI-powered features.
To run Genkit in development mode (for AI flow testing, if separate from the main app dev server):

```bash
npm run genkit:dev
```

Or with watching for changes:

```bash
npm run genkit:watch
```

## Tech Stack

- Next.js (App Router)
- React
- TypeScript
- Tailwind CSS
- ShadCN UI Components
- GSAP (for animations)
- Genkit (for AI features)
- Recharts (for charts)

## Project Structure

- `src/app/`: Main application pages and layouts.
- `src/components/`: Reusable UI components.
  - `ui/`: ShadCN UI components.
  - `layout/`: Header, Footer, etc.
  - `matches/`: Components related to displaying matches.
  - `betting/`: Components for the simulated betting system.
  - `ai/`: Components for AI recommendations.
  - `charts/`: Chart components.
  - `animations/`: Animation-specific components.
- `src/actions/`: Server Actions for form submissions and data mutations.
- `src/ai/`: Genkit AI flow definitions.
  - `flows/`: Specific AI flow implementations.
- `src/lib/`: Utility functions, mock data, constants.
- `src/contexts/`: React Context providers (e.g., `VirtualWalletContext`).
- `src/types/`: TypeScript type definitions.

## UI Style

- **Theme**: Dark theme base, providing a sleek and modern look.
- **Accent Color**: Vibrant green (`#39FF14`) to highlight key interactive elements.
- **Layout**: Grid-based layout for structured and responsive design.
- **Iconography**: Minimalistic icons from `lucide-react`.
- **Animation**: Subtle animations for data updates and UI interactions using GSAP.
- **AI-Powered Recommendations**: A tool for users to get AI-powered team suggestions based on betting history and team performance data.

## Learn More

To learn more about the technologies used:

- [Next.js Documentation](https://nextjs.org/docs)
- [React Documentation](https://react.dev/)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [ShadCN UI](https://ui.shadcn.com/)
- [GSAP Documentation](https://greensock.com/docs/)
- [Genkit Documentation](https://firebase.google.com/docs/genkit)

This project is a starting point. Feel free to expand upon it!
