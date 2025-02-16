import type { NextRequest } from "next/server"
import { sql } from "@vercel/postgres"

export const runtime = "edge"

// Add this type definition
type WebSocketPair = {
  0: WebSocket
  1: WebSocket
}

const connectedClients = new Map<string, Set<WebSocket>>()

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const tableId = searchParams.get("tableId")

  if (!tableId) {
    return new Response("Table ID is required", { status: 400 })
  }

  const upgradeHeader = req.headers.get("Upgrade")
  if (upgradeHeader !== "websocket") {
    return new Response("Expected Upgrade: websocket", { status: 426 })
  }

  const { 0: client, 1: server } = new WebSocketPair()

  server.accept()

  if (!connectedClients.has(tableId)) {
    connectedClients.set(tableId, new Set())
  }
  connectedClients.get(tableId)!.add(server)

  server.send(JSON.stringify({ type: "connection", message: "Connected to server" }))

  server.addEventListener("message", async (event: MessageEvent) => {
    const data = JSON.parse(event.data as string)
    console.log("Received message:", data)

    if (data.type === "join-game") {
      // Update the database with the new player
      await sql`
        UPDATE poker_games 
        SET players = players || ${JSON.stringify([data.player])}::jsonb
        WHERE table_id = ${tableId};
      `

      // Fetch updated player list
      const result = await sql`
        SELECT players FROM poker_games WHERE table_id = ${tableId};
      `
      const updatedPlayers = result.rows[0].players

      // Broadcast the updated player list to all connected clients for this table
      const message = JSON.stringify({ type: "players-update", players: updatedPlayers })
      connectedClients.get(tableId)?.forEach((client) => {
        client.send(message)
      })
    }
  })

  server.addEventListener("close", () => {
    console.log("WebSocket connection closed")
    connectedClients.get(tableId)?.delete(server)
    if (connectedClients.get(tableId)?.size === 0) {
      connectedClients.delete(tableId)
    }
  })

  return new Response(null, {
    status: 101,
    webSocket: client,
  })
}

