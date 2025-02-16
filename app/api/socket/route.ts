import type { NextRequest } from "next/server"
import { sql } from "@vercel/postgres"

declare module "next/server" {
  interface NextRequest {
    upgradeWebSocket(): Promise<{ socket: WebSocket; response: Response }>
  }
}

export const runtime = "edge"

const connectedClients = new Map<string, Set<WebSocket>>()

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const tableId = searchParams.get("tableId")

  console.log("[WebSocket] Connection attempt for table:", tableId)

  if (!tableId) {
    console.error("[WebSocket] No table ID provided")
    return new Response("Table ID is required", { status: 400 })
  }

  try {
    const { socket, response } = await req.upgradeWebSocket()

    if (!socket) {
      console.error("[WebSocket] Failed to upgrade to WebSocket")
      return new Response("WebSocket upgrade failed", { status: 500 })
    }

    if (!connectedClients.has(tableId)) {
      connectedClients.set(tableId, new Set())
    }
    connectedClients.get(tableId)!.add(socket)

    console.log("[WebSocket] Connection established for table:", tableId)

    socket.addEventListener("open", () => {
      console.log("[WebSocket] Connection opened for table:", tableId)
      socket.send(JSON.stringify({ type: "connection", message: "Connected to server" }))
    })

    socket.addEventListener("message", async (event: MessageEvent) => {
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
          const result = await sql`
            SELECT players FROM poker_games WHERE table_id = ${tableId};
          `
          const updatedPlayers = result.rows[0].players

          console.log("[WebSocket] Updated players:", updatedPlayers)

          // Broadcast the updated player list to all connected clients for this table
          const message = JSON.stringify({ type: "players-update", players: updatedPlayers })
          connectedClients.get(tableId)?.forEach((client) => {
            client.send(message)
          })
        } catch (error) {
          console.error("[WebSocket] Error processing join-game:", error)
          socket.send(JSON.stringify({ type: "error", message: "Failed to join game" }))
        }
      }
    })

    socket.addEventListener("close", () => {
      console.log("[WebSocket] Connection closed for table:", tableId)
      connectedClients.get(tableId)?.delete(socket)
      if (connectedClients.get(tableId)?.size === 0) {
        connectedClients.delete(tableId)
      }
    })

    return response
  } catch (error) {
    console.error("[WebSocket] Error setting up WebSocket:", error)
    return new Response("Failed to set up WebSocket", { status: 500 })
  }
}

