import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@vercel/postgres"
import type { GameData, Player } from "../../../types/game"

export const runtime = "edge"

const connectedClients: Map<string, Set<WebSocket>> = new Map()

async function getGameState(tableId: string): Promise<GameData> {
  const result = await sql`
    SELECT * FROM poker_games WHERE table_id = ${tableId};
  `
  if (result.rows.length === 0) {
    return {
      tableId,
      players: [],
      gameStarted: false,
      currentRound: 0,
      currentPlay: 0,
      currentTurn: 0,
      cardsOnTable: [],
      deck: [],
      scoreTable: Array.from({ length: 18 }, (_, index) => ({
        roundId: index + 1,
        roundName: index < 6 ? (index + 1).toString() : index < 12 ? "B" : (18 - index).toString(),
        scores: {},
      })),
    }
  }
  const row = result.rows[0]
  console.log("Game state from database:", row)
  return {
    tableId: row.table_id,
    players: row.players as Player[],
    gameStarted: row.game_started || false,
    currentRound: row.current_round || 0,
    currentPlay: row.current_play || 0,
    currentTurn: row.current_turn || 0,
    cardsOnTable: row.cards_on_table || [],
    deck: row.deck || [],
    scoreTable:
      row.score_table ||
      Array.from({ length: 18 }, (_, index) => ({
        roundId: index + 1,
        roundName: index < 6 ? (index + 1).toString() : index < 12 ? "B" : (18 - index).toString(),
        scores: {},
      })),
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const tableId = searchParams.get("tableId")

  console.log("[WebSocket] Connection attempt for table:", tableId)

  if (!tableId) {
    console.error("[WebSocket] No table ID provided")
    return new NextResponse("Table ID is required", { status: 400 })
  }

  const upgradeHeader = req.headers.get("upgrade")
  if (upgradeHeader !== "websocket") {
    return new NextResponse("Expected Upgrade: websocket", { status: 426 })
  }

  try {
    const { WebSocketPair } = await import("ws")
    const pair = new WebSocketPair() as unknown as [WebSocket, WebSocket]
    const [client, server] = pair

    if (!connectedClients.has(tableId)) {
      connectedClients.set(tableId, new Set())
    }
    connectedClients.get(tableId)!.add(client)

    console.log("[WebSocket] Connection established for table:", tableId)

    server.accept()
    server.send(JSON.stringify({ type: "connection", message: "Connected to server" }))

    server.addEventListener("message", async (event: MessageEvent) => {
      const data = JSON.parse(event.data as string)
      console.log("[WebSocket] Received message:", data)

      if (data.type === "join-game") {
        try {
          console.log("[WebSocket] Processing join-game request")
          // Update the database with the new player
          await sql`
            UPDATE poker_games 
            SET players = players || ${JSON.stringify([data.player])}::jsonb
            WHERE table_id = ${tableId};
          `

          // Fetch updated player list
          const updatedGame = await getGameState(tableId)

          console.log("[WebSocket] Updated game data:", updatedGame)

          // Broadcast the updated game data to all connected clients for this table
          const updateMessage = JSON.stringify({ type: "game-update", gameData: updatedGame })
          connectedClients.get(tableId)?.forEach((client) => {
            client.send(updateMessage)
          })
        } catch (error) {
          console.error("[WebSocket] Error processing join-game:", error)
          server.send(JSON.stringify({ type: "error", message: "Failed to join game" }))
        }
      }
    })

    server.addEventListener("close", () => {
      console.log("[WebSocket] Connection closed for table:", tableId)
      connectedClients.get(tableId)?.delete(client)
      if (connectedClients.get(tableId)?.size === 0) {
        connectedClients.delete(tableId)
      }
    })

    return new NextResponse(null, {
      status: 101,
      headers: {
        Upgrade: "websocket",
        Connection: "Upgrade",
      },
      webSocket: client,
    })
  } catch (error) {
    console.error("[WebSocket] Error setting up WebSocket:", error)
    return new NextResponse("Failed to set up WebSocket", { status: 500 })
  }
}

