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

// Update the sendSSEUpdate function to avoid duplicate updates
export async function sendSSEUpdate(tableId: string, gameData: ExtendedGameData) {
  const clients = connectedClients.get(tableId)

  // Only send updates if there are connected clients
  if (clients && clients.size > 0) {
    const message = `data: ${JSON.stringify(gameData)}\n\n`
    clients.forEach((send) => {
      send(message)
    })
  }
}

