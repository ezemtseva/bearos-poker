import type { NextRequest } from "next/server"

export const runtime = "edge"

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
        socket.send(JSON.stringify({ type: "connection", message: "Connected to server" }))
      }

      socket.onmessage = (event: MessageEvent) => {
        const data = JSON.parse(event.data as string)
        console.log("Received message:", data)

        // Handle different message types
        switch (data.type) {
          case "join-game":
            // Logic for joining a game
            break
          case "game-update":
            // Logic for updating game state
            break
          default:
            console.log("Unknown message type:", data.type)
        }

        // Broadcast message to all clients in the same table
        // This is a simplified example. In a real app, you'd need to manage connections per table.
        socket.send(JSON.stringify(data))
      }

      socket.onclose = () => {
        console.log("WebSocket connection closed")
      }

      resolve({ socket, response })
    })

    return response
  } catch (error) {
    console.error("WebSocket upgrade failed:", error)
    return new Response("WebSocket upgrade failed", { status: 500 })
  }
}

