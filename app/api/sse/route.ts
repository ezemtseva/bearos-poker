import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@vercel/postgres"
import type { GameData, Player, ScoreTableRow } from "../../../types/game"

export const runtime = "edge"

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const tableId = searchParams.get("tableId")

  console.log("[SSE] Connection attempt for table:", tableId)

  if (!tableId) {
    console.error("[SSE] No table ID provided")
    return new NextResponse("Table ID is required", { status: 400 })
  }

  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      console.log("[SSE] Stream started for table:", tableId)

      const sendEvent = (event: string, data: string) => {
        console.log(`[SSE] Sending event: ${event} for table: ${tableId}`)
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${data}\n\n`))
      }

      // Send initial game state
      const initialState = await getGameState(tableId)
      console.log("[SSE] Sending initial game state for table:", tableId, initialState)
      sendEvent("init", JSON.stringify(initialState))

      // Set up polling for game updates
      const pollInterval = setInterval(async () => {
        console.log("[SSE] Polling for updates for table:", tableId)
        const latestState = await getGameState(tableId)
        sendEvent("update", JSON.stringify(latestState))
      }, 1000) // Poll every second

      // Heartbeat to keep connection alive
      const heartbeat = setInterval(() => {
        console.log("[SSE] Sending heartbeat for table:", tableId)
        sendEvent("heartbeat", "ping")
      }, 30000)

      // Clean up on close
      req.signal.addEventListener("abort", () => {
        console.log("[SSE] Connection aborted for table:", tableId)
        clearInterval(pollInterval)
        clearInterval(heartbeat)
      })
    },
  })

  console.log("[SSE] Returning stream for table:", tableId)
  return new NextResponse(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  })
}

async function getGameState(tableId: string): Promise<GameData> {
  console.log("[SSE] Fetching game state for table:", tableId)
  const result = await sql`
    SELECT * FROM poker_games WHERE table_id = ${tableId};
  `
  if (result.rows.length === 0) {
    console.log("[SSE] No game found for table:", tableId)
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
    }
  }
  const row = result.rows[0]
  console.log("[SSE] Game state fetched for table:", tableId, row)
  return {
    tableId: row.table_id,
    players: row.players as Player[],
    gameStarted: row.game_started || false,
    scoreTable: row.score_table || initializeScoreTable(row.players),
    currentRound: row.current_round || 0,
    currentPlay: row.current_play || 0,
    currentTurn: row.current_turn || 0,
    cardsOnTable: row.cards_on_table || [],
    deck: row.deck || [],
    allCardsPlayedTimestamp: row.all_cards_played_timestamp || null,
    playEndTimestamp: row.play_end_timestamp || null,
    lastPlayedCard: row.last_played_card || null,
    allCardsPlayed: row.all_cards_played || false,
    highestCard: row.highest_card || null,
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
    const scores = players.reduce(
      (acc, player) => {
        acc[player.name] = null
        return acc
      },
      {} as { [playerName: string]: number | null },
    )
    return { roundId, roundName, scores }
  })
}

