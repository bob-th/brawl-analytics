import { useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { TypeAnimation } from 'react-type-animation';
import { useBattlePagination } from '../hooks/useBattlePagination';
import { usePlayerMetrics } from '../hooks/usePlayerMetrics';
import { usePlayerBattles } from '../hooks/usePlayerBattles';
import DashboardHeader from '../components/dashboard/DashboardHeader';
import TrophyChart from '../components/dashboard/TrophyChart';
import TrophyTimelineChart from '../components/dashboard/TrophyTimelineChart';
import WinrateChart from '../components/dashboard/WinrateChart';
import ChartPagination from '../components/dashboard/ChartPagination';
import AnimatedChartFrame from '../components/dashboard/AnimatedChartFrame';
import ChartModeSelector, {
  type ChartMode,
} from '../components/dashboard/ChartModeSelector';
import { getTotalTrophyChange } from '../lib/battleStats';
import { searchAllBrawlers, topBrawlersByGames } from '../lib/brawlerSearch';
import { brawlerName } from '../data/brawlers';

const SECTION_MAX_W = 'max-w-[1552px]';
const PAGE_SIZE = 25;

function pageRangeLabel(pageIndex: number, count: number): string {
  if (count === 0) return '—';
  const start = pageIndex * PAGE_SIZE + 1;
  const end = pageIndex * PAGE_SIZE + count;
  return `Battles ${start}–${end}`;
}

const Dashboard: React.FC = () => {
  const { tag } = useParams<{ tag: string }>();
  const playerTag = tag ?? '';

  const [mode, setMode] = useState<ChartMode>('recent');
  const [selectedBrawlerId, setSelectedBrawlerId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const recent = useBattlePagination({
    playerTag,
    source: 'recent',
    brawlerId: null,
  });
  const brawler = useBattlePagination({
    playerTag,
    source: 'brawler',
    brawlerId: mode === 'brawler' ? selectedBrawlerId : null,
  });
  const allTimeMetrics = usePlayerMetrics(playerTag);
  const allBattles = usePlayerBattles(playerTag);

  const brawlerOptions = useMemo(() => {
    if (!allTimeMetrics.data) return [];
    return searchQuery.trim().length === 0
      ? topBrawlersByGames(allTimeMetrics.data, 5)
      : searchAllBrawlers(allTimeMetrics.data, searchQuery);
  }, [allTimeMetrics.data, searchQuery]);

  if (!playerTag) {
    return <div className="py-6 text-zinc-300">No player tag in URL.</div>;
  }

  // Trophy change displayed in the header — windowed to the currently visible
  // 25 so it matches what the user sees on the chart.
  const trophyChange =
    recent.page && recent.page.battles.length > 0
      ? getTotalTrophyChange(recent.page.battles)
      : undefined;

  const modePieMetrics =
    mode === 'recent'
      ? recent.page?.metrics
      : mode === 'total'
      ? allTimeMetrics.data?.overall
      : selectedBrawlerId != null
      ? brawler.page?.metrics
      : undefined;

  const modePieLabel =
    mode === 'recent'
      ? recent.page
        ? pageRangeLabel(recent.pageIndex, recent.page.battles.length)
        : 'Recent'
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
      ? recent.page
        ? pageRangeLabel(recent.pageIndex, recent.page.battles.length)
        : ''
      : mode === 'total'
      ? allBattles.data
        ? `${allBattles.data.battles.length} battles total`
        : ''
      : brawler.page
      ? pageRangeLabel(brawler.pageIndex, brawler.page.battles.length)
      : '';

  function renderRecentSlot() {
    // Only show skeleton when we've never had a page (first mount). Once we
    // have any page data, keep showing it through subsequent fetches via
    // keepPreviousData.
    if (recent.isPending && !recent.page) {
      return <ChartSkeleton message="Loading battles…" typing />;
    }
    if (recent.isError && !recent.page) {
      return (
        <ChartError
          message={recent.error instanceof Error ? recent.error.message : 'unknown'}
        />
      );
    }
    if (!recent.page || recent.page.battles.length === 0) {
      return <ChartEmpty message="No recent battles found." />;
    }
    const pageKey = `recent:${recent.page.pageIndex}`;
    return (
      <div>
        <AnimatedChartFrame pageKey={pageKey} direction={recent.direction}>
          <TrophyChart battles={recent.page.battles} />
        </AnimatedChartFrame>
        {!recent.shouldHidePagination && (
          <ChartPagination
            pageIndex={recent.page.pageIndex}
            pageSize={PAGE_SIZE}
            currentPageBattleCount={recent.page.battles.length}
            hasPrev={recent.hasPrev}
            hasNext={recent.hasNext}
            isLoadingNext={recent.isPrefetchingNext}
            onPrev={recent.goPrev}
            onNext={recent.goNext}
          />
        )}
      </div>
    );
  }

  function renderTotalSlot() {
    if (allBattles.isPending) return <ChartSkeleton />;
    if (allBattles.isError)
      return (
        <ChartError
          message={
            allBattles.error instanceof Error ? allBattles.error.message : 'unknown'
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

  function renderBrawlerSlot() {
    if (selectedBrawlerId == null) {
      return <ChartEmpty message="Pick a brawler to view their progression." />;
    }
    if (brawler.isPending && !brawler.page) {
      return <ChartSkeleton />;
    }
    if (brawler.isError && !brawler.page) {
      return (
        <ChartError
          message={brawler.error instanceof Error ? brawler.error.message : 'unknown'}
        />
      );
    }
    if (!brawler.page || brawler.page.battles.length === 0) {
      return <ChartEmpty message="Not enough data available." />;
    }
    const pageKey = `brawler:${selectedBrawlerId}:${brawler.page.pageIndex}`;
    return (
      <div>
        <AnimatedChartFrame pageKey={pageKey} direction={brawler.direction}>
          <TrophyChart battles={brawler.page.battles} valueKey="brawlerTrophies" />
        </AnimatedChartFrame>
        {!brawler.shouldHidePagination && (
          <ChartPagination
            pageIndex={brawler.page.pageIndex}
            pageSize={PAGE_SIZE}
            currentPageBattleCount={brawler.page.battles.length}
            hasPrev={brawler.hasPrev}
            hasNext={brawler.hasNext}
            isLoadingNext={brawler.isPrefetchingNext}
            onPrev={brawler.goPrev}
            onNext={brawler.goNext}
          />
        )}
      </div>
    );
  }

  function renderChartSlot() {
    if (mode === 'recent') return renderRecentSlot();
    if (mode === 'total') return renderTotalSlot();
    return renderBrawlerSlot();
  }

  const pieIsPending =
    mode === 'recent'
      ? recent.isPending && !recent.page
      : mode === 'brawler'
      ? brawler.isPending && !brawler.page
      : allTimeMetrics.isPending;
  const pieIsError =
    mode === 'recent'
      ? recent.isError && !recent.page
      : mode === 'brawler'
      ? brawler.isError && !brawler.page
      : allTimeMetrics.isError;

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
              isPending={pieIsPending}
              isError={pieIsError}
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
