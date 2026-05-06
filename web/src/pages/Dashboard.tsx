import { useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { TypeAnimation } from 'react-type-animation';
import { useRecentBattles } from '../hooks/useRecentBattles';
import { usePlayerMetrics } from '../hooks/usePlayerMetrics';
import { usePlayerBattles } from '../hooks/usePlayerBattles';
import { usePlayerBrawlerBattles } from '../hooks/usePlayerBrawlerBattles';
import DashboardHeader from '../components/dashboard/DashboardHeader';
import TrophyChart from '../components/dashboard/TrophyChart';
import TrophyTimelineChart from '../components/dashboard/TrophyTimelineChart';
import WinrateChart from '../components/dashboard/WinrateChart';
import ChartModeSelector, {
  type ChartMode,
} from '../components/dashboard/ChartModeSelector';
import { getTotalTrophyChange } from '../lib/battleStats';
import { searchPlayedBrawlers, topBrawlersByGames } from '../lib/brawlerSearch';
import { brawlerName } from '../data/brawlers';

const SECTION_MAX_W = 'max-w-[1552px]';

const Dashboard: React.FC = () => {
  const { tag } = useParams<{ tag: string }>();
  const playerTag = tag ?? '';

  const [mode, setMode] = useState<ChartMode>('recent');
  const [selectedBrawlerId, setSelectedBrawlerId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const recent = useRecentBattles(playerTag);
  const last50Metrics = usePlayerMetrics(playerTag, 50);
  const allTimeMetrics = usePlayerMetrics(playerTag);
  const allBattles = usePlayerBattles(playerTag);
  const brawlerBattles = usePlayerBrawlerBattles(
    playerTag,
    mode === 'brawler' ? selectedBrawlerId : null
  );

  const brawlerOptions = useMemo(() => {
    if (!allTimeMetrics.data) return [];
    return searchQuery.trim().length === 0
      ? topBrawlersByGames(allTimeMetrics.data, 5)
      : searchPlayedBrawlers(allTimeMetrics.data, searchQuery);
  }, [allTimeMetrics.data, searchQuery]);

  if (!playerTag) {
    return <div className="py-6 text-zinc-300">No player tag in URL.</div>;
  }

  const trophyChange =
    recent.data && recent.data.battles.length > 0
      ? getTotalTrophyChange(recent.data.battles)
      : undefined;

  const modePieMetrics =
    mode === 'recent'
      ? last50Metrics.data?.overall
      : mode === 'total'
      ? allTimeMetrics.data?.overall
      : selectedBrawlerId != null
      ? allTimeMetrics.data?.brawlers[String(selectedBrawlerId)]
      : undefined;

  const modePieLabel =
    mode === 'recent'
      ? 'Last 50'
      : mode === 'total'
      ? 'All-time'
      : selectedBrawlerId != null
      ? brawlerName(selectedBrawlerId)
      : 'Brawler';

  const allTimePieMetrics = allTimeMetrics.data?.overall;

  const headerText =
    mode === 'recent'
      ? 'Match History'
      : mode === 'total'
      ? 'Total Trophy Progression'
      : selectedBrawlerId != null
      ? `${brawlerName(selectedBrawlerId)} Progression`
      : 'Brawler Progression';

  const captionText =
    mode === 'recent'
      ? recent.data
        ? `Last ${recent.data.battles.length} battles`
        : ''
      : mode === 'total'
      ? allBattles.data
        ? `${allBattles.data.battles.length} battles total`
        : ''
      : brawlerBattles.data
      ? `Last ${brawlerBattles.data.battles.length} battles`
      : '';

  function renderChartSlot() {
    if (mode === 'recent') {
      if (recent.isPending) return <ChartSkeleton message="Loading battles…" typing />;
      if (recent.isError)
        return (
          <ChartError
            message={
              recent.error instanceof Error
                ? recent.error.message
                : 'unknown'
            }
          />
        );
      if (recent.data.battles.length === 0)
        return <ChartEmpty message="No recent battles found." />;
      return <TrophyChart battles={recent.data.battles} />;
    }
    if (mode === 'total') {
      if (allBattles.isPending) return <ChartSkeleton />;
      if (allBattles.isError)
        return (
          <ChartError
            message={
              allBattles.error instanceof Error
                ? allBattles.error.message
                : 'unknown'
            }
          />
        );
      if (allBattles.data.battles.length === 0)
        return <ChartEmpty message="No battle history yet." />;
      return (
        <TrophyTimelineChart
          points={allBattles.data.battles.map((b) => ({
            battleTime: b.battleTime,
            trophies: b.trophies,
          }))}
        />
      );
    }
    if (selectedBrawlerId == null)
      return <ChartEmpty message="Pick a brawler to view their progression." />;
    if (brawlerBattles.isPending) return <ChartSkeleton />;
    if (brawlerBattles.isError)
      return (
        <ChartError
          message={
            brawlerBattles.error instanceof Error
              ? brawlerBattles.error.message
              : 'unknown'
          }
        />
      );
    if (brawlerBattles.data.battles.length === 0)
      return <ChartEmpty message="No battles with this brawler." />;
    return (
      <TrophyChart
        battles={brawlerBattles.data.battles}
        valueKey="brawlerTrophies"
      />
    );
  }

  return (
    <div className="py-6 text-zinc-300">
      <div className={SECTION_MAX_W}>
        <DashboardHeader playerTag={playerTag} trophyChange={trophyChange} />
      </div>

      <section className={SECTION_MAX_W}>
        <div className="flex items-baseline justify-between mb-3">
          <h2 className="font-hello text-2xl font-semibold text-zinc-100 tracking-tight">
            <TypeAnimation
              key={headerText}
              sequence={[headerText]}
              speed={50}
              cursor={false}
              repeat={0}
            />
          </h2>
          <span className="text-xs uppercase tracking-wider text-zinc-500">
            {captionText}
          </span>
        </div>
        <div className="flex gap-6 items-stretch">
          <div className="w-60 flex-shrink-0 flex flex-col gap-4">
            <PieSlot
              metrics={modePieMetrics}
              label={modePieLabel}
              isPending={
                mode === 'recent'
                  ? last50Metrics.isPending
                  : allTimeMetrics.isPending
              }
              isError={
                mode === 'recent'
                  ? last50Metrics.isError
                  : allTimeMetrics.isError
              }
            />
            <PieSlot
              metrics={allTimePieMetrics}
              label="All-time"
              isPending={allTimeMetrics.isPending}
              isError={allTimeMetrics.isError}
            />
          </div>
          <div className="flex-1 min-w-0 max-w-5xl">{renderChartSlot()}</div>
          <div className="w-60 flex-shrink-0">
            <ChartModeSelector
              mode={mode}
              onModeChange={(m) => setMode(m)}
              selectedBrawlerId={selectedBrawlerId}
              onBrawlerSelect={(id) => {
                setSelectedBrawlerId(id);
                if (mode !== 'brawler') setMode('brawler');
              }}
              brawlerOptions={brawlerOptions}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
            />
          </div>
        </div>
      </section>
    </div>
  );
};

const PieSlot: React.FC<{
  metrics: { wins: number; draws: number; losses: number } | undefined;
  label: string;
  isPending: boolean;
  isError: boolean;
}> = ({ metrics, label, isPending, isError }) => {
  if (isPending) {
    return <div className="h-[170px] rounded bg-white/[0.04] animate-pulse" />;
  }
  if (isError || !metrics) {
    return (
      <div className="h-[170px] flex items-center justify-center text-xs text-zinc-500">
        —
      </div>
    );
  }
  return <WinrateChart metrics={metrics} compact label={label} />;
};

const ChartSkeleton: React.FC<{ message?: string; typing?: boolean }> = ({
  message,
  typing,
}) => {
  if (typing && message) {
    return (
      <div className="h-[360px] flex items-center justify-center text-zinc-400">
        <TypeAnimation
          sequence={[message]}
          speed={50}
          cursor={true}
          repeat={0}
        />
      </div>
    );
  }
  return <div className="h-[360px] rounded bg-white/[0.04] animate-pulse" />;
};

const ChartError: React.FC<{ message: string }> = ({ message }) => (
  <div className="h-[360px] flex items-center justify-center text-sm text-red-400">
    Error: {message}
  </div>
);

const ChartEmpty: React.FC<{ message: string }> = ({ message }) => (
  <div className="h-[360px] flex items-center justify-center text-sm text-zinc-500">
    {message}
  </div>
);

export default Dashboard;
