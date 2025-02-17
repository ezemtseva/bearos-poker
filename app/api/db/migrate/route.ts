import { sql } from "@vercel/postgres"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    // Check if the table exists
    const tableExists = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'poker_games'
      );
    `

    if (!tableExists.rows[0].exists) {
      // Create the table if it doesn't exist
      await sql`
        CREATE TABLE poker_games (
          table_id TEXT PRIMARY KEY,
          players JSONB,
          game_started BOOLEAN DEFAULT FALSE,
          current_round INTEGER DEFAULT 0,
          current_play INTEGER DEFAULT 0,
          current_turn INTEGER DEFAULT 0,
          cards_on_table JSONB DEFAULT '[]'::jsonb,
          deck JSONB DEFAULT '[]'::jsonb,
          score_table JSONB DEFAULT '[]'::jsonb
        );
      `
      console.log("Table 'poker_games' created successfully")
    } else {
      // Alter the table to add missing columns
      await sql`
        ALTER TABLE poker_games
        ADD COLUMN IF NOT EXISTS game_started BOOLEAN DEFAULT FALSE,
        ADD COLUMN IF NOT EXISTS current_round INTEGER DEFAULT 0,
        ADD COLUMN IF NOT EXISTS current_play INTEGER DEFAULT 0,
        ADD COLUMN IF NOT EXISTS current_turn INTEGER DEFAULT 0,
        ADD COLUMN IF NOT EXISTS cards_on_table JSONB DEFAULT '[]'::jsonb,
        ADD COLUMN IF NOT EXISTS deck JSONB DEFAULT '[]'::jsonb,
        ADD COLUMN IF NOT EXISTS score_table JSONB DEFAULT '[]'::jsonb;
      `
      console.log("Table 'poker_games' updated successfully")
    }

    return NextResponse.json({ message: "Database migration completed successfully" }, { status: 200 })
  } catch (error) {
    console.error("Error during database migration:", error)
    return NextResponse.json({ error: "Failed to migrate database" }, { status: 500 })
  }
}

