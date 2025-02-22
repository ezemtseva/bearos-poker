import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@vercel/postgres"
import type { GameData } from "../../../../types/game"

export const runtime = "edge"

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const tableId = searchParams.get("tableId")

  if (!tableId) {
    return NextResponse.json({ error: "Table ID is required" }, { status: 400 })
  }

  try {
    const result = await sql`
      SELECT * FROM poker_games
      WHERE table_id = ${tableId};
    `

    if (result.rowCount === 0) {
      return NextResponse.json({ error: "Game not found" }, { status: 404 })
    }

    const game = result.rows[0]
    const gameData: GameData = {
      tableId: game.table_id,
      players: game.players,
      gameStarted: game.game_started,
      currentRound: game.current_round,
      currentPlay: game.current_play,
      currentTurn: game.current_turn,
      cardsOnTable: game.cards_on_table,
      deck: game.deck,
      scoreTable: game.score_table,
      allCardsPlayedTimestamp: game.all_cards_played_timestamp,
      playEndTimestamp: game.play_end_timestamp,
      lastPlayedCard: game.last_played_card,
      allCardsPlayed: game.all_cards_played || false, // Add this line
    }

    return NextResponse.json({ gameData })
  } catch (error) {
    console.error("Error fetching game state:", error)
    return NextResponse.json({ error: "Failed to fetch game state" }, { status: 500 })
  }
}

