import { sql } from "@vercel/postgres"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    await sql`ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS language TEXT DEFAULT 'en'`
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
