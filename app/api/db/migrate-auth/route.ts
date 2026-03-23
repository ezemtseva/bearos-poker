import { sql } from "@vercel/postgres"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    // NextAuth required tables
    await sql`
      CREATE TABLE IF NOT EXISTS auth_users (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        name TEXT,
        email TEXT UNIQUE,
        email_verified TIMESTAMPTZ,
        image TEXT,
        password TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `

    await sql`
      CREATE TABLE IF NOT EXISTS auth_accounts (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        user_id TEXT NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,
        type TEXT NOT NULL,
        provider TEXT NOT NULL,
        provider_account_id TEXT NOT NULL,
        refresh_token TEXT,
        access_token TEXT,
        expires_at BIGINT,
        token_type TEXT,
        scope TEXT,
        id_token TEXT,
        session_state TEXT,
        UNIQUE(provider, provider_account_id)
      );
    `

    await sql`
      CREATE TABLE IF NOT EXISTS auth_sessions (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        user_id TEXT NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,
        expires TIMESTAMPTZ NOT NULL,
        session_token TEXT UNIQUE NOT NULL
      );
    `

    await sql`
      CREATE TABLE IF NOT EXISTS auth_verification_tokens (
        identifier TEXT NOT NULL,
        token TEXT NOT NULL,
        expires TIMESTAMPTZ NOT NULL,
        PRIMARY KEY (identifier, token)
      );
    `

    // User profile — nickname, avatar
    await sql`
      CREATE TABLE IF NOT EXISTS user_profiles (
        user_id TEXT PRIMARY KEY REFERENCES auth_users(id) ON DELETE CASCADE,
        nickname TEXT,
        avatar_url TEXT,
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `

    // User settings — table/room/card/seat skins
    await sql`
      CREATE TABLE IF NOT EXISTS user_settings (
        user_id TEXT PRIMARY KEY REFERENCES auth_users(id) ON DELETE CASCADE,
        table_skin TEXT DEFAULT 'blue',
        room_skin TEXT DEFAULT 'classic_blue',
        card_back_skin TEXT DEFAULT 'black',
        seat_skin TEXT DEFAULT 'gray',
        bet_blink_enabled BOOLEAN DEFAULT FALSE,
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `

    // Game history
    await sql`
      CREATE TABLE IF NOT EXISTS game_history (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        user_id TEXT NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,
        table_id TEXT NOT NULL,
        player_name TEXT NOT NULL,
        total_rounds INTEGER NOT NULL DEFAULT 0,
        final_score INTEGER NOT NULL DEFAULT 0,
        players_count INTEGER NOT NULL DEFAULT 0,
        game_length TEXT DEFAULT 'basic',
        played_at TIMESTAMPTZ DEFAULT NOW()
      );
    `

    return NextResponse.json({ message: "Auth migration completed" }, { status: 200 })
  } catch (error) {
    console.error("Auth migration error:", error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
