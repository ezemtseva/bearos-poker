import type { Player } from "../types/game"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"

interface GameTableProps {
  tableId: string
  players: Player[]
  isOwner: boolean
  gameStarted: boolean
  onShare: () => void
  onStartGame: () => void
}

export default function GameTable({ tableId, players, isOwner, gameStarted, onShare, onStartGame }: GameTableProps) {
  const sortedPlayers = [...players].sort((a, b) => {
    if (a.isOwner) return -1
    if (b.isOwner) return 1
    return a.seatNumber - b.seatNumber
  })

  sortedPlayers.forEach((player, index) => {
    if (!player.seatNumber) {
      player.seatNumber = index + 1
    }
  })

  const seats = Array(6).fill(null)
  sortedPlayers.forEach((player) => {
    seats[player.seatNumber - 1] = player
  })

  const scoreTableData = Array.from({ length: 18 }, (_, index) => {
    const roundId = index + 1
    let roundName
    if (roundId <= 6) {
      roundName = roundId.toString()
    } else if (roundId <= 12) {
      roundName = "B"
    } else {
      roundName = (19 - roundId).toString()
    }
    return { roundId, roundName }
  })

  const canStartGame = isOwner && players.length >= 2 && !gameStarted

  return (
    <div className="space-y-[100px]">
      {/* Buttons */}
      <div className="flex justify-center space-x-4">
        <Button onClick={onShare}>Share Game Link</Button>
        {canStartGame && <Button onClick={onStartGame}>Start Game</Button>}
      </div>

      {/* Table with seats */}
      <div className="py-[50px]">
        <div className="relative w-[600px] h-[400px] mx-auto">
          <div className="absolute inset-0 bg-green-600 border-8 border-black rounded-[50%]"></div>
          {seats.map((player, index) => {
            const angle = index * 60 * (Math.PI / 180)
            const xRadius = 280
            const yRadius = 180
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

          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-white font-bold">
            Table ID: {tableId}
          </div>
        </div>
      </div>

      {/* Score Table */}
      <div className="max-w-3xl mx-auto py-[50px]">
        <h2 className="text-2xl font-bold mb-4">Score Table</h2>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Round ID</TableHead>
              <TableHead>Round Name</TableHead>
              {players.map((player) => (
                <TableHead key={player.name}>{player.name}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {scoreTableData.map((round) => (
              <TableRow key={round.roundId}>
                <TableCell>{round.roundId}</TableCell>
                <TableCell>{round.roundName}</TableCell>
                {players.map((player) => (
                  <TableCell key={player.name}>-</TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}

