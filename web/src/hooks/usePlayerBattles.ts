import { useQuery } from '@tanstack/react-query';
import { getPlayerBattles } from '../lib/api';

export function usePlayerBattles(playerTag: string) {
  return useQuery({
    queryKey: ['battles', playerTag],
    queryFn: () => getPlayerBattles(playerTag),
    enabled: Boolean(playerTag),
  });
}
