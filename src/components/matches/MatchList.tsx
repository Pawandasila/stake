// src/components/matches/MatchList.tsx
import type { Match } from '@/types';
import MatchCard from './MatchCard';

interface MatchListProps {
  matches: Match[];
  title?: string;
}

const MatchList: React.FC<MatchListProps> = ({ matches, title = "Upcoming Matches" }) => {
  if (!matches || matches.length === 0) {
    return (
      <div className="text-center py-10">
        <p className="text-muted-foreground text-lg">{title}</p>
        <p>No matches available at the moment. Check back soon!</p>
      </div>
    );
  }

  return (
    <section className="py-8">
      <h2 className="text-3xl font-bold tracking-tight text-center mb-8 text-foreground">
        {title}
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {matches.map((match) => (
          <MatchCard key={match.id} match={match} />
        ))}
      </div>
    </section>
  );
};

export default MatchList;
