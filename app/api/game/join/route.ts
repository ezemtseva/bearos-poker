import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@vercel/postgres"
import type { Player, GameData } from "../../../../types/game"
import { sendSSEUpdate } from "../../../utils/sse"

export const runtime = "edge"

export async function POST(req: NextRequest) {
  const { tableId, playerName } = await req.json()

  if (!tableId || !playerName) {
    return NextResponse.json({ error: "Table ID and player name are required" }, { status: 400 })
  }

  try {
    const result = await sql`
      SELECT * FROM poker_games
      WHERE table_id = ${tableId} AND game_started = false;
    `

    if (result.rowCount === 0) {
      return NextResponse.json({ error: "Game not found or already started" }, { status: 404 })
    }

    const game = result.rows[0]
    const players = game.players as Player[]

    // Check if the player is already in the game
    if (players.some((p) => p.name === playerName)) {
      return NextResponse.json({ error: "Player with this name already exists in the game" }, { status: 400 })
    }

    // Check if the game is full
    if (players.length >= 6) {
      return NextResponse.json({ error: "Game is full" }, { status: 400 })
    }

    // Add the new player
    const newPlayer: Player = {
      name: playerName,
      seatNumber: players.length + 1,
      isOwner: false,
      hand: [],
      score: 0,
      roundWins: 0,
    }
    players.push(newPlayer)

    // Update the game in the database
    await sql`
      UPDATE poker_games
      SET players = ${JSON.stringify(players)}::jsonb
      WHERE table_id = ${tableId}
    `

    // Construct a complete GameData object
    const updatedGameData: GameData = {
      tableId: game.table_id,
      players: players,
      gameStarted: game.game_started || false,
      currentRound: game.current_round || 0,
      currentPlay: game.current_play || 0,
      currentTurn: game.current_turn || 0,
      cardsOnTable: game.cards_on_table || [],
      deck: game.deck || [],
      scoreTable: game.score_table || [],
      allCardsPlayedTimestamp: game.all_cards_played_timestamp || null,
      playEndTimestamp: game.play_end_timestamp || null,
      lastPlayedCard: game.last_played_card || null,
      allCardsPlayed: game.all_cards_played || false, // Add this line
    }

    // Send SSE update to all connected clients
    await sendSSEUpdate(tableId, updatedGameData)

    return NextResponse.json({ message: "Successfully joined the game", player: newPlayer })
  } catch (error) {
    console.error("Error joining game:", error)
    return NextResponse.json({ error: "Failed to join game" }, { status: 500 })
  }
}

