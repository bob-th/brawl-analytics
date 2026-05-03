import { useParams } from 'react-router-dom';
import { useRecentBattles } from '../hooks/useRecentBattles';
import DashboardHeader from '../components/dashboard/DashboardHeader';
import TrophyChart from '../components/dashboard/TrophyChart';

const Dashboard: React.FC = () => {
  const { tag } = useParams<{ tag: string }>();
  const playerTag = tag ?? '';
  const { data, isPending, isError, error } = useRecentBattles(playerTag);

  if (!playerTag) {
    return <div className="p-6 text-zinc-300">No player tag in URL.</div>;
  }

  return (
    <div className="p-6 max-w-5xl mx-auto text-zinc-300">
      <DashboardHeader playerTag={playerTag} />

      {isPending ? (
        <div className="text-zinc-400">Loading battles…</div>
      ) : isError ? (
        <div className="text-red-400">
          Error loading battles: {error instanceof Error ? error.message : 'unknown'}
        </div>
      ) : data.battles.length === 0 ? (
        <div className="text-zinc-400">No recent battles found.</div>
      ) : (
        <section>
          <h2 className="text-xs uppercase tracking-wider text-zinc-500 mb-2">
            Last 25 battles
          </h2>
          <TrophyChart battles={data.battles} />
        </section>
      )}
    </div>
  );
};

export default Dashboard;
