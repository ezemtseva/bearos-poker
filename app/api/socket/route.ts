import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@vercel/postgres"
import type { GameData, Player } from "../../../types/game"

export const runtime = "edge"

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const tableId = searchParams.get("tableId")

  console.log("[SSE] Connection attempt for table:", tableId)

  if (!tableId) {
    console.error("[SSE] No table ID provided")
    return new NextResponse("Table ID is required", { status: 400 })
  }

  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      const sendEvent = (event: string, data: string) => {
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${data}\n\n`))
      }

      // Send initial game state
      const initialState = await getGameState(tableId)
      sendEvent("init", JSON.stringify(initialState))

      // Set up polling for game updates
      const pollInterval = setInterval(async () => {
        const latestState = await getGameState(tableId)
        sendEvent("update", JSON.stringify(latestState))
      }, 5000) // Poll every 5 seconds

      // Heartbeat to keep connection alive
      const heartbeat = setInterval(() => {
        sendEvent("heartbeat", "ping")
      }, 30000)

      // Clean up on close
      req.signal.addEventListener("abort", () => {
        clearInterval(pollInterval)
        clearInterval(heartbeat)
      })
    },
  })

  return new NextResponse(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  })
}

async function getGameState(tableId: string): Promise<GameData> {
  const result = await sql`
    SELECT * FROM poker_games WHERE table_id = ${tableId};
  `
  if (result.rows.length === 0) {
    return { tableId, players: [], gameStarted: false }
  }
  const row = result.rows[0]
  console.log("Game state from database:", row)
  return {
    tableId: row.table_id,
    players: row.players as Player[],
    gameStarted: row.game_started || false,
  }
}

export async function POST(req: NextRequest) {
  const { tableId, action, player } = await req.json()

  if (!tableId || !action) {
    return new NextResponse("Table ID and action are required", { status: 400 })
  }

  let updatedState: GameData

  switch (action) {
    case "join":
      updatedState = await joinGame(tableId, player)
      break
    case "leave":
      updatedState = await leaveGame(tableId, player)
      break
    default:
      return new NextResponse("Invalid action", { status: 400 })
  }

  return new NextResponse(JSON.stringify(updatedState), {
    headers: { "Content-Type": "application/json" },
  })
}

async function joinGame(tableId: string, player: Player): Promise<GameData> {
  const result = await sql`
    UPDATE poker_games 
    SET players = players || ${JSON.stringify([player])}::jsonb
    WHERE table_id = ${tableId}
    RETURNING *;
  `
  const row = result.rows[0]
  return {
    tableId: row.table_id,
    players: row.players as Player[],
    gameStarted: row.game_started || false,
  }
}

async function leaveGame(tableId: string, player: Player): Promise<GameData> {
  const result = await sql`
    UPDATE poker_games 
    SET players = (
      SELECT jsonb_agg(p)
      FROM jsonb_array_elements(players) p
      WHERE p->>'name' != ${player.name}
    )
    WHERE table_id = ${tableId}
    RETURNING *;
  `
  const row = result.rows[0]
  return {
    tableId: row.table_id,
    players: row.players as Player[],
    gameStarted: row.game_started || false,
  }
}

