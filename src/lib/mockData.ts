import type { Match, TeamPerformance } from '@/types';
import { addHours, addDays } from 'date-fns';

const createTeam = (id: string, name: string, dataAiHint: string): import('@/types').Team => ({
  id,
  name,
  logo: `https://picsum.photos/seed/${name.replace(/\s+/g, '-')}/40/40`,
  dataAiHint,
});

export const mockTeams = {
  alphaFC: createTeam('alpha-fc', 'Alpha FC', 'football team'),
  bravoUnited: createTeam('bravo-united', 'Bravo United', 'soccer club'),
  deltaSquad: createTeam('delta-squad', 'Delta Squad', 'esports team'),
  gammaKnights: createTeam('gamma-knights', 'Gamma Knights', 'gaming logo'),
  epsilonBlazers: createTeam('epsilon-blazers', 'Epsilon Blazers', 'basketball team'),
  zetaStrikers: createTeam('zeta-strikers', 'Zeta Strikers', 'sports emblem'),
};

export const mockMatches: Match[] = [
  {
    id: 'match1',
    teamA: mockTeams.alphaFC,
    teamB: mockTeams.bravoUnited,
    matchTime: addHours(new Date(), 2),
    sport: 'Football',
    league: 'Premier League Simulation',
    odds: { teamAWin: 1.85, draw: 3.5, teamBWin: 4.0 },
  },
  {
    id: 'match2',
    teamA: mockTeams.deltaSquad,
    teamB: mockTeams.gammaKnights,
    matchTime: addHours(new Date(), 4),
    sport: 'Esports',
    league: 'Cyber Masters Cup',
    odds: { teamAWin: 1.5, draw: 0, teamBWin: 2.5 }, // No draw in some esports
  },
  {
    id: 'match3',
    teamA: mockTeams.epsilonBlazers,
    teamB: mockTeams.zetaStrikers,
    matchTime: addDays(new Date(), 1),
    sport: 'Basketball',
    league: 'National Hoops Championship',
    odds: { teamAWin: 1.65, draw: 0, teamBWin: 2.2 }, // No draw in basketball
  },
  {
    id: 'match4',
    teamA: mockTeams.bravoUnited,
    teamB: mockTeams.zetaStrikers, // Cross-sport for fun, or imagine multi-sport org
    matchTime: addDays(addHours(new Date(), 3), 1),
    sport: 'Football',
    league: 'Fantasy Challenge Cup',
    odds: { teamAWin: 2.1, draw: 3.2, teamBWin: 3.0 },
  },
];

export const mockTeamPerformance: TeamPerformance[] = [
  {
    teamId: mockTeams.alphaFC.id,
    data: [
      { name: 'Match 1', value: 3 },
      { name: 'Match 2', value: 1 },
      { name: 'Match 3', value: 0 },
      { name: 'Match 4', value: 3 },
      { name: 'Match 5', value: 1 },
    ],
  },
  {
    teamId: mockTeams.bravoUnited.id,
    data: [
      { name: 'Match 1', value: 0 },
      { name: 'Match 2', value: 1 },
      { name: 'Match 3', value: 3 },
      { name: 'Match 4', value: 0 },
      { name: 'Match 5', value: 1 },
    ],
  },
   {
    teamId: mockTeams.deltaSquad.id,
    data: [
      { name: 'Game 1', value: 10 }, // Kills or points
      { name: 'Game 2', value: 15 },
      { name: 'Game 3', value: 8 },
      { name: 'Game 4', value: 12 },
      { name: 'Game 5', value: 18 },
    ],
  },
];
