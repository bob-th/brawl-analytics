import { useQuery } from '@tanstack/react-query';
import { getPlayerProfile } from '../lib/api';

export function usePlayer(playerTag: string) {
  return useQuery({
    queryKey: ['player', playerTag],
    queryFn: () => getPlayerProfile(playerTag),
    enabled: Boolean(playerTag),
  });
}
