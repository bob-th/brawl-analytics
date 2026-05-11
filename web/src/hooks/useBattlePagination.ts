import { useEffect, useState } from 'react';
import {
  keepPreviousData,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { getPlayerBrawlerBattles, getRecentBattles } from '../lib/api';
import type {
  BattlePage,
  BattlePageSource,
  PlayerBrawlerBattlesResponse,
  RecentBattlesResponse,
} from '../types/battle';

const PAGE_SIZE = 25;
const INITIAL_BULK_LIMIT = 100;
const INITIAL_BULK_PAGES = INITIAL_BULK_LIMIT / PAGE_SIZE;
const PAGE_GC_MS = 30 * 60 * 1000;

interface UseBattlePaginationArgs {
  playerTag: string;
  source: BattlePageSource;
  brawlerId: number | null;
}

function emptyCell() {
  return { wins: 0, draws: 0, losses: 0 };
}

function fetchPage(
  source: BattlePageSource,
  playerTag: string,
  brawlerId: number | null,
  pageIndex: number
): Promise<BattlePage> {
  const offset = pageIndex * PAGE_SIZE;
  const promise: Promise<RecentBattlesResponse | PlayerBrawlerBattlesResponse> =
    source === 'recent'
      ? getRecentBattles(playerTag, PAGE_SIZE, offset)
      : getPlayerBrawlerBattles(playerTag, brawlerId as number, PAGE_SIZE, offset);
  return promise.then((resp) => ({
    battles: resp.battles,
    metrics: resp.intervals[0] ?? emptyCell(),
    pageIndex,
    isLastPage: resp.battles.length < PAGE_SIZE,
  }));
}

function pageKey(
  source: BattlePageSource,
  playerTag: string,
  brawlerId: number | null,
  pageIndex: number
) {
  return ['battle-page', source, playerTag, brawlerId, pageIndex] as const;
}

export function useBattlePagination({
  playerTag,
  source,
  brawlerId,
}: UseBattlePaginationArgs) {
  const qc = useQueryClient();
  const [pageIndex, setPageIndex] = useState(0);
  const [direction, setDirection] = useState<1 | -1 | 0>(0);
  const [maxKnownPage, setMaxKnownPage] = useState<number | null>(null);
  const [bulkLoaded, setBulkLoaded] = useState(false);

  const enabled =
    Boolean(playerTag) && (source === 'recent' || brawlerId != null);

  // Reset pagination state whenever the data context changes. This covers
  // player-tag changes (URL nav), source toggles, and brawler switches.
  useEffect(() => {
    setPageIndex(0);
    setDirection(0);
    setMaxKnownPage(null);
    setBulkLoaded(false);
  }, [playerTag, source, brawlerId]);

  // Initial bulk fetch: one round trip for 100 battles, then split into
  // 4 per-page cache entries via setQueryData. The bulk-key is its own
  // dedup so concurrent mounts share one in-flight request.
  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;

    (async () => {
      try {
        const bulkKey = [
          'battle-page-bulk',
          source,
          playerTag,
          brawlerId,
        ] as const;
        const resp = await qc.fetchQuery({
          queryKey: bulkKey,
          queryFn: () =>
            source === 'recent'
              ? getRecentBattles(playerTag, INITIAL_BULK_LIMIT, 0)
              : getPlayerBrawlerBattles(
                  playerTag,
                  brawlerId as number,
                  INITIAL_BULK_LIMIT,
                  0
                ),
          staleTime: Infinity,
        });
        if (cancelled) return;

        // Cache invalidation guard: if we already have a page-0 cached for this
        // (source, player, brawler) and its first battle differs from this fresh
        // bulk response, the player has new battles and our page boundaries have
        // shifted — drop all per-page entries before repopulating.
        const existingPage0 = qc.getQueryData<BattlePage>(
          pageKey(source, playerTag, brawlerId, 0)
        );
        if (
          existingPage0 &&
          resp.battles[0]?.battleTime !==
            existingPage0.battles[0]?.battleTime
        ) {
          qc.removeQueries({
            queryKey: ['battle-page', source, playerTag, brawlerId],
          });
        }

        let lastSeenIsLast = false;
        for (let i = 0; i < INITIAL_BULK_PAGES; i++) {
          const slice = resp.battles.slice(i * PAGE_SIZE, (i + 1) * PAGE_SIZE);
          if (slice.length === 0) {
            // No more battles — page i-1 was the last page.
            if (i > 0) setMaxKnownPage(i - 1);
            break;
          }
          const page: BattlePage = {
            battles: slice,
            metrics: resp.intervals[i] ?? emptyCell(),
            pageIndex: i,
            isLastPage: slice.length < PAGE_SIZE,
          };
          qc.setQueryData(pageKey(source, playerTag, brawlerId, i), page);
          if (page.isLastPage) {
            setMaxKnownPage(i);
            lastSeenIsLast = true;
            break;
          }
        }
        // If we filled all 4 pages with full slices, more pages may exist —
        // leave maxKnownPage as null so prefetch/per-page query can discover.
        void lastSeenIsLast;

        setBulkLoaded(true);
      } catch {
        // Even on bulk failure, unblock per-page query so it can surface its
        // own error (and let the user retry).
        if (!cancelled) setBulkLoaded(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [enabled, source, playerTag, brawlerId, qc]);

  // Subscribe to current page. Pages 0-3 will hit the cache populated by the
  // bulk fetch (queryFn never runs). Pages 4+ trigger a real fetch.
  const pageQuery = useQuery<BattlePage>({
    queryKey: pageKey(source, playerTag, brawlerId, pageIndex),
    queryFn: () => fetchPage(source, playerTag, brawlerId, pageIndex),
    enabled: enabled && bulkLoaded,
    staleTime: Infinity,
    gcTime: PAGE_GC_MS,
    placeholderData: keepPreviousData,
  });

  // Subscribe to the next page — this doubles as the prefetch. We don't enable
  // it if the current page is already known to be last, or if maxKnownPage
  // tells us pageIndex+1 is past the end.
  const nextEnabled =
    enabled &&
    bulkLoaded &&
    !pageQuery.data?.isLastPage &&
    (maxKnownPage == null || pageIndex + 1 <= maxKnownPage);
  const nextPageQuery = useQuery<BattlePage>({
    queryKey: pageKey(source, playerTag, brawlerId, pageIndex + 1),
    queryFn: () => fetchPage(source, playerTag, brawlerId, pageIndex + 1),
    enabled: nextEnabled,
    staleTime: Infinity,
    gcTime: PAGE_GC_MS,
  });

  // Discover end-of-pages via either the current page (isLastPage) or the
  // next-page probe (returned 0 battles, so we're already at the end).
  useEffect(() => {
    if (
      pageQuery.data &&
      !pageQuery.isPlaceholderData &&
      pageQuery.data.isLastPage &&
      pageQuery.data.battles.length > 0
    ) {
      setMaxKnownPage((prev) =>
        prev == null
          ? pageQuery.data!.pageIndex
          : Math.min(prev, pageQuery.data!.pageIndex)
      );
    }
    if (
      nextPageQuery.data &&
      nextPageQuery.data.battles.length === 0
    ) {
      setMaxKnownPage((prev) =>
        prev == null ? pageIndex : Math.min(prev, pageIndex)
      );
    }
  }, [
    pageQuery.data,
    pageQuery.isPlaceholderData,
    nextPageQuery.data,
    pageIndex,
  ]);

  const hasPrev = pageIndex > 0;
  const hasNext =
    !pageQuery.isPlaceholderData &&
    !pageQuery.data?.isLastPage &&
    !(nextPageQuery.data && nextPageQuery.data.battles.length === 0) &&
    (maxKnownPage == null || pageIndex < maxKnownPage);

  // direction encodes the visual slide: 1 = new content enters from the right,
  // -1 = enters from the left. Older battles live to the left in the UI
  // (left arrow = goNext = higher pageIndex), so going "next" slides in from
  // the left.
  const goNext = () => {
    if (!hasNext) return;
    setDirection(-1);
    setPageIndex((p) => p + 1);
  };
  const goPrev = () => {
    if (!hasPrev) return;
    setDirection(1);
    setPageIndex((p) => p - 1);
  };

  // Hide pagination entirely when the player has 25 or fewer battles — no
  // arrows have anywhere to go.
  const shouldHidePagination =
    bulkLoaded &&
    pageIndex === 0 &&
    !pageQuery.isPlaceholderData &&
    pageQuery.data?.isLastPage === true;

  const isPrefetchingNext =
    nextEnabled && nextPageQuery.isFetching && !nextPageQuery.data;

  return {
    pageIndex,
    page: pageQuery.data,
    isPlaceholderData: pageQuery.isPlaceholderData,
    isPending: pageQuery.isPending,
    isError: pageQuery.isError,
    error: pageQuery.error,
    hasNext,
    hasPrev,
    goNext,
    goPrev,
    direction,
    isPrefetchingNext,
    shouldHidePagination,
  };
}
