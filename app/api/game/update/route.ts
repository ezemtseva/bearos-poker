import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@vercel/postgres"

export const runtime = "edge"

export async function POST(req: NextRequest) {
  const { tableId, gameData } = await req.json()

  if (!tableId || !gameData) {
    return NextResponse.json({ error: "Table ID and game data are required" }, { status: 400 })
  }

  try {
    await sql`
      UPDATE poker_games
      SET players = ${JSON.stringify(gameData.players)}::jsonb,
          current_round = ${gameData.currentRound},
          current_play = ${gameData.currentPlay},
          current_turn = ${gameData.currentTurn},
          cards_on_table = ${JSON.stringify(gameData.cardsOnTable)}::jsonb,
          deck = ${JSON.stringify(gameData.deck)}::jsonb,
          game_started = ${gameData.gameStarted},
          all_cards_played_timestamp = ${gameData.allCardsPlayedTimestamp},
          score_table = ${JSON.stringify(gameData.scoreTable)}::jsonb
      WHERE table_id = ${tableId}
    `

    return NextResponse.json({ message: "Game state updated successfully", gameData })
  } catch (error) {
    console.error("Error updating game state:", error)
    return NextResponse.json({ error: "Failed to update game state" }, { status: 500 })
  }
}

