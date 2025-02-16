import type { Player } from "../types/game"

interface GameTableProps {
  tableId: string
  players: Player[]
}

export default function GameTable({ tableId, players }: GameTableProps) {
  return (
    <table>
      <thead>
        <tr>
          <th>Seat</th>
          <th>Player</th>
        </tr>
      </thead>
      <tbody>
        {players.map((player) => (
          <tr key={player.name}>
            <td>{player.seatNumber}</td>
            <td>{player.name}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

