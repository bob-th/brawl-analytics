interface PlayerInfoProps{
    playerID: string
    show: boolean
}
const PlayerInfo: React.FC<PlayerInfoProps> = ({playerID, show}) =>
{
    return (
    <div style={{display: show? "block": "none" }}>
        <h1 className="text-3xl font-bold underline">
            Found Player:{playerID}
        </h1>
    </div>
    )
}
export default PlayerInfo