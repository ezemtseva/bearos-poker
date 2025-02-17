import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@vercel/postgres"
import type { GameData, Player, Card } from "../../../../types/game"

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

function dealCards(players: Player[], deck: Card[], cardsPerPlayer: number): [Player[], Card[]] {
  const updatedPlayers = players.map((player) => ({
    ...player,
    hand: deck.splice(0, cardsPerPlayer),
  }))
  return [updatedPlayers, deck]
}

export async function POST(req: NextRequest) {
  const { tableId } = await req.json()

  if (!tableId) {
    return NextResponse.json({ error: "Table ID is required" }, { status: 400 })
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
    let players = game.players as Player[]

    // Remove empty seats
    players = players.filter((player) => player.name !== "")

    // Reassign seat numbers
    const updatedPlayers = players.map((player, index) => ({
      ...player,
      seatNumber: index + 1,
      score: 0,
      hand: [], // Initialize empty hand for each player
    }))

    const deck = createDeck()
    const [playersWithCards, updatedDeck] = dealCards(updatedPlayers, deck, 1) // Deal 1 card for the first round

    const gameData: GameData = {
      tableId: game.table_id,
      players: playersWithCards,
      gameStarted: true,
      currentRound: 1,
      currentPlay: 1,
      currentTurn: playersWithCards.findIndex((p) => p.isOwner),
      cardsOnTable: [],
      deck: updatedDeck,
      scoreTable: Array.from({ length: 18 }, (_, i) => ({
        roundId: i + 1,
        roundName: i < 6 ? (i + 1).toString() : i < 12 ? "B" : (18 - i).toString(),
        scores: {},
      })),
      allCardsPlayedTimestamp: null,
      playEndTimestamp: null,
    }

    await sql`
      UPDATE poker_games
      SET game_started = true,
          players = ${JSON.stringify(playersWithCards)}::jsonb,
          current_round = 1,
          current_play = 1,
          current_turn = ${gameData.currentTurn},
          cards_on_table = '[]'::jsonb,
          deck = ${JSON.stringify(updatedDeck)}::jsonb,
          score_table = ${JSON.stringify(gameData.scoreTable)}::jsonb,
          all_cards_played_timestamp = null,
          play_end_timestamp = null
      WHERE table_id = ${tableId}
    `

    console.log("Game started successfully. Game data:", gameData)

    return NextResponse.json({ message: "Game started successfully", gameData })
  } catch (error) {
    console.error("Error starting game:", error)
    return NextResponse.json({ error: "Failed to start game" }, { status: 500 })
  }
}

