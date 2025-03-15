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
    let currentBettingTurn =
      game.current_betting_turn !== undefined ? game.current_betting_turn : game.round_start_player_index

    // Check if it's this player's turn to bet
    const playerIndex = players.findIndex((p) => p.name === playerName)
    if (playerIndex === -1) {
      return NextResponse.json({ error: "Player not found" }, { status: 404 })
    }

    if (playerIndex !== currentBettingTurn) {
      return NextResponse.json({ error: "It's not your turn to place a bet" }, { status: 400 })
    }

    // Get the current round
    const currentRound = game.current_round

    // Calculate cards per round
    const cardsThisRound = currentRound <= 6 ? currentRound : currentRound <= 12 ? 6 : 19 - currentRound

    // Validate bet is within range
    if (bet < 0 || bet > cardsThisRound) {
      return NextResponse.json({ error: `Bet must be between 0 and ${cardsThisRound}` }, { status: 400 })
    }

    // Check if this is the last player to bet and if the bet would make the total equal to cardsThisRound
    if (players.filter((p) => p.bet !== null).length === players.length - 1) {
      // Calculate sum of existing bets
      const totalExistingBets = players.reduce((sum, player) => {
        return sum + (player.bet !== null ? player.bet : 0)
      }, 0)

      // Check if this bet would make the total equal to cardsThisRound
      if (totalExistingBets + bet === cardsThisRound) {
        return NextResponse.json(
          {
            error: `Your bet cannot be ${bet} as it would make the total bets equal to the number of cards (${cardsThisRound}).`,
          },
          { status: 400 },
        )
      }
    }

    // Update player's bet
    players[playerIndex].bet = bet

    // Update score table with the bet
    if (scoreTable[currentRound - 1]) {
      scoreTable[currentRound - 1].scores[playerName].bet = bet
    }

    // Move to the next player's turn to bet
    currentBettingTurn = (currentBettingTurn + 1) % players.length

    // Check if all players have placed their bets
    const allBetsPlaced = players.every((player) => player.bet !== null)

    // Set timestamp when all bets are placed
    let betsPlacedTimestamp = null
    let shouldSetAllBetsPlaced = false

    if (allBetsPlaced) {
      betsPlacedTimestamp = Date.now()
      shouldSetAllBetsPlaced = true
      console.log(`All bets placed, setting betsPlacedTimestamp to ${betsPlacedTimestamp}`)
    }

    // Update the database with the new bet information
    await sql`
      UPDATE poker_games
      SET players = ${JSON.stringify(players)}::jsonb,
          score_table = ${JSON.stringify(scoreTable)}::jsonb,
          current_betting_turn = ${allBetsPlaced ? null : currentBettingTurn},
          bets_placed_timestamp = ${betsPlacedTimestamp}
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
      allBetsPlaced: false, // Always false until the delay is over
      gameOver: game.game_over || false,
      currentBettingTurn: allBetsPlaced ? undefined : currentBettingTurn,
      betsPlacedTimestamp: betsPlacedTimestamp,
    }

    // Send SSE update
    await sendSSEUpdate(tableId, updatedGameData)

    // If all bets are placed, immediately update allBetsPlaced
    if (shouldSetAllBetsPlaced) {
      console.log(`All bets placed for table ${tableId}, immediately starting the round`)

      // Update the database to set allBetsPlaced to true without any delay
      await sql`
        UPDATE poker_games
        SET all_bets_placed = true
        WHERE table_id = ${tableId} AND bets_placed_timestamp = ${betsPlacedTimestamp}
      `

      // Fetch the updated game state
      const updatedResult = await sql`
        SELECT * FROM poker_games
        WHERE table_id = ${tableId};
      `

      if (updatedResult.rowCount === 0) {
        console.error(`Game not found for table ${tableId} when updating allBetsPlaced`)
        return NextResponse.json({ message: "Bet placed successfully", gameData: updatedGameData })
      }

      const updatedGame = updatedResult.rows[0]

      // Send another SSE update with allBetsPlaced set to true
      const finalGameData: GameData = {
        tableId: updatedGame.table_id,
        players: updatedGame.players,
        gameStarted: updatedGame.game_started,
        currentRound: updatedGame.current_round,
        currentPlay: updatedGame.current_play,
        currentTurn: updatedGame.current_turn,
        cardsOnTable: updatedGame.cards_on_table,
        deck: updatedGame.deck,
        scoreTable: updatedGame.score_table,
        allCardsPlayedTimestamp: updatedGame.all_cards_played_timestamp,
        playEndTimestamp: updatedGame.play_end_timestamp,
        lastPlayedCard: updatedGame.last_played_card,
        allCardsPlayed: updatedGame.all_cards_played,
        highestCard: updatedGame.highest_card,
        roundStartPlayerIndex: updatedGame.round_start_player_index,
        allBetsPlaced: true, // Now set to true
        gameOver: updatedGame.game_over,
        currentBettingTurn: undefined,
        betsPlacedTimestamp: updatedGame.bets_placed_timestamp,
      }

      console.log(`Sending final SSE update for table ${tableId} with allBetsPlaced=true`)
      await sendSSEUpdate(tableId, finalGameData)
    }

    return NextResponse.json({ message: "Bet placed successfully", gameData: updatedGameData })
  } catch (error) {
    console.error("Error placing bet:", error)
    return NextResponse.json({ error: "Failed to place bet" }, { status: 500 })
  }
}

