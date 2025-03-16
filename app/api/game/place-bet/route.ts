import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@vercel/postgres"
import type { GameData, Player, ScoreTableRow } from "../../../../types/game"

export const runtime = "edge"

export async function POST(req: NextRequest) {
  const { tableId, playerName, bet } = await req.json()

  if (!tableId || !playerName || bet === undefined) {
    return NextResponse.json({ error: "Table ID, player name, and bet are required" }, { status: 400 })
  }

  try {
    console.log(`[PLACE-BET] Received bet request: tableId=${tableId}, playerName=${playerName}, bet=${bet}`)

    const result = await sql`
      SELECT * FROM poker_games
      WHERE table_id = ${tableId} AND game_started = true;
    `

    if (result.rowCount === 0) {
      console.log(`[PLACE-BET] Game not found or not started: ${tableId}`)
      return NextResponse.json({ error: "Game not found or not started" }, { status: 404 })
    }

    const game = result.rows[0]
    const players = game.players as Player[]
    const scoreTable = game.score_table as ScoreTableRow[]
    let currentBettingTurn =
      game.current_betting_turn !== undefined ? game.current_betting_turn : game.round_start_player_index

    console.log(
      `[PLACE-BET] Current betting turn: ${currentBettingTurn}, Player index: ${players.findIndex((p) => p.name === playerName)}`,
    )

    // Check if it's this player's turn to bet
    const playerIndex = players.findIndex((p) => p.name === playerName)
    if (playerIndex === -1) {
      console.log(`[PLACE-BET] Player not found: ${playerName}`)
      return NextResponse.json({ error: "Player not found" }, { status: 404 })
    }

    if (playerIndex !== currentBettingTurn) {
      console.log(`[PLACE-BET] Not player's turn: expected=${currentBettingTurn}, actual=${playerIndex}`)
      return NextResponse.json({ error: "It's not your turn to place a bet" }, { status: 400 })
    }

    // Get the current round
    const currentRound = game.current_round

    // Calculate cards per round
    const cardsThisRound = currentRound <= 6 ? currentRound : currentRound <= 12 ? 6 : 19 - currentRound

    // Validate bet is within range
    if (bet < 0 || bet > cardsThisRound) {
      console.log(`[PLACE-BET] Invalid bet range: ${bet}, allowed: 0-${cardsThisRound}`)
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
        console.log(
          `[PLACE-BET] Invalid bet: would make total (${totalExistingBets + bet}) equal to cards (${cardsThisRound})`,
        )
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
    console.log(`[PLACE-BET] Updated player bet: ${playerName}, bet=${bet}`)

    // Update score table with the bet
    if (scoreTable[currentRound - 1]) {
      scoreTable[currentRound - 1].scores[playerName].bet = bet
    }

    // Move to the next player's turn to bet
    currentBettingTurn = (currentBettingTurn + 1) % players.length
    console.log(`[PLACE-BET] Next betting turn: ${currentBettingTurn}`)

    // Check if all players have placed their bets
    const allBetsPlaced = players.every((player) => player.bet !== null)
    console.log(`[PLACE-BET] All bets placed: ${allBetsPlaced}`)

    // Set timestamp when all bets are placed
    let betsPlacedTimestamp = null
    let allBetsPlacedFlag = false

    if (allBetsPlaced) {
      betsPlacedTimestamp = Date.now()
      allBetsPlacedFlag = true
      console.log(`[PLACE-BET] All bets placed, setting betsPlacedTimestamp to ${betsPlacedTimestamp}`)
    }

    // Update the database with the new bet information
    await sql`
      UPDATE poker_games
      SET players = ${JSON.stringify(players)}::jsonb,
          score_table = ${JSON.stringify(scoreTable)}::jsonb,
          current_betting_turn = ${allBetsPlaced ? null : currentBettingTurn},
          bets_placed_timestamp = ${betsPlacedTimestamp},
          all_bets_placed = ${allBetsPlacedFlag}
      WHERE table_id = ${tableId}
    `
    console.log(`[PLACE-BET] Database updated successfully`)

    // If all bets are placed, set the current turn to the round start player
    if (allBetsPlaced) {
      await sql`
        UPDATE poker_games
        SET current_turn = ${game.round_start_player_index}
        WHERE table_id = ${tableId}
      `
      console.log(`[PLACE-BET] All bets placed, setting current_turn to ${game.round_start_player_index}`)
    }

    // Fetch the updated game state to return
    const updatedResult = await sql`
      SELECT * FROM poker_games
      WHERE table_id = ${tableId};
    `

    if (updatedResult.rowCount === 0) {
      console.log(`[PLACE-BET] Failed to fetch updated game state`)
      return NextResponse.json({ error: "Failed to fetch updated game state" }, { status: 500 })
    }

    const updatedGame = updatedResult.rows[0]
    const updatedGameData: GameData = {
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
      allBetsPlaced: updatedGame.all_bets_placed,
      gameOver: updatedGame.game_over,
      currentBettingTurn: updatedGame.current_betting_turn,
      betsPlacedTimestamp: updatedGame.bets_placed_timestamp,
    }

    console.log(
      `[PLACE-BET] Returning updated game state: allBetsPlaced=${updatedGameData.allBetsPlaced}, currentBettingTurn=${updatedGameData.currentBettingTurn}`,
    )
    return NextResponse.json({ message: "Bet placed successfully", gameData: updatedGameData })
  } catch (error) {
    console.error("[PLACE-BET] Error placing bet:", error)
    return NextResponse.json({ error: "Failed to place bet" }, { status: 500 })
  }
}

