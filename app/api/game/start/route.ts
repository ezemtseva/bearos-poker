import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@vercel/postgres"
import { Redis } from "@upstash/redis"

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
})

export async function POST(req: NextRequest) {
  const { tableId } = await req.json()

  if (!tableId) {
    return NextResponse.json({ error: "Table ID is required" }, { status: 400 })
  }

  try {
    // Update the game state in PostgreSQL
    const result = await sql`
      UPDATE poker_games
      SET game_started = true
      WHERE table_id = ${tableId}
      RETURNING *;
    `

    if (result.rowCount === 0) {
      return NextResponse.json({ error: "Game not found" }, { status: 404 })
    }

    const updatedGame = result.rows[0]

    // Update the game state in Redis
    await redis.set(
      `game:${tableId}`,
      JSON.stringify({
        ...updatedGame,
        gameStarted: true,
      }),
    )

    return NextResponse.json({ message: "Game started successfully" })
  } catch (error) {
    console.error("Error starting game:", error)
    return NextResponse.json({ error: "Failed to start game" }, { status: 500 })
  }
}

