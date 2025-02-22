import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@vercel/postgres"
import type { GameData, Player, Card } from "../../../../types/game"
import { sendSSEUpdate } from "../../../utils/sse"

export const runtime = "edge"

function getNextTurn(currentTurn: number, playerCount: number): number {
  return (currentTurn + 1) % playerCount
}

export async function POST(req: NextRequest) {
  const { tableId, playerName, card } = await req.json()

  if (!tableId || !playerName || !card) {
    return NextResponse.json({ error: "Table ID, player name, and card are required" }, { status: 400 })
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
    let cardsOnTable = game.cards_on_table as Card[]
    let currentRound = game.current_round
    let currentPlay = game.current_play
    let currentTurn = game.current_turn
    let playEndTimestamp: number | null = null
    let allCardsPlayedTimestamp: number | null = game.all_cards_played_timestamp
    const scoreTable = game.score_table

    // Find the current player
    const playerIndex = players.findIndex((p) => p.name === playerName)
    if (playerIndex === -1 || playerIndex !== currentTurn) {
      return NextResponse.json({ error: "It's not your turn" }, { status: 400 })
    }

    // Remove the played card from the player's hand
    players[playerIndex].hand = players[playerIndex].hand.filter(
      (c) => !(c.suit === card.suit && c.value === card.value),
    )

    // Add the card to the table
    cardsOnTable.push({ ...card, playerName })

    // Check if the play is complete
    if (cardsOnTable.length === players.length) {
      playEndTimestamp = Date.now()

      // Determine the winner of the play
      const winnerCard = cardsOnTable.reduce((max, current) => {
        if (current.value > max.value) {
          return current
        } else if (current.value === max.value) {
          // In case of a tie, the first card played wins
          return max
        } else {
          return max
        }
      })
      const winnerIndex = players.findIndex((p) => p.name === winnerCard.playerName)

      // Update round wins for the winner
      players[winnerIndex].roundWins = (players[winnerIndex].roundWins || 0) + 1

      // Prepare for the next play or round
      currentPlay++
      const cardsPerRound =
        currentRound <= 6 ? currentRound : currentRound <= 12 ? 13 - currentRound : 19 - currentRound
      if (currentPlay > cardsPerRound) {
        // End of round
        allCardsPlayedTimestamp = Date.now()

        // Update scores in the score table
        const roundIndex = currentRound - 1
        players.forEach((player) => {
          scoreTable[roundIndex].scores[player.name] = player.roundWins
          player.score += player.roundWins
          player.roundWins = 0 // Reset for next round
        })

        currentRound++
        currentPlay = 1

        if (currentRound > 18) {
          // Game over
          const gameOverData: GameData = {
            tableId: game.table_id,
            players,
            gameStarted: false,
            currentRound: 18,
            currentPlay: 0,
            currentTurn: -1,
            cardsOnTable: [],
            deck: [],
            scoreTable,
            allCardsPlayedTimestamp: Date.now(),
            playEndTimestamp: null,
          }
          await sql`
            UPDATE poker_games
            SET game_started = false,
                players = ${JSON.stringify(players)}::jsonb,
                current_round = 18,
                current_play = 0,
                current_turn = -1,
                cards_on_table = '[]'::jsonb,
                score_table = ${JSON.stringify(scoreTable)}::jsonb,
                all_cards_played_timestamp = ${gameOverData.allCardsPlayedTimestamp},
                play_end_timestamp = null
            WHERE table_id = ${tableId}
          `
          await sendSSEUpdate(tableId, gameOverData)
          return NextResponse.json({ message: "Game over", gameData: gameOverData })
        }
      }

      // Set the starting player for the next play
      currentTurn = winnerIndex
      cardsOnTable = [] // Clear the table for the next play
    } else {
      // Move to the next turn
      currentTurn = getNextTurn(currentTurn, players.length)
    }

    const gameData: GameData = {
      tableId: game.table_id,
      players,
      gameStarted: game.game_started,
      currentRound,
      currentPlay,
      currentTurn,
      cardsOnTable,
      deck: game.deck,
      scoreTable,
      allCardsPlayedTimestamp,
      playEndTimestamp,
    }

    const updatedPlayers = players

    await sql`
      UPDATE poker_games
      SET players = ${JSON.stringify(updatedPlayers)}::jsonb,
          current_round = ${currentRound},
          current_play = ${currentPlay},
          current_turn = ${currentTurn},
          cards_on_table = ${JSON.stringify(cardsOnTable)}::jsonb,
          game_started = ${game.game_started},
          all_cards_played_timestamp = ${allCardsPlayedTimestamp},
          play_end_timestamp = ${playEndTimestamp},
          score_table = ${JSON.stringify(scoreTable)}::jsonb
      WHERE table_id = ${tableId}
    `

    // Send SSE update to all connected clients
    await sendSSEUpdate(tableId, gameData)

    return NextResponse.json({ message: "Card played successfully", gameData })
  } catch (error) {
    console.error("Error playing card:", error)
    return NextResponse.json({ error: "Failed to play card" }, { status: 500 })
  }
}

