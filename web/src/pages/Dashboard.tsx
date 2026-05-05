import { useParams } from 'react-router-dom';
import { TypeAnimation } from 'react-type-animation';
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
        <div className="text-zinc-400">
          <TypeAnimation
            sequence={['Loading battles…']}
            speed={50}
            cursor={true}
            repeat={0}
          />
        </div>
      ) : isError ? (
        <div className="text-red-400">
          Error loading battles: {error instanceof Error ? error.message : 'unknown'}
        </div>
      ) : data.battles.length === 0 ? (
        <div className="text-zinc-400">No recent battles found.</div>
      ) : (
        <section>
          <div className="flex items-baseline justify-between mb-3">
            <h2 className="font-hello text-2xl font-semibold text-zinc-100 tracking-tight">
              <TypeAnimation
                sequence={['Match History']}
                speed={50}
                cursor={false}
                repeat={0}
              />
            </h2>
            <span className="text-xs uppercase tracking-wider text-zinc-500">
              Last {data.battles.length} battles
            </span>
          </div>
          <TrophyChart battles={data.battles} />
        </section>
      )}
    </div>
  );
};

export default Dashboard;
