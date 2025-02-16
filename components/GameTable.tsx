import type React from "react"

interface Player {
  name: string
  seatNumber: number
  isOwner: boolean
}

interface GameTableProps {
  tableId: string
  players: Player[]
}

const GameTable: React.FC<GameTableProps> = ({ tableId, players }) => {
  const seats = Array(6).fill(null)

  players.forEach((player) => {
    seats[player.seatNumber - 1] = player
  })

  return (
    <div className="container mx-auto px-4 py-8">
      <h2 className="text-2xl font-bold mb-4">Game Table: {tableId}</h2>
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
      </div>
    </div>
  )
}

export default GameTable

