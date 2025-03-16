import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@vercel/postgres"
import type { GameData, Player, ScoreTableRow, PlayerScore } from "../../../types/game"

export const runtime = "edge"

// Keep track of active connections per request
const ACTIVE_CONNECTIONS = new Map<string, Set<Response>>()

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const tableId = searchParams.get("tableId")
  const clientId = searchParams.get("clientId") || `client-${Date.now()}`

  if (!tableId) {
    return new NextResponse("Table ID is required", { status: 400 })
  }

  console.log(`[SSE] New connection request for table: ${tableId}, clientId: ${clientId}`)

  // Create a new controller for this connection
  const encoder = new TextEncoder()
  const stream = new TransformStream()
  const writer = stream.writable.getWriter()

  // Function to send events to this specific client
  const sendEvent = async (event: string, data: any) => {
    try {
      await writer.write(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`))
    } catch (error) {
      console.error(`[SSE] Error sending event to client ${clientId}:`, error)
    }
  }

  // Send initial game state
  try {
    const initialState = await getGameState(tableId)
    await sendEvent("init", initialState)
  } catch (error) {
    console.error(`[SSE] Error sending initial state to client ${clientId}:`, error)
  }

  // Set up a polling interval for this specific client
  const intervalId = setInterval(async () => {
    try {
      const latestState = await getGameState(tableId)
      await sendEvent("update", latestState)
    } catch (error) {
      console.error(`[SSE] Error polling for updates for client ${clientId}:`, error)
    }
  }, 2000) // Poll every 2 seconds

  // Set up heartbeat
  const heartbeatId = setInterval(async () => {
    try {
      await sendEvent("heartbeat", { timestamp: Date.now() })
    } catch (error) {
      console.error(`[SSE] Error sending heartbeat to client ${clientId}:`, error)
    }
  }, 15000)

  // Handle connection close
  req.signal.addEventListener("abort", () => {
    console.log(`[SSE] Connection aborted for client ${clientId}, table: ${tableId}`)
    clearInterval(intervalId)
    clearInterval(heartbeatId)
    writer.close().catch(console.error)
  })

  return new Response(stream.readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  })
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

