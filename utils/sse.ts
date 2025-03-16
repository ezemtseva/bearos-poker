import type { GameData, Card } from "../types/game"

// Extend the GameData type
type ExtendedGameData = GameData & {
  lastPlayedCard?: Card | null
}

// Use a more reliable client tracking mechanism with clientIds
const connectedClients: Map<string, Map<string, (data: string) => void>> = new Map()

export function addClient(tableId: string, send: (data: string) => void, clientId: string) {
  if (!connectedClients.has(tableId)) {
    connectedClients.set(tableId, new Map())
  }
  connectedClients.get(tableId)!.set(clientId, send)
  console.log(
    `[SSE] Client ${clientId} added. Total clients for table ${tableId}: ${connectedClients.get(tableId)?.size || 0}`,
  )
}

export function removeClient(tableId: string, send: (data: string) => void, clientId: string) {
  console.log(`[SSE] Removing client ${clientId} for table: ${tableId}`)
  connectedClients.get(tableId)?.delete(clientId)
  if (connectedClients.get(tableId)?.size === 0) {
    connectedClients.delete(tableId)
  }
  console.log(`[SSE] Client removed. Total clients for table ${tableId}: ${connectedClients.get(tableId)?.size || 0}`)
}

// Helper function to get the number of connected clients for a table
export function getConnectedClientsCount(tableId: string): number {
  return connectedClients.get(tableId)?.size || 0
}

// Update the sendSSEUpdate function to ensure reliable delivery
export async function sendSSEUpdate(tableId: string, gameData: ExtendedGameData) {
  console.log(`[SSE] Attempting to send update for table: ${tableId}`)
  const clientsMap = connectedClients.get(tableId)

  // Only send updates if there are connected clients
  if (clientsMap && clientsMap.size > 0) {
    console.log(`[SSE] Found ${clientsMap.size} connected clients for table: ${tableId}`)

    // Add a timestamp to help clients identify the latest update
    const timestampedData = {
      ...gameData,
      _timestamp: Date.now(),
    }

    const message = `data: ${JSON.stringify(timestampedData)}\n\n`

    // Send to all clients with error handling - using forEach instead of for...of with entries()
    const clientsToRemove: string[] = []

    clientsMap.forEach((send, clientId) => {
      try {
        console.log(`[SSE] Sending update to client ${clientId} for table: ${tableId}`)
        send(message)
      } catch (error) {
        console.error(`[SSE] Error sending update to client ${clientId} for table ${tableId}:`, error)
        // Mark this client for removal
        clientsToRemove.push(clientId)
      }
    })

    // Remove any clients that had errors
    clientsToRemove.forEach((id) => {
      clientsMap.delete(id)
    })
  } else {
    console.log(`[SSE] No connected clients found for table: ${tableId}`)
    console.log(`[SSE] No clients connected, but game state has been updated in the database`)
  }
}

