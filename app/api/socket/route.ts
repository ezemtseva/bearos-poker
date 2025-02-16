import type { NextRequest } from "next/server"
import { sql } from "@vercel/postgres"

export const runtime = "edge"

declare class WebSocketPair {
  0: WebSocket
  1: WebSocket
}

const connectedClients = new Map<string, Set<WebSocket>>()

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const tableId = searchParams.get("tableId")

  console.log("WebSocket connection attempt for table:", tableId)

  if (!tableId) {
    console.error("No table ID provided")
    return new Response("Table ID is required", { status: 400 })
  }

  const upgradeHeader = req.headers.get("Upgrade")
  if (upgradeHeader !== "websocket") {
    console.error("Invalid upgrade header:", upgradeHeader)
    return new Response("Expected Upgrade: websocket", { status: 426 })
  }

  try {
    const pair = new WebSocketPair()
    const client = pair[0]
    const server = pair[1]

    server.accept()

    if (!connectedClients.has(tableId)) {
      connectedClients.set(tableId, new Set())
    }
    connectedClients.get(tableId)!.add(server)

    console.log("WebSocket connection established for table:", tableId)

    server.send(JSON.stringify({ type: "connection", message: "Connected to server" }))

    server.addEventListener("message", async (event: MessageEvent) => {
      const data = JSON.parse(event.data as string)
      console.log("Received message:", data)

      if (data.type === "join-game") {
        try {
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

          console.log("Updated players:", updatedPlayers)

          // Broadcast the updated player list to all connected clients for this table
          const message = JSON.stringify({ type: "players-update", players: updatedPlayers })
          connectedClients.get(tableId)?.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
              client.send(message)
            }
          })
        } catch (error) {
          console.error("Error processing join-game:", error)
          server.send(JSON.stringify({ type: "error", message: "Failed to join game" }))
        }
      }
    })

    server.addEventListener("close", () => {
      console.log("WebSocket connection closed for table:", tableId)
      connectedClients.get(tableId)?.delete(server)
      if (connectedClients.get(tableId)?.size === 0) {
        connectedClients.delete(tableId)
      }
    })

    return new Response(null, {
      status: 101,
      webSocket: client,
    })
  } catch (error) {
    console.error("Error setting up WebSocket:", error)
    return new Response("Failed to set up WebSocket", { status: 500 })
  }
}

