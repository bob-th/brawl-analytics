import { useQuery } from '@tanstack/react-query'
import type { BattlesList } from '../../types/BattleTypes.ts'
interface PlayerInfoProps{
    playerID: string
    show: boolean
}

const PlayerInfo: React.FC<PlayerInfoProps> = ({playerID, show}) =>
{
    
    const fetchPlayerData = async (id: string) : Promise<BattlesList> => {
      const url = `http://localhost:4000/api/players/${id}/battles`;
      const res = await fetch(url);
      if(!res.ok) {
        throw new Error(`backend error with status: ${res.status}`);
      }
      return res.json();
    }
    
    const { status, data, error } = useQuery({
      queryKey: ['players', playerID],
      queryFn: () => fetchPlayerData(playerID),
    })
    
    if (status === 'pending') {
      return <span>Loading...</span>
    }

    if (status === 'error') {
    return <span>Error: {error.message}</span>
    }
    console.log(data);
    return (
    <div style={{display: show? "block": "none" }}>
        <h1 className="text-3xl font-bold underline">
            Found Player:{playerID}

        </h1>
    </div>
    )
}
export default PlayerInfo