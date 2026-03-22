import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@vercel/postgres"
import type { Player } from "@/types/game"

export const runtime = "edge"

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const tableId = searchParams.get("tableId")

  if (!tableId) {
    return NextResponse.json({ error: "Table ID is required" }, { status: 400 })
  }

  try {
    const result = await sql`SELECT players FROM poker_games WHERE table_id = ${tableId}`

    if (result.rowCount === 0) {
      return NextResponse.json({ error: "Game not found" }, { status: 404 })
    }

    const players = result.rows[0].players as Player[]
    const reactions = players.map((p) => ({
      playerName: p.name,
      reaction: p.reaction ?? null,
    }))

    return NextResponse.json({ reactions })
  } catch (error) {
    console.error("Error fetching reactions:", error)
    return NextResponse.json({ error: "Failed to fetch reactions" }, { status: 500 })
  }
}
