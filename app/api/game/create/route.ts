import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@vercel/postgres"
import { v4 as uuidv4 } from "uuid"
import type { Player } from "@/types/game"

export const runtime = "edge"

export async function POST(req: NextRequest) {
  const { playerName } = await req.json()

  if (!playerName) {
    return NextResponse.json({ error: "Player name is required" }, { status: 400 })
  }

  const tableId = uuidv4().slice(0, 8)

  const owner: Player = {
    name: playerName,
    seatNumber: 1,
    isOwner: true,
    hand: [],
    score: 0,
  }

  try {
    await sql`
      INSERT INTO poker_games (table_id, players, game_started)
      VALUES (${tableId}, ${JSON.stringify([owner])}::jsonb, false)
    `

    return NextResponse.json({ tableId, owner })
  } catch (error) {
    console.error("Error creating game:", error)
    return NextResponse.json({ error: "Failed to create game" }, { status: 500 })
  }
}

