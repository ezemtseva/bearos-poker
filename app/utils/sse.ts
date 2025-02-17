import type { GameData } from "../../types/game"

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

export async function sendSSEUpdate(tableId: string, gameData: GameData) {
  const clients = connectedClients.get(tableId)
  if (clients) {
    const message = `data: ${JSON.stringify(gameData)}\n\n`
    clients.forEach((send) => send(message))
  }
}

