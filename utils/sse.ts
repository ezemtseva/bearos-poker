import type { GameData, Card } from "../types/game"

// Extend the GameData type
type ExtendedGameData = GameData & {
  lastPlayedCard?: Card | null
}

// Use a more reliable client tracking mechanism
const connectedClients: Map<string, Set<(data: string) => void>> = new Map()

export function addClient(tableId: string, send: (data: string) => void) {
  console.log(`[SSE] Adding client for table: ${tableId}`)
  if (!connectedClients.has(tableId)) {
    connectedClients.set(tableId, new Set())
  }
  connectedClients.get(tableId)!.add(send)
  console.log(`[SSE] Client added. Total clients for table ${tableId}: ${connectedClients.get(tableId)?.size || 0}`)
}

export function removeClient(tableId: string, send: (data: string) => void) {
  console.log(`[SSE] Removing client for table: ${tableId}`)
  connectedClients.get(tableId)?.delete(send)
  if (connectedClients.get(tableId)?.size === 0) {
    connectedClients.delete(tableId)
  }
  console.log(`[SSE] Client removed. Total clients for table ${tableId}: ${connectedClients.get(tableId)?.size || 0}`)
}

// Update the sendSSEUpdate function signature
export async function sendSSEUpdate(tableId: string, gameData: ExtendedGameData) {
  console.log("[SSE] Attempting to send update for table:", tableId)
  const clients = connectedClients.get(tableId)
  if (clients && clients.size > 0) {
    console.log(`[SSE] Found ${clients.size} connected clients for table:`, tableId)
    const message = `data: ${JSON.stringify(gameData)}\n\n`
    clients.forEach((send) => {
      console.log("[SSE] Sending update to client for table:", tableId)
      send(message)
    })
  } else {
    console.log("[SSE] No connected clients found for table:", tableId)

    // If no clients are connected, we'll still update the database
    // This ensures the game state is correct when clients reconnect
    console.log("[SSE] No clients connected, but game state has been updated in the database")
  }
}

