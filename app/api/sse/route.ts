import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@vercel/postgres"
import type { GameData, Player, ScoreTableRow, PlayerScore } from "../../../types/game"
import { addClient, removeClient, getConnectedClientsCount } from "../../../utils/sse"

export const runtime = "edge"

// Keep track of active connections
const ACTIVE_CONNECTIONS = new Map<string, Set<string>>()

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const tableId = searchParams.get("tableId")
  const clientId = searchParams.get("clientId") || `client-${Date.now()}`

  if (!tableId) {
    return new NextResponse("Table ID is required", { status: 400 })
  }

  console.log(`[SSE] New connection request for table: ${tableId}, clientId: ${clientId}`)

  // Register this connection
  if (!ACTIVE_CONNECTIONS.has(tableId)) {
    ACTIVE_CONNECTIONS.set(tableId, new Set())
  }
  ACTIVE_CONNECTIONS.get(tableId)?.add(clientId)
  console.log(`[SSE] Active connections for table ${tableId}: ${ACTIVE_CONNECTIONS.get(tableId)?.size || 0}`)

  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      const sendEvent = (event: string, data: string) => {
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${data}\n\n`))
      }

      // Register this client with a unique identifier
      const clientCallback = (message: string) => {
        controller.enqueue(encoder.encode(message))
      }

      addClient(tableId, clientCallback, clientId)

      // Log the number of connected clients from both tracking mechanisms
      console.log(`[SSE] Client ${clientId} registered for table: ${tableId}`)
      console.log(`[SSE] Connected clients (internal): ${getConnectedClientsCount(tableId)}`)
      console.log(`[SSE] Active connections (route): ${ACTIVE_CONNECTIONS.get(tableId)?.size || 0}`)

      // Send initial game state
      try {
        const initialState = await getGameState(tableId)
        sendEvent("init", JSON.stringify(initialState))
      } catch (error) {
        console.error(`[SSE] Error sending initial state to client ${clientId}:`, error)
      }

      // Set up polling for game updates
      const pollInterval = setInterval(async () => {
        if (ACTIVE_CONNECTIONS.get(tableId)?.has(clientId)) {
          try {
            const latestState = await getGameState(tableId)
            sendEvent("update", JSON.stringify(latestState))
          } catch (error) {
            console.error(`[SSE] Error polling for updates for client ${clientId}:`, error)
          }
        } else {
          clearInterval(pollInterval)
        }
      }, 3000)

      // Heartbeat to keep connection alive
      const heartbeat = setInterval(() => {
        if (ACTIVE_CONNECTIONS.get(tableId)?.has(clientId)) {
          sendEvent("heartbeat", JSON.stringify({ timestamp: Date.now() }))
        } else {
          clearInterval(heartbeat)
        }
      }, 15000)

      // Clean up on close
      req.signal.addEventListener("abort", () => {
        console.log(`[SSE] Connection aborted for client ${clientId}, table: ${tableId}`)
        clearInterval(pollInterval)
        clearInterval(heartbeat)
        removeClient(tableId, clientCallback, clientId)

        // Remove from active connections
        ACTIVE_CONNECTIONS.get(tableId)?.delete(clientId)
        if (ACTIVE_CONNECTIONS.get(tableId)?.size === 0) {
          ACTIVE_CONNECTIONS.delete(tableId)
        }

        console.log(
          `[SSE] Client removed. Remaining active connections for table ${tableId}: ${ACTIVE_CONNECTIONS.get(tableId)?.size || 0}`,
        )
      })
    },
  })

  return new NextResponse(stream, {
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

