import { sql } from "@vercel/postgres"
import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const userId = session.user.id

  const [profileRes, settingsRes, historyRes] = await Promise.all([
    sql`SELECT nickname, avatar_url FROM user_profiles WHERE user_id = ${userId}`,
    sql`SELECT * FROM user_settings WHERE user_id = ${userId}`,
    sql`SELECT * FROM game_history WHERE user_id = ${userId} ORDER BY played_at DESC LIMIT 200`,
  ])

  return NextResponse.json({
    profile: profileRes.rows[0] ?? null,
    settings: settingsRes.rows[0] ?? null,
    history: historyRes.rows,
  })
}

export async function PATCH(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const userId = session.user.id
  const body = await req.json()

  if (body.nickname !== undefined) {
    await sql`
      INSERT INTO user_profiles (user_id, nickname, updated_at)
      VALUES (${userId}, ${body.nickname}, NOW())
      ON CONFLICT (user_id) DO UPDATE SET nickname = ${body.nickname}, updated_at = NOW()
    `
  }

  if (body.settings !== undefined) {
    const s = body.settings
    await sql`
      INSERT INTO user_settings (user_id, table_skin, room_skin, card_back_skin, seat_skin, bet_blink_enabled, language, is_customized, updated_at)
      VALUES (${userId}, ${s.table_skin ?? 'blue'}, ${s.room_skin ?? 'classic_blue'}, ${s.card_back_skin ?? 'black'}, ${s.seat_skin ?? 'gray'}, ${s.bet_blink_enabled ?? false}, ${s.language ?? 'en'}, TRUE, NOW())
      ON CONFLICT (user_id) DO UPDATE SET
        table_skin = COALESCE(${s.table_skin ?? null}, user_settings.table_skin),
        room_skin = COALESCE(${s.room_skin ?? null}, user_settings.room_skin),
        card_back_skin = COALESCE(${s.card_back_skin ?? null}, user_settings.card_back_skin),
        seat_skin = COALESCE(${s.seat_skin ?? null}, user_settings.seat_skin),
        bet_blink_enabled = COALESCE(${s.bet_blink_enabled ?? null}, user_settings.bet_blink_enabled),
        language = COALESCE(${s.language ?? null}, user_settings.language),
        is_customized = TRUE,
        updated_at = NOW()
    `
  }

  return NextResponse.json({ ok: true })
}
