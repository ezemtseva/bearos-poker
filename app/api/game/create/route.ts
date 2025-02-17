import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@vercel/postgres"
import { v4 as uuidv4 } from "uuid"
import type { Player } from "@/types/game"

export const runtime = "edge"

export async function POST(req: NextRequest) {
  try {
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

    console.log("Attempting to insert new game into database")
    console.log("Table ID:", tableId)
    console.log("Player:", owner)

    try {
      const result = await sql`
        INSERT INTO poker_games (table_id, players, game_started)
        VALUES (${tableId}, ${JSON.stringify([owner])}::jsonb, false)
        RETURNING *
      `
      console.log("Database insert result:", result)
    } catch (dbError) {
      console.error("Database error:", dbError)
      return NextResponse.json(
        { error: "Database operation failed", details: dbError instanceof Error ? dbError.message : String(dbError) },
        { status: 500 },
      )
    }

    return NextResponse.json({ tableId, owner })
  } catch (error) {
    console.error("Error creating game:", error)
    return NextResponse.json(
      { error: "Failed to create game", details: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    )
  }
}

