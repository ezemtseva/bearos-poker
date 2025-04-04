import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@vercel/postgres"
import type { Player, GameData } from "../../../../types/game"

export const runtime = "edge"

export async function POST(req: NextRequest) {
  const { tableId, playerName } = await req.json()

  console.log(`[JOIN-GAME] Received join request: tableId=${tableId}, playerName=${playerName}`)

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

    console.log(`[JOIN-GAME] Player not in game, proceeding`)

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
      bet: null,
    }
    players.push(newPlayer)

    // Update the game in the database
    await sql`
      UPDATE poker_games
      SET players = ${JSON.stringify(players)}::jsonb
      WHERE table_id = ${tableId}
    `

    console.log(`[JOIN-GAME] Database updated successfully, player added: ${playerName}`)

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
      allCardsPlayed: game.all_cards_played || false,
      highestCard: game.highest_card || null,
      roundStartPlayerIndex: game.round_start_player_index || 0,
      allBetsPlaced: game.all_bets_placed || false,
      gameOver: game.game_over || false,
    }

    // No longer using SSE, so we don't need to send updates

    return NextResponse.json({ message: "Successfully joined the game", player: newPlayer })
  } catch (error) {
    console.error("Error joining game:", error)
    return NextResponse.json({ error: "Failed to join game" }, { status: 500 })
  }
}

