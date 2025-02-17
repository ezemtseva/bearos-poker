import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@vercel/postgres"
import type { GameData, Player, Card } from "../../../../types/game"

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
    const deck = game.deck as Card[]

    // Find the current player
    const playerIndex = players.findIndex((p) => p.name === playerName)
    if (playerIndex === -1 || playerIndex !== currentTurn) {
      return NextResponse.json({ error: "It's not your turn" }, { status: 400 })
    }

    // Remove the played card from the player's hand
    const cardIndex = players[playerIndex].hand.findIndex((c) => c.suit === card.suit && c.value === card.value)
    if (cardIndex === -1) {
      return NextResponse.json({ error: "Card not found in player's hand" }, { status: 400 })
    }
    players[playerIndex].hand.splice(cardIndex, 1)

    // Add the card to the table
    cardsOnTable.push({ ...card, playerName })

    // Move to the next turn
    currentTurn = getNextTurn(currentTurn, players.length)

    // Check if the play is complete
    if (cardsOnTable.length === players.length) {
      // Determine the winner of the play
      const winnerCard = cardsOnTable.reduce((max, current) => (current.value > max.value ? current : max))
      const winnerIndex = players.findIndex((p) => p.name === winnerCard.playerName)

      // Update the score
      players[winnerIndex].score = (players[winnerIndex].score || 0) + 1

      // Clear the table
      cardsOnTable = []

      // Move to the next play or round
      if (currentPlay < currentRound) {
        currentPlay++
      } else {
        // End of round
        currentRound++
        currentPlay = 1

        // Check if the game is over
        if (currentRound > 18) {
          game.game_started = false
        } else {
          // Deal new cards for the next round
          const cardsPerPlayer = currentRound <= 6 ? currentRound : currentRound <= 12 ? 6 : 18 - currentRound
          players.forEach((player) => {
            player.hand.push(...deck.splice(0, cardsPerPlayer))
          })
        }
      }

      // Set the starting player for the new play (winner of the previous play)
      currentTurn = winnerIndex
    }

    const gameData: GameData = {
      tableId: game.table_id,
      players,
      gameStarted: game.game_started,
      currentRound,
      currentPlay,
      currentTurn,
      cardsOnTable,
      deck,
      scoreTable: game.score_table,
    }

    await sql`
      UPDATE poker_games
      SET players = ${JSON.stringify(players)}::jsonb,
          current_round = ${currentRound},
          current_play = ${currentPlay},
          current_turn = ${currentTurn},
          cards_on_table = ${JSON.stringify(cardsOnTable)}::jsonb,
          deck = ${JSON.stringify(deck)}::jsonb,
          game_started = ${game.game_started}
      WHERE table_id = ${tableId}
    `

    return NextResponse.json({ message: "Card played successfully", gameData })
  } catch (error) {
    console.error("Error playing card:", error)
    return NextResponse.json({ error: "Failed to play card" }, { status: 500 })
  }
}

