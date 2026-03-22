import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@vercel/postgres"
import type { Player } from "@/types/game"

export const runtime = "edge"

export async function POST(req: NextRequest) {
  const { tableId, playerName, avatar } = await req.json()

  if (!tableId || !playerName) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
  }

  try {
    const result = await sql`SELECT players FROM poker_games WHERE table_id = ${tableId}`
    if (result.rowCount === 0) {
      return NextResponse.json({ error: "Game not found" }, { status: 404 })
    }

    const players = result.rows[0].players as Player[]
    const idx = players.findIndex((p) => p.name === playerName)
    if (idx === -1) {
      return NextResponse.json({ error: "Player not found" }, { status: 404 })
    }

    if (avatar) {
      players[idx].avatar = avatar
    } else {
      delete players[idx].avatar
    }

    await sql`UPDATE poker_games SET players = ${JSON.stringify(players)}::jsonb WHERE table_id = ${tableId}`

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error setting avatar:", error)
    return NextResponse.json({ error: "Failed to set avatar" }, { status: 500 })
  }
}
