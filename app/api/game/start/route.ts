import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@vercel/postgres"
import type { GameData, Player, Card, ScoreTableRow, PlayerScore } from "../../../../types/game"
import { createDeck } from "../../../utils/deck"
import { sendSSEUpdate } from "../../../utils/sse"

export const runtime = "edge"

function dealCards(players: Player[], deck: Card[], cardsPerPlayer: number): [Player[], Card[]] {
  const updatedPlayers = players.map((player) => ({
    ...player,
    hand: deck.splice(0, cardsPerPlayer),
    score: 0,
    roundWins: 0,
  }))
  return [updatedPlayers, deck]
}

function initializeScoreTable(players: Player[]): ScoreTableRow[] {
  return Array.from({ length: 18 }, (_, index) => {
    const roundId = index + 1
    let roundName
    if (roundId <= 6) {
      roundName = roundId.toString()
    } else if (roundId <= 12) {
      roundName = "B"
    } else {
      roundName = (19 - roundId).toString()
    }
    const scores: { [playerName: string]: PlayerScore } = players.reduce(
      (acc, player) => {
        acc[player.name] = { cumulativePoints: 0, roundPoints: 0 }
        return acc
      },
      {} as { [playerName: string]: PlayerScore },
    )
    return { roundId, roundName, scores }
  })
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

    // Ensure we have at least 2 players
    if (players.length < 2) {
      return NextResponse.json({ error: "At least 2 players are required to start the game" }, { status: 400 })
    }

    // Reassign seat numbers
    players = players.map((player, index) => ({
      ...player,
      seatNumber: index + 1,
    }))

    const deck = createDeck()
    const [playersWithCards, remainingDeck] = dealCards(players, deck, 1) // Deal 1 card for the first round

    // Find the owner to set as the starting player
    const ownerIndex = playersWithCards.findIndex((p) => p.isOwner)

    const gameData: GameData = {
      tableId: game.table_id,
      players: playersWithCards,
      gameStarted: true,
      currentRound: 1,
      currentPlay: 1,
      currentTurn: ownerIndex,
      cardsOnTable: [],
      deck: remainingDeck,
      scoreTable: initializeScoreTable(playersWithCards),
      allCardsPlayedTimestamp: null,
      playEndTimestamp: null,
      lastPlayedCard: null,
      allCardsPlayed: false,
      highestCard: null,
      roundStartPlayerIndex: ownerIndex, // Add this new field to track the starting player for each round
    }

    await sql`
      UPDATE poker_games
      SET game_started = true,
          players = ${JSON.stringify(playersWithCards)}::jsonb,
          current_round = 1,
          current_play = 1,
          current_turn = ${ownerIndex},
          cards_on_table = '[]'::jsonb,
          deck = ${JSON.stringify(remainingDeck)}::jsonb,
          score_table = ${JSON.stringify(gameData.scoreTable)}::jsonb,
          all_cards_played_timestamp = null,
          play_end_timestamp = null,
          all_cards_played = false,
          round_start_player_index = ${ownerIndex}
      WHERE table_id = ${tableId}
    `

    console.log("Game started successfully. Game data:", gameData)

    // Send SSE update to all connected clients
    await sendSSEUpdate(tableId, gameData)

    return NextResponse.json({ message: "Game started successfully", gameData })
  } catch (error) {
    console.error("Error starting game:", error)
    return NextResponse.json({ error: "Failed to start game" }, { status: 500 })
  }
}

