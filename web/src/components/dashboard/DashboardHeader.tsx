import { usePlayer } from '../../hooks/usePlayer';

interface DashboardHeaderProps {
  playerTag: string;
}

const DashboardHeader: React.FC<DashboardHeaderProps> = ({ playerTag }) => {
  const { data, isPending, isError } = usePlayer(playerTag);

  const displayTag = playerTag.startsWith('#') ? playerTag : `#${playerTag}`;

  if (isPending) {
    return (
      <header className="mb-6 text-zinc-400">
        <div className="h-8 w-48 rounded bg-white/[0.04] animate-pulse" />
      </header>
    );
  }

  if (isError || !data) {
    return (
      <header className="mb-6">
        <h1 className="font-hello text-3xl text-zinc-200">{displayTag}</h1>
      </header>
    );
  }

  return (
    <header className="mb-6 flex items-end justify-between gap-4 flex-wrap">
      <div>
        <h1 className="font-hello text-3xl text-zinc-100 leading-tight">
          {data.name}
        </h1>
        <div className="text-sm text-zinc-400">
          <span>{data.tag}</span>
          {data.club ? <span> · {data.club.name}</span> : null}
        </div>
      </div>
      <div className="text-right">
        <div className="text-2xl text-zinc-200 tabular-nums">
          {data.trophies.toLocaleString()}
        </div>
        <div className="text-xs uppercase tracking-wider text-zinc-500">
          Trophies
        </div>
      </div>
    </header>
  );
};

export default DashboardHeader;
