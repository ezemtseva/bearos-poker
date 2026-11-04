import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@vercel/postgres"

export const runtime = "edge"

export async function POST(req: NextRequest) {
  const { tableId, playerName, emoji } = await req.json()

  if (!tableId || !playerName || !emoji) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
  }

  try {
    // Update only this player's reaction, in one statement: a read-modify-write of the whole
    // players array could overwrite a bet or card played in between (and vice versa)
    const reaction = JSON.stringify({ emoji, timestamp: Date.now() })
    const result = await sql`
      UPDATE poker_games
      SET players = (
        SELECT jsonb_agg(
          CASE WHEN elem->>'name' = ${playerName} THEN elem || jsonb_build_object('reaction', ${reaction}::jsonb) ELSE elem END
          ORDER BY idx
        )
        FROM jsonb_array_elements(players) WITH ORDINALITY AS t(elem, idx)
      )
      WHERE table_id = ${tableId} AND players @> ${JSON.stringify([{ name: playerName }])}::jsonb
    `
    if (result.rowCount === 0) {
      return NextResponse.json({ error: "Game or player not found" }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error sending reaction:", error)
    return NextResponse.json({ error: "Failed to send reaction" }, { status: 500 })
  }
}
