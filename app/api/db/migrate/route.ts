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
          score_table JSONB DEFAULT '[]'::jsonb,
          all_cards_played_timestamp BIGINT,
          play_end_timestamp BIGINT,
          last_played_card JSONB,
          all_cards_played BOOLEAN DEFAULT FALSE,
          highest_card JSONB,
          round_start_player_index INTEGER DEFAULT 0,
          all_bets_placed BOOLEAN DEFAULT FALSE,
          game_over BOOLEAN DEFAULT FALSE,
          current_betting_turn INTEGER,
          bets_placed_timestamp BIGINT
        );
      `
      console.log("Table 'poker_games' created successfully")
    } else {
      // Alter the table to add missing columns (if any)
      await sql`
        ALTER TABLE poker_games
        ADD COLUMN IF NOT EXISTS game_started BOOLEAN DEFAULT FALSE,
        ADD COLUMN IF NOT EXISTS current_round INTEGER DEFAULT 0,
        ADD COLUMN IF NOT EXISTS current_play INTEGER DEFAULT 0,
        ADD COLUMN IF NOT EXISTS current_turn INTEGER DEFAULT 0,
        ADD COLUMN IF NOT EXISTS cards_on_table JSONB DEFAULT '[]'::jsonb,
        ADD COLUMN IF NOT EXISTS deck JSONB DEFAULT '[]'::jsonb,
        ADD COLUMN IF NOT EXISTS score_table JSONB DEFAULT '[]'::jsonb,
        ADD COLUMN IF NOT EXISTS all_cards_played_timestamp BIGINT,
        ADD COLUMN IF NOT EXISTS play_end_timestamp BIGINT,
        ADD COLUMN IF NOT EXISTS last_played_card JSONB,
        ADD COLUMN IF NOT EXISTS all_cards_played BOOLEAN DEFAULT FALSE,
        ADD COLUMN IF NOT EXISTS highest_card JSONB,
        ADD COLUMN IF NOT EXISTS round_start_player_index INTEGER DEFAULT 0,
        ADD COLUMN IF NOT EXISTS all_bets_placed BOOLEAN DEFAULT FALSE,
        ADD COLUMN IF NOT EXISTS game_over BOOLEAN DEFAULT FALSE,
        ADD COLUMN IF NOT EXISTS current_betting_turn INTEGER,
        ADD COLUMN IF NOT EXISTS bets_placed_timestamp BIGINT;
      `
      console.log("Table 'poker_games' updated successfully")
    }

    return NextResponse.json({ message: "Database migration completed successfully" }, { status: 200 })
  } catch (error) {
    console.error("Error during database migration:", error)
    return NextResponse.json({ error: "Failed to migrate database" }, { status: 500 })
  }
}

