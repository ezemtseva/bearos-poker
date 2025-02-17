import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@vercel/postgres"
import type { GameData, Player, Card } from "../../../../types/game"
import { sendSSEUpdate } from "../../../utils/sse"

export const runtime = "edge"

function getNextTurn(currentTurn: number, playerCount: number): number {
  return (currentTurn + 1) % playerCount
}

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
    let players = game.players as Player[]
    let cardsOnTable = game.cards_on_table as Card[]
    let currentRound = game.current_round
    let currentPlay = game.current_play
    let currentTurn = game.current_turn
    let deck = game.deck as Card[]
    let allCardsPlayedTimestamp: number | null = null
    let playEndTimestamp: number | null = null
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
      const winnerCard = cardsOnTable.reduce((max, current) => (current.value > max.value ? current : max))
      const winnerIndex = players.findIndex((p) => p.name === winnerCard.playerName)

      // Update scores
      players[winnerIndex].score = (players[winnerIndex].score || 0) + 1

      // Update score table
      const roundIndex = currentRound - 1
      if (!scoreTable[roundIndex]) {
        scoreTable[roundIndex] = {
          roundId: currentRound,
          roundName:
            currentRound <= 6 ? currentRound.toString() : currentRound <= 12 ? "B" : (19 - currentRound).toString(),
          scores: {},
        }
      }
      players.forEach((player) => {
        scoreTable[roundIndex].scores[player.name] = player.score
      })

      // Prepare for the next play or round
      currentPlay++
      if (currentPlay > currentRound) {
        currentRound++
        currentPlay = 1
        allCardsPlayedTimestamp = Date.now()

        // Deal new cards for the new round
        deck = createDeck()
        const cardsPerPlayer =
          currentRound <= 6 ? currentRound : currentRound <= 12 ? 13 - currentRound : 19 - currentRound

        players = players.map((player) => ({
          ...player,
          hand: deck.splice(0, cardsPerPlayer),
        }))

        cardsOnTable = []
      } else {
        // Set up for the next play within the same round
        cardsOnTable = []
      }
      currentTurn = winnerIndex
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
      deck,
      scoreTable,
      allCardsPlayedTimestamp,
      playEndTimestamp,
    }

    await sql`
      UPDATE poker_games
      SET players = ${JSON.stringify(players)}::jsonb,
          current_round = ${currentRound},
          current_play = ${currentPlay},
          current_turn = ${currentTurn},
          cards_on_table = ${JSON.stringify(cardsOnTable)}::jsonb,
          deck = ${JSON.stringify(deck)}::jsonb,
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

