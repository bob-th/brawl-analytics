interface ChartPaginationProps {
  pageIndex: number;
  pageSize: number;
  currentPageBattleCount: number;
  hasPrev: boolean;
  hasNext: boolean;
  isLoadingNext: boolean;
  onPrev: () => void;
  onNext: () => void;
}

const ARROW_BTN_BASE =
  'inline-flex items-center justify-center h-8 w-8 rounded-md border border-white/10 text-zinc-300 transition-colors';
const ARROW_BTN_ACTIVE = 'hover:bg-white/[0.06] hover:text-zinc-100';
const ARROW_BTN_DISABLED = 'opacity-40 cursor-not-allowed';

const ChartPagination: React.FC<ChartPaginationProps> = ({
  pageIndex,
  pageSize,
  currentPageBattleCount,
  hasPrev,
  hasNext,
  isLoadingNext,
  onPrev,
  onNext,
}) => {
  const start = pageIndex * pageSize + 1;
  const end = pageIndex * pageSize + currentPageBattleCount;

  return (
    <div className="flex items-center justify-center gap-4 mt-2">
      <button
        type="button"
        onClick={onPrev}
        disabled={!hasPrev}
        aria-label="Previous page"
        className={`${ARROW_BTN_BASE} ${hasPrev ? ARROW_BTN_ACTIVE : ARROW_BTN_DISABLED}`}
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="15 18 9 12 15 6" />
        </svg>
      </button>
      <span className="text-xs uppercase tracking-wider text-zinc-500 tabular-nums min-w-[120px] text-center">
        Battles {start}–{end}
      </span>
      <button
        type="button"
        onClick={onNext}
        disabled={!hasNext}
        aria-label="Next page"
        className={`${ARROW_BTN_BASE} ${hasNext ? ARROW_BTN_ACTIVE : ARROW_BTN_DISABLED} relative`}
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="9 18 15 12 9 6" />
        </svg>
        {isLoadingNext && (
          <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-white/40 animate-pulse" />
        )}
      </button>
    </div>
  );
};

export default ChartPagination;
