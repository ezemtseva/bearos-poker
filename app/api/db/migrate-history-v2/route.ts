import { sql } from "@vercel/postgres"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    await sql`
      ALTER TABLE game_history
      ADD COLUMN IF NOT EXISTS players_data JSONB DEFAULT '[]'::jsonb,
      ADD COLUMN IF NOT EXISTS place INTEGER DEFAULT 0;
    `
    return NextResponse.json({ message: "History v2 migration completed" }, { status: 200 })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
