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
      const sendEvent = (event: string, data: string) => {
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${data}\n\n`))
      }

      // Send initial game state
      const initialState = await getGameState(tableId)
      console.log("[SSE] Sending initial game state:", initialState)
      sendEvent("init", JSON.stringify(initialState))

      // Set up polling for game updates
      const pollInterval = setInterval(async () => {
        const latestState = await getGameState(tableId)
        sendEvent("update", JSON.stringify(latestState))
      }, 5000) // Poll every 5 seconds

      // Heartbeat to keep connection alive
      const heartbeat = setInterval(() => {
        sendEvent("heartbeat", "ping")
      }, 30000)

      // Clean up on close
      req.signal.addEventListener("abort", () => {
        clearInterval(pollInterval)
        clearInterval(heartbeat)
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
    }
  }
  const row = result.rows[0]
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

export async function POST(req: NextRequest) {
  const { tableId, action, player } = await req.json()

  if (!tableId || !action) {
    return new NextResponse("Table ID and action are required", { status: 400 })
  }

  let updatedState: GameData

  switch (action) {
    case "join":
      updatedState = await joinGame(tableId, player)
      break
    case "leave":
      updatedState = await leaveGame(tableId, player)
      break
    default:
      return new NextResponse("Invalid action", { status: 400 })
  }

  return new NextResponse(JSON.stringify(updatedState), {
    headers: { "Content-Type": "application/json" },
  })
}

async function joinGame(tableId: string, player: Player): Promise<GameData> {
  const result = await sql`
    SELECT * FROM poker_games
    WHERE table_id = ${tableId};
  `

  if (result.rows.length === 0) {
    throw new Error("Game not found")
  }

  const game = result.rows[0]

  if (game.game_started) {
    throw new Error("Cannot join a game that has already started")
  }

  const updatedPlayers = [...game.players, player]

  await sql`
    UPDATE poker_games 
    SET players = ${JSON.stringify(updatedPlayers)}::jsonb
    WHERE table_id = ${tableId}
    RETURNING *;
  `

  return {
    tableId: game.table_id,
    players: updatedPlayers,
    gameStarted: game.game_started,
    currentRound: game.current_round,
    currentPlay: game.current_play,
    currentTurn: game.current_turn,
    cardsOnTable: game.cards_on_table || [],
    deck: game.deck || [],
    scoreTable: game.score_table || initializeScoreTable(updatedPlayers),
    allCardsPlayedTimestamp: game.all_cards_played_timestamp || null,
    playEndTimestamp: game.play_end_timestamp || null,
  }
}

async function leaveGame(tableId: string, player: Player): Promise<GameData> {
  const result = await sql`
    UPDATE poker_games 
    SET players = (
      SELECT jsonb_agg(p)
      FROM jsonb_array_elements(players) p
      WHERE p->>'name' != ${player.name}
    )
    WHERE table_id = ${tableId}
    RETURNING *;
  `
  const row = result.rows[0]
  return {
    tableId: row.table_id,
    players: row.players as Player[],
    gameStarted: row.game_started || false,
    scoreTable: row.score_table || initializeScoreTable(row.players),
    currentRound: row.current_round,
    currentPlay: row.current_play,
    currentTurn: row.current_turn,
    cardsOnTable: row.cards_on_table || [],
    deck: row.deck || [],
    allCardsPlayedTimestamp: row.all_cards_played_timestamp || null,
    playEndTimestamp: row.play_end_timestamp || null,
  }
}

