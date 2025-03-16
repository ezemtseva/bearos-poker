// This is a stub function that does nothing
// It's here to maintain compatibility with existing code
import type { GameData } from "../../types/game"

export async function sendSSEUpdate(tableId: string, gameData: GameData): Promise<void> {
  // This function is intentionally empty
  // We're no longer using SSE, but we keep this function to avoid breaking existing code
  console.log(`[SSE-STUB] Would have sent update for table: ${tableId}`)
}

