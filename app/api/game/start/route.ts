import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@vercel/postgres"
import type { GameData, GameLength, Player, Card, ScoreTableRow, PlayerScore } from "../../../../types/game"
import { createDeck } from "../../../utils/deck"

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

// First, let's fix the issue where the Golden Round disappears when starting the game

// 1. Find the function `initializeScoreTable` and update it to include the Golden Round:

function initializeScoreTable(players: Player[], gameLength: GameLength, hasGoldenRound: boolean): ScoreTableRow[] {
  const roundNames = getRoundNames(gameLength, hasGoldenRound)

  return roundNames.map((roundName, index) => {
    const roundId = index + 1
    const scores: { [playerName: string]: PlayerScore } = players.reduce(
      (acc, player) => {
        acc[player.name] = { cumulativePoints: 0, roundPoints: 0, bet: null }
        return acc
      },
      {} as { [playerName: string]: PlayerScore },
    )
    return { roundId, roundName, scores }
  })
}

// 2. Add the function to get round names with Golden Round support:

function getRoundNames(gameLength: GameLength, hasGoldenRound: boolean): string[] {
  let rounds: string[] = []

  switch (gameLength) {
    case "short":
      rounds = ["1", "2", "3", "4", "5", "6", "B", "B", "B", "B", "B", "B", "6", "5", "4", "3", "2", "1"]
      break
    case "basic":
      rounds = [
        "1",
        "2",
        "3",
        "4",
        "5",
        "6",
        "6",
        "6",
        "B",
        "B",
        "B",
        "B",
        "B",
        "B",
        "6",
        "6",
        "6",
        "5",
        "4",
        "3",
        "2",
        "1",
      ]
      break
    case "long":
      rounds = [
        "1",
        "2",
        "3",
        "4",
        "5",
        "6",
        "6",
        "6",
        "6",
        "6",
        "6",
        "B",
        "B",
        "B",
        "B",
        "B",
        "B",
        "6",
        "6",
        "6",
        "6",
        "6",
        "6",
        "5",
        "4",
        "3",
        "2",
        "1",
      ]
      break
    default:
      rounds = ["1", "2", "3", "4", "5", "6", "B", "B", "B", "B", "B", "B", "6", "5", "4", "3", "2", "1"]
  }

  // Add golden round if enabled
  if (hasGoldenRound) {
    rounds.push("G")
  }

  return rounds
}

export async function POST(req: NextRequest) {
  const { tableId } = await req.json()

  if (!tableId) {
    return NextResponse.json({ error: "Table ID is required" }, { status: 400 })
  }

  try {
    console.log(`[START-GAME] Starting game for table: ${tableId}`)

    const result = await sql`
      SELECT * FROM poker_games
      WHERE table_id = ${tableId} AND game_started = false;
    `

    if (result.rowCount === 0) {
      console.log(`[START-GAME] Game not found or already started: ${tableId}`)
      return NextResponse.json({ error: "Game not found or already started" }, { status: 404 })
    }

    const game = result.rows[0]
    let players = game.players as Player[]

    // Remove empty seats
    players = players.filter((player) => player.name !== "")
    console.log(`[START-GAME] Filtered players: ${players.length}`)

    // Ensure we have at least 2 players
    if (players.length < 2) {
      console.log(`[START-GAME] Not enough players: ${players.length}`)
      return NextResponse.json({ error: "At least 2 players are required to start the game" }, { status: 400 })
    }

    // Reassign seat numbers and reset bets
    players = players.map((player, index) => ({
      ...player,
      seatNumber: index + 1,
      bet: null,
    }))

    const deck = createDeck()
    const [playersWithCards, remainingDeck] = dealCards(players, deck, 1) // Deal 1 card for the first round

    // Find the owner to set as the starting player
    const ownerIndex = playersWithCards.findIndex((p) => p.isOwner)
    console.log(`[START-GAME] Owner index: ${ownerIndex}`)

    // 3. In the POST function, update the code to use the hasGoldenRound parameter:

    // In the POST function, get the game length and hasGoldenRound from the database
    const gameLength = game.game_length || "short"
    const hasGoldenRound = game.has_golden_round || false

    // Update the gameData object to include hasGoldenRound
    const gameData: GameData = {
      tableId: game.table_id,
      players: playersWithCards,
      gameStarted: true,
      currentRound: 1,
      currentPlay: 1,
      currentTurn: ownerIndex,
      cardsOnTable: [],
      deck: remainingDeck,
      scoreTable: initializeScoreTable(playersWithCards, gameLength, hasGoldenRound),
      allCardsPlayedTimestamp: null,
      playEndTimestamp: null,
      lastPlayedCard: null,
      allCardsPlayed: false,
      highestCard: null,
      roundStartPlayerIndex: ownerIndex,
      allBetsPlaced: false,
      gameOver: false,
      currentBettingTurn: ownerIndex,
      gameLength: gameLength,
      hasGoldenRound: hasGoldenRound,
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
          round_start_player_index = ${ownerIndex},
          all_bets_placed = false,
          game_over = false,
          current_betting_turn = ${ownerIndex}
      WHERE table_id = ${tableId}
    `

    console.log(`[START-GAME] Game started successfully for table: ${tableId}`)

    return NextResponse.json({ message: "Game started successfully", gameData })
  } catch (error) {
    console.error("[START-GAME] Error starting game:", error)
    return NextResponse.json({ error: "Failed to start game" }, { status: 500 })
  }
}

