import type { GameData, Card } from "../../types/game"

// Extend the GameData type
type ExtendedGameData = GameData & {
  lastPlayedCard?: Card | null
}

const connectedClients: Map<string, Set<(data: string) => void>> = new Map()

export function addClient(tableId: string, send: (data: string) => void) {
  if (!connectedClients.has(tableId)) {
    connectedClients.set(tableId, new Set())
  }
  connectedClients.get(tableId)!.add(send)
}

export function removeClient(tableId: string, send: (data: string) => void) {
  connectedClients.get(tableId)?.delete(send)
  if (connectedClients.get(tableId)?.size === 0) {
    connectedClients.delete(tableId)
  }
}

// Update the sendSSEUpdate function signature
export async function sendSSEUpdate(tableId: string, gameData: ExtendedGameData) {
  console.log("[SSE] Attempting to send update for table:", tableId)
  const clients = connectedClients.get(tableId)
  if (clients) {
    console.log(`[SSE] Found ${clients.size} connected clients for table:`, tableId)
    const message = `data: ${JSON.stringify(gameData)}\n\n`
    clients.forEach((send) => {
      console.log("[SSE] Sending update to client for table:", tableId)
      send(message)
    })
  } else {
    console.log("[SSE] No connected clients found for table:", tableId)
  }
}

