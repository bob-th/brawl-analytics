import { useQuery } from '@tanstack/react-query';
import { getPlayerMetrics } from '../lib/api';

export function usePlayerMetrics(playerTag: string) {
  return useQuery({
    queryKey: ['metrics', playerTag],
    queryFn: () => getPlayerMetrics(playerTag),
    enabled: Boolean(playerTag),
  });
}
