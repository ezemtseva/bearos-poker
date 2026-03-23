import { sql } from "@vercel/postgres"
import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const { tableId, playerName, totalRounds, finalScore, playersCount, gameLength, isWinner, pokerHands, playersData, place } = await req.json()

    await sql`
      INSERT INTO game_history (user_id, table_id, player_name, total_rounds, final_score, players_count, game_length, is_winner, poker_hands, players_data, place)
      VALUES (
        ${session.user.id}, ${tableId}, ${playerName}, ${totalRounds}, ${finalScore},
        ${playersCount}, ${gameLength}, ${isWinner ?? false}, ${pokerHands ?? 0},
        ${JSON.stringify(playersData ?? [])}::jsonb, ${place ?? 0}
      )
    `

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("History record error:", error)
    return NextResponse.json({ error: "Failed to record history" }, { status: 500 })
  }
}
