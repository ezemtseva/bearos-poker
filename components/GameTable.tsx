import type { Player } from "../types/game"

interface GameTableProps {
  tableId: string
  players: Player[]
}

export default function GameTable({ tableId, players }: GameTableProps) {
  // Ensure the owner is always in seat 1
  const sortedPlayers = [...players].sort((a, b) => {
    if (a.isOwner) return -1
    if (b.isOwner) return 1
    return a.seatNumber - b.seatNumber
  })

  // Assign seat numbers if not already assigned
  sortedPlayers.forEach((player, index) => {
    if (!player.seatNumber) {
      player.seatNumber = index + 1
    }
  })

  const seats = Array(6).fill(null)
  sortedPlayers.forEach((player) => {
    seats[player.seatNumber - 1] = player
  })

  return (
    <div className="relative w-[600px] h-[400px] mx-auto">
      {/* Poker table */}
      <div className="absolute inset-0 bg-green-600 border-8 border-black rounded-[50%]"></div>

      {/* Seats */}
      {seats.map((player, index) => {
        const angle = index * 60 * (Math.PI / 180)
        const xRadius = 280 // Horizontal radius
        const yRadius = 180 // Vertical radius
        const left = 300 + xRadius * Math.cos(angle)
        const top = 200 + yRadius * Math.sin(angle)

        return (
          <div
            key={index}
            className="absolute w-20 h-20 -ml-10 -mt-10 bg-gray-200 rounded-full flex items-center justify-center text-center shadow-md"
            style={{
              left: `${left}px`,
              top: `${top}px`,
            }}
          >
            {player ? (
              <div>
                <p className="font-bold text-sm">{player.name}</p>
                {player.isOwner && <p className="text-xs text-green-700">(Owner)</p>}
              </div>
            ) : (
              <p className="text-gray-500 text-sm">Seat {index + 1}</p>
            )}
          </div>
        )
      })}

      {/* Table ID */}
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-white font-bold">
        Table ID: {tableId}
      </div>
    </div>
  )
}

