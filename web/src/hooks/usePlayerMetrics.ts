import { useQuery } from '@tanstack/react-query';
import { getPlayerMetrics } from '../lib/api';

export function usePlayerMetrics(playerTag: string, limit = 50) {
  return useQuery({
    queryKey: ['metrics', playerTag, limit],
    queryFn: () => getPlayerMetrics(playerTag, limit),
    enabled: Boolean(playerTag),
  });
}
