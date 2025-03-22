import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@vercel/postgres"
import { v4 as uuidv4 } from "uuid"
import type { Player, GameData } from "@/types/game"

export const runtime = "edge"

export async function POST(req: NextRequest) {
  try {
    const { playerName } = await req.json()

    if (!playerName) {
      return NextResponse.json({ error: "Player name is required" }, { status: 400 })
    }

    const tableId = uuidv4().slice(0, 8)

    const owner: Player = {
      name: playerName,
      seatNumber: 1,
      isOwner: true,
      hand: [],
      score: 0,
      roundWins: 0,
      bet: null,
    }

    // Update the gameData object to use "basic" as the default game length
    const gameData: GameData = {
      tableId,
      players: [owner],
      gameStarted: false,
      currentRound: 0,
      currentPlay: 0,
      currentTurn: 0,
      cardsOnTable: [],
      deck: [],
      scoreTable: [],
      allCardsPlayedTimestamp: null,
      playEndTimestamp: null,
      lastPlayedCard: null,
      allCardsPlayed: false,
      highestCard: null,
      roundStartPlayerIndex: 0,
      allBetsPlaced: false,
      gameOver: false,
      gameLength: "basic", // Changed from "short" to "basic"
    }

    console.log("Attempting to insert new game into database")
    console.log("Table ID:", tableId)
    console.log("Player:", owner)

    // Update the SQL INSERT statement to use "basic" as the default game_length
    try {
      const result = await sql`
      INSERT INTO poker_games (
        table_id, 
        players, 
        game_started, 
        current_round, 
        current_play, 
        current_turn, 
        cards_on_table, 
        deck, 
        score_table, 
        all_cards_played_timestamp,
        play_end_timestamp,
        last_played_card,
        all_cards_played,
        round_start_player_index,
        all_bets_placed,
        game_over,
        game_length
      )
      VALUES (
        ${tableId}, 
        ${JSON.stringify([owner])}::jsonb, 
        false, 
        0, 
        0, 
        0, 
        '[]'::jsonb, 
        '[]'::jsonb, 
        '[]'::jsonb, 
        null,
        null,
        null,
        false,
        0,
        false,
        false,
        'basic'
      )
      RETURNING *
    `
      console.log("Database insert result:", result)
    } catch (dbError) {
      console.error("Database error:", dbError)
      return NextResponse.json(
        { error: "Database operation failed", details: dbError instanceof Error ? dbError.message : String(dbError) },
        { status: 500 },
      )
    }

    return NextResponse.json({ tableId, owner, gameData })
  } catch (error) {
    console.error("Error creating game:", error)
    return NextResponse.json(
      { error: "Failed to create game", details: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    )
  }
}

