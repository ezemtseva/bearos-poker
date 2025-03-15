import type { GameData, Card } from "../types/game"

// Extend the GameData type
type ExtendedGameData = GameData & {
  lastPlayedCard?: Card | null
}

// Use a more reliable client tracking mechanism
const connectedClients: Map<string, Set<(data: string) => void>> = new Map()

// Add a timestamp to track the last update for each table
const lastUpdateTimestamps: Map<string, number> = new Map()

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
    // Also clean up the timestamp when no clients are connected
    lastUpdateTimestamps.delete(tableId)
  }
}

// Update the sendSSEUpdate function to avoid duplicate updates
export async function sendSSEUpdate(tableId: string, gameData: ExtendedGameData) {
  const clients = connectedClients.get(tableId)

  // Only send updates if there are connected clients
  if (clients && clients.size > 0) {
    // Get the current timestamp
    const now = Date.now()

    // Get the last update timestamp for this table
    const lastUpdate = lastUpdateTimestamps.get(tableId) || 0

    // Only send updates if it's been at least 100ms since the last update
    // This prevents flooding clients with too many updates
    if (now - lastUpdate >= 100) {
      const message = `data: ${JSON.stringify(gameData)}\n\n`
      clients.forEach((send) => {
        send(message)
      })

      // Update the timestamp
      lastUpdateTimestamps.set(tableId, now)
    }
  }
}

