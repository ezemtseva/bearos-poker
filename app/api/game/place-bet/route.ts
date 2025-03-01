import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@vercel/postgres"
import type { GameData, Player, ScoreTableRow } from "../../../../types/game"
import { sendSSEUpdate } from "../../../utils/sse"

export const runtime = "edge"

export async function POST(req: NextRequest) {
  const { tableId, playerName, bet } = await req.json()

  if (!tableId || !playerName || bet === undefined) {
    return NextResponse.json({ error: "Table ID, player name, and bet are required" }, { status: 400 })
  }

  try {
    const result = await sql`
      SELECT * FROM poker_games
      WHERE table_id = ${tableId} AND game_started = true;
    `

    if (result.rowCount === 0) {
      return NextResponse.json({ error: "Game not found or not started" }, { status: 404 })
    }

    const game = result.rows[0]
    const players = game.players as Player[]
    const scoreTable = game.score_table as ScoreTableRow[]

    // Update player's bet
    const playerIndex = players.findIndex((p) => p.name === playerName)
    if (playerIndex === -1) {
      return NextResponse.json({ error: "Player not found" }, { status: 404 })
    }
    players[playerIndex].bet = bet

    // Update score table with the bet
    const currentRound = game.current_round
    if (scoreTable[currentRound - 1]) {
      scoreTable[currentRound - 1].scores[playerName].bet = bet
    }

    // Check if all players have placed their bets
    const allBetsPlaced = players.every((player) => player.bet !== null)

    // Update the database
    await sql`
      UPDATE poker_games
      SET players = ${JSON.stringify(players)}::jsonb,
          score_table = ${JSON.stringify(scoreTable)}::jsonb,
          all_bets_placed = ${allBetsPlaced}
      WHERE table_id = ${tableId}
    `

    // Prepare the updated game data
    const updatedGameData: GameData = {
      tableId: game.table_id,
      players: players,
      gameStarted: game.game_started,
      currentRound: game.current_round,
      currentPlay: game.current_play,
      currentTurn: game.current_turn,
      cardsOnTable: game.cards_on_table,
      deck: game.deck,
      scoreTable: scoreTable,
      allCardsPlayedTimestamp: game.all_cards_played_timestamp,
      playEndTimestamp: game.play_end_timestamp,
      lastPlayedCard: game.last_played_card,
      allCardsPlayed: game.all_cards_played,
      highestCard: game.highest_card,
      roundStartPlayerIndex: game.round_start_player_index,
      allBetsPlaced: allBetsPlaced,
    }

    // Send SSE update
    await sendSSEUpdate(tableId, updatedGameData)

    return NextResponse.json({ message: "Bet placed successfully", gameData: updatedGameData })
  } catch (error) {
    console.error("Error placing bet:", error)
    return NextResponse.json({ error: "Failed to place bet" }, { status: 500 })
  }
}

