import { useQuery } from '@tanstack/react-query';
import { getRecentBattles } from '../lib/api';

export function useRecentBattles(playerTag: string, limit = 25) {
  return useQuery({
    queryKey: ['recent-battles', playerTag, limit],
    queryFn: () => getRecentBattles(playerTag, limit),
    enabled: Boolean(playerTag),
  });
}
