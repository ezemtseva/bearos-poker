import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@vercel/postgres"
import type { Card, Player } from "../../../../types/game"

export const runtime = "edge"

function createDeck(): Card[] {
  const suits = ["trumps", "hearts", "diamonds", "clubs"] as const
  const values = [6, 7, 8, 9, 10, 11, 12, 13, 14]
  const deck: Card[] = []

  for (const suit of suits) {
    for (const value of values) {
      deck.push({ suit, value })
    }
  }

  return shuffleDeck(deck)
}

function shuffleDeck(deck: Card[]): Card[] {
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[deck[i], deck[j]] = [deck[j], deck[i]]
  }
  return deck
}

export async function POST(req: NextRequest) {
  const { tableId, gameData } = await req.json()

  if (!tableId || !gameData) {
    return NextResponse.json({ error: "Table ID and game data are required" }, { status: 400 })
  }

  try {
    const updatedGameData = { ...gameData }

    // Check if we need to start a new round
    if (updatedGameData.currentPlay === 1) {
      // Create a new deck and shuffle it
      const deck = createDeck()

      // Determine the number of cards to deal
      const cardsPerPlayer =
        updatedGameData.currentRound <= 6
          ? updatedGameData.currentRound
          : updatedGameData.currentRound <= 12
            ? 13 - updatedGameData.currentRound
            : 19 - updatedGameData.currentRound

      // Deal cards to players
      updatedGameData.players = updatedGameData.players.map((player: Player) => ({
        ...player,
        hand: deck.splice(0, cardsPerPlayer),
      }))

      // Update the deck
      updatedGameData.deck = deck

      // Set the current turn to the winner of the previous round
      const previousRoundWinner = updatedGameData.players.findIndex(
        (p: Player) => p.score === Math.max(...updatedGameData.players.map((p: Player) => p.score)),
      )
      updatedGameData.currentTurn = previousRoundWinner >= 0 ? previousRoundWinner : 0
    }

    await sql`
      UPDATE poker_games
      SET players = ${JSON.stringify(updatedGameData.players)}::jsonb,
          current_round = ${updatedGameData.currentRound},
          current_play = ${updatedGameData.currentPlay},
          current_turn = ${updatedGameData.currentTurn},
          cards_on_table = ${JSON.stringify(updatedGameData.cardsOnTable)}::jsonb,
          deck = ${JSON.stringify(updatedGameData.deck)}::jsonb,
          game_started = ${updatedGameData.gameStarted},
          all_cards_played_timestamp = ${updatedGameData.allCardsPlayedTimestamp},
          score_table = ${JSON.stringify(updatedGameData.scoreTable)}::jsonb
      WHERE table_id = ${tableId}
    `

    return NextResponse.json({ message: "Game state updated successfully", gameData: updatedGameData })
  } catch (error) {
    console.error("Error updating game state:", error)
    return NextResponse.json({ error: "Failed to update game state" }, { status: 500 })
  }
}

