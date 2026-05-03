import { useParams } from 'react-router-dom';
import { useRecentBattles } from '../hooks/useRecentBattles';
import TrophyChart from '../components/dashboard/TrophyChart';

const Dashboard: React.FC = () => {
  const { tag } = useParams<{ tag: string }>();
  const playerTag = tag ?? '';
  const { data, isPending, isError, error } = useRecentBattles(playerTag);

  if (!playerTag) {
    return <div className="p-4 text-white">No player tag in URL.</div>;
  }

  if (isPending) {
    return <div className="p-4 text-white">Loading…</div>;
  }

  if (isError) {
    return (
      <div className="p-4 text-red-400">
        Error loading battles: {error instanceof Error ? error.message : 'unknown'}
      </div>
    );
  }

  const battles = data.battles;
  if (battles.length === 0) {
    return <div className="p-4 text-white">No recent battles found.</div>;
  }

  const currentTrophies = battles[0].trophies;

  return (
    <div className="p-4 text-white">
      <header className="mb-4">
        <h1 className="text-2xl font-hello font-medium">#{playerTag}</h1>
        <div className="text-sm opacity-80">
          {currentTrophies.toLocaleString()} trophies · Last 25 battles
        </div>
      </header>
      <TrophyChart battles={battles} />
    </div>
  );
};

export default Dashboard;
