import type { NextRequest } from "next/server"
import { sql } from "@vercel/postgres"

export const runtime = "edge"

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

  try {
    const { socket, response } = await new Promise<{ socket: WebSocket; response: Response }>((resolve) => {
      // @ts-ignore
      const { socket, response } = req.upgradeWebSocket()

      socket.onopen = () => {
        console.log("WebSocket connection opened")
        if (!connectedClients.has(tableId)) {
          connectedClients.set(tableId, new Set())
        }
        connectedClients.get(tableId)!.add(socket)
        socket.send(JSON.stringify({ type: "connection", message: "Connected to server" }))
      }

      socket.onmessage = async (event: MessageEvent) => {
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
            if (client.readyState === WebSocket.OPEN) {
              client.send(message)
            }
          })
        }
      }

      socket.onclose = () => {
        console.log("WebSocket connection closed")
        connectedClients.get(tableId)?.delete(socket)
        if (connectedClients.get(tableId)?.size === 0) {
          connectedClients.delete(tableId)
        }
      }

      resolve({ socket, response })
    })

    return response
  } catch (error) {
    console.error("WebSocket upgrade failed:", error)
    return new Response("WebSocket upgrade failed", { status: 500 })
  }
}

