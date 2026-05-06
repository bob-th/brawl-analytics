import { useQuery } from '@tanstack/react-query';
import { getPlayerBrawlerBattles } from '../lib/api';

export function usePlayerBrawlerBattles(
  playerTag: string,
  brawlerId: number | null,
  limit = 50
) {
  return useQuery({
    queryKey: ['brawler-battles', playerTag, brawlerId, limit],
    queryFn: () => getPlayerBrawlerBattles(playerTag, brawlerId as number, limit),
    enabled: Boolean(playerTag) && brawlerId != null,
  });
}
