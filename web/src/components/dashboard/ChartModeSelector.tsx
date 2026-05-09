import type { BrawlerSuggestion } from '../../lib/brawlerSearch';

export type ChartMode = 'recent' | 'total' | 'brawler';

interface ChartModeSelectorProps {
  mode: ChartMode;
  onModeChange: (mode: ChartMode) => void;
  selectedBrawlerId: number | null;
  onBrawlerSelect: (id: number) => void;
  brawlerOptions: BrawlerSuggestion[];
  searchQuery: string;
  onSearchChange: (q: string) => void;
}

const MODES: { id: ChartMode; label: string }[] = [
  { id: 'recent', label: 'Recent Battles' },
  { id: 'total', label: 'Total Trophy' },
  { id: 'brawler', label: 'Brawler' },
];

const ChartModeSelector: React.FC<ChartModeSelectorProps> = ({
  mode,
  onModeChange,
  selectedBrawlerId,
  onBrawlerSelect,
  brawlerOptions,
  searchQuery,
  onSearchChange,
}) => {
  const brawlerActive = mode === 'brawler';

  const ensureBrawlerMode = () => {
    if (mode !== 'brawler') onModeChange('brawler');
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <span className="text-xs uppercase tracking-wider text-zinc-500 mb-1">View</span>
        {MODES.map((m) => {
          const active = mode === m.id;
          return (
            <button
              key={m.id}
              type="button"
              onClick={() => onModeChange(m.id)}
              className={
                'text-left px-3 py-2 rounded-md text-sm transition-colors ' +
                (active
                  ? 'bg-white/[0.08] text-zinc-100 border border-white/10'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.03] border border-transparent')
              }
            >
              {m.label}
            </button>
          );
        })}
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-xs uppercase tracking-wider text-zinc-500">Brawler</span>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => {
            ensureBrawlerMode();
            onSearchChange(e.target.value);
          }}
          onFocus={ensureBrawlerMode}
          placeholder="Search brawlers…"
          className="px-3 py-2 text-sm rounded-md bg-white/[0.03] border border-white/10 text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-white/30 transition-colors"
        />
        <div className="flex flex-col gap-1 max-h-64 overflow-y-auto pr-1">
          {brawlerOptions.length === 0 ? (
            <span className="text-xs text-zinc-500 px-1 py-2">No matches.</span>
          ) : (
            brawlerOptions.map((b) => {
              const active = brawlerActive && selectedBrawlerId === b.id;
              return (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => onBrawlerSelect(b.id)}
                  className={
                    'flex items-baseline justify-between px-2 py-1.5 rounded text-xs transition-colors text-left ' +
                    (active
                      ? 'bg-white/[0.08] text-zinc-100'
                      : 'text-zinc-300 hover:bg-white/[0.04]')
                  }
                >
                  <span className="truncate">{b.name}</span>
                  <span className="text-zinc-500 tabular-nums ml-2 shrink-0">
                    {b.games > 0 ? b.games : 'no data'}
                  </span>
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

export default ChartModeSelector;
