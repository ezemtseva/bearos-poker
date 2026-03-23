import { sql } from "@vercel/postgres"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    await sql`
      ALTER TABLE game_history
      ADD COLUMN IF NOT EXISTS is_winner BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS poker_hands INTEGER DEFAULT 0;
    `
    return NextResponse.json({ message: "Analytics migration completed" }, { status: 200 })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
