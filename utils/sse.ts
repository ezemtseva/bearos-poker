import type { GameData, Card } from "../types/game"

// Extend the GameData type
type ExtendedGameData = GameData & {
  lastPlayedCard?: Card | null
}

// Use a more reliable client tracking mechanism
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

// Update the sendSSEUpdate function to ensure reliable delivery
export async function sendSSEUpdate(tableId: string, gameData: ExtendedGameData) {
  const clients = connectedClients.get(tableId)

  // Only send updates if there are connected clients
  if (clients && clients.size > 0) {
    // Add a timestamp to help clients identify the latest update
    const timestampedData = {
      ...gameData,
      _timestamp: Date.now(),
    }

    const message = `data: ${JSON.stringify(timestampedData)}\n\n`

    // Send to all clients with error handling
    clients.forEach((send) => {
      try {
        send(message)
      } catch (error) {
        console.error(`[SSE] Error sending update to client for table ${tableId}:`, error)
        // We don't remove the client here as it might be a temporary issue
      }
    })
  }
}

