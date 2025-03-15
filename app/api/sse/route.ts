import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@vercel/postgres"
import type { GameData, Player, ScoreTableRow, PlayerScore } from "../../../types/game"
import { addClient, removeClient } from "../../../utils/sse"

export const runtime = "edge"

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const tableId = searchParams.get("tableId")

  if (!tableId) {
    return new NextResponse("Table ID is required", { status: 400 })
  }

  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      const sendEvent = (event: string, data: string) => {
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${data}\n\n`))
      }

      // Register this client
      addClient(tableId, (message) => {
        controller.enqueue(encoder.encode(message))
      })

      // Send initial game state
      const initialState = await getGameState(tableId)
      sendEvent("init", JSON.stringify(initialState))

      // Set up polling for game updates - reduced frequency to 5 seconds
      // This is a fallback in case direct updates via sendSSEUpdate aren't received
      const pollInterval = setInterval(async () => {
        try {
          const latestState = await getGameState(tableId)
          sendEvent("update", JSON.stringify(latestState))
        } catch (error) {
          console.error("[SSE] Error polling for updates:", error)
        }
      }, 5000) // Increased to 5 seconds to reduce database load

      // Heartbeat to keep connection alive
      const heartbeat = setInterval(() => {
        sendEvent("heartbeat", "ping")
      }, 30000)

      // Clean up on close
      req.signal.addEventListener("abort", () => {
        clearInterval(pollInterval)
        clearInterval(heartbeat)
        removeClient(tableId, (message) => {
          controller.enqueue(encoder.encode(message))
        })
      })
    },
  })

  return new NextResponse(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
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

