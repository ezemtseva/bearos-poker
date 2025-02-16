import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@vercel/postgres"
import type { GameData, Player, ScoreTableRow } from "../../../../types/game"

export const runtime = "edge"

export async function POST(req: NextRequest) {
  const { tableId } = await req.json()

  if (!tableId) {
    return NextResponse.json({ error: "Table ID is required" }, { status: 400 })
  }

  try {
    // Update the game state in PostgreSQL
    const result = await sql`
      UPDATE poker_games
      SET game_started = true
      WHERE table_id = ${tableId}
      RETURNING *;
    `

    if (result.rowCount === 0) {
      return NextResponse.json({ error: "Game not found" }, { status: 404 })
    }

    const updatedGame = result.rows[0]
    const players = updatedGame.players as Player[]

    const scoreTable: ScoreTableRow[] = Array.from({ length: 18 }, (_, index) => {
      const roundId = index + 1
      let roundName
      if (roundId <= 6) {
        roundName = roundId.toString()
      } else if (roundId <= 12) {
        roundName = "B"
      } else {
        roundName = (19 - roundId).toString()
      }
      const scores = players.reduce(
        (acc, player) => {
          acc[player.name] = null
          return acc
        },
        {} as { [playerName: string]: number | null },
      )
      return { roundId, roundName, scores }
    })

    const gameData: GameData = {
      tableId: updatedGame.table_id,
      players: players,
      gameStarted: updatedGame.game_started,
      scoreTable: scoreTable,
    }

    // Broadcast the game start event to all connected clients
    const connectedClients = (global as any).connectedClients?.get(tableId)
    if (connectedClients) {
      const message = JSON.stringify({ type: "game-started", gameData })
      connectedClients.forEach((client: WebSocket) => {
        client.send(message)
      })
    }

    return NextResponse.json({ message: "Game started successfully", gameData })
  } catch (error) {
    console.error("Error starting game:", error)
    return NextResponse.json({ error: "Failed to start game" }, { status: 500 })
  }
}

