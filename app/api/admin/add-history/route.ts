import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@vercel/postgres"

export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get("secret")
  if (secret !== process.env.IMPORT_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const email = req.nextUrl.searchParams.get("email")
  const tableId = req.nextUrl.searchParams.get("tableId")
  const finalScore = parseInt(req.nextUrl.searchParams.get("score") ?? "0")
  const place = parseInt(req.nextUrl.searchParams.get("place") ?? "0")
  const totalRounds = parseInt(req.nextUrl.searchParams.get("rounds") ?? "22")
  const playersCount = parseInt(req.nextUrl.searchParams.get("players") ?? "3")
  const gameLength = req.nextUrl.searchParams.get("gameLength") ?? "basic"
  const playedAt = req.nextUrl.searchParams.get("playedAt") ?? new Date().toISOString()

  if (!email || !tableId) {
    return NextResponse.json({ error: "email and tableId are required" }, { status: 400 })
  }

  const userRes = await sql`
    SELECT u.id, COALESCE(p.nickname, u.name, u.email) AS name
    FROM auth_users u
    LEFT JOIN user_profiles p ON p.user_id = u.id
    WHERE u.email = ${email}
  `
  if (userRes.rows.length === 0) {
    return NextResponse.json({ error: `User not found: ${email}` }, { status: 404 })
  }

  const { id: userId, name: playerName } = userRes.rows[0]

  await sql`
    INSERT INTO game_history
      (user_id, table_id, player_name, total_rounds, final_score,
       players_count, game_length, is_winner, poker_hands,
       players_data, place, played_at)
    VALUES
      (${userId}, ${tableId}, ${playerName}, ${totalRounds}, ${finalScore},
       ${playersCount}, ${gameLength}, ${place === 1}, ${0},
       ${JSON.stringify([])}::jsonb, ${place}, ${playedAt})
  `

  return NextResponse.json({ ok: true, playerName, finalScore, place })
}
