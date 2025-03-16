import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@vercel/postgres"
import type { GameData, Player, ScoreTableRow, PlayerScore } from "../../../types/game"

export const runtime = "edge"

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const tableId = searchParams.get("tableId")
  const clientId = searchParams.get("clientId") || `client-${Date.now()}`

  if (!tableId) {
    return new NextResponse("Table ID is required", { status: 400 })
  }

  console.log(`[SSE] New connection request for table: ${tableId}, clientId: ${clientId}`)

  try {
    // Get the current game state
    const gameState = await getGameState(tableId)

    // Create a simple response with the current state
    // This will return quickly and not time out
    return new NextResponse(
      `event: update\ndata: ${JSON.stringify({
        ...gameState,
        _timestamp: Date.now(),
      })}\n\n`,
      {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache, no-transform",
          Connection: "keep-alive",
        },
      },
    )
  } catch (error) {
    console.error(`[SSE] Error fetching game state for table ${tableId}:`, error)
    return new NextResponse(`event: error\ndata: ${JSON.stringify({ error: "Failed to fetch game state" })}\n\n`, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
      },
    })
  }
}

async function getGameState(tableId: string): Promise<GameData> {
  const result = await sql`
    SELECT * FROM poker_games WHERE table_id = ${tableId};
  `
  if (result.rows.length === 0) {
    return {
      tableId,
      players: [],
      gameStarted: false,
      scoreTable: initializeScoreTable([]),
      currentRound: 0,
      currentPlay: 0,
      currentTurn: 0,
      cardsOnTable: [],
      deck: [],
      allCardsPlayedTimestamp: null,
      playEndTimestamp: null,
      lastPlayedCard: null,
      allCardsPlayed: false,
      highestCard: null,
      roundStartPlayerIndex: 0,
      allBetsPlaced: false,
      gameOver: false,
      currentBettingTurn: undefined,
      betsPlacedTimestamp: null,
    }
  }
  const row = result.rows[0]
  return {
    tableId: row.table_id,
    players: row.players as Player[],
    gameStarted: row.game_started || false,
    currentRound: row.current_round || 0,
    currentPlay: row.current_play || 0,
    currentTurn: row.current_turn || 0,
    cardsOnTable: row.cards_on_table || [],
    deck: row.deck || [],
    scoreTable: row.score_table || initializeScoreTable(row.players),
    allCardsPlayedTimestamp: row.all_cards_played_timestamp || null,
    playEndTimestamp: row.play_end_timestamp || null,
    lastPlayedCard: row.last_played_card || null,
    allCardsPlayed: row.all_cards_played || false,
    highestCard: row.highest_card || null,
    roundStartPlayerIndex: row.round_start_player_index || 0,
    allBetsPlaced: row.all_bets_placed || false,
    gameOver: row.game_over || false,
    currentBettingTurn: row.current_betting_turn,
    betsPlacedTimestamp: row.bets_placed_timestamp,
  }
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
        acc[player.name] = { cumulativePoints: 0, roundPoints: 0, bet: null }
        return acc
      },
      {} as { [playerName: string]: PlayerScore },
    )
    return { roundId, roundName, scores }
  })
}

