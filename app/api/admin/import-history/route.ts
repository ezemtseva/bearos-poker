import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@vercel/postgres"

// Hardcoded emails in fixed order: [0]=mhamzin, [1]=loguinov, [2]=vpolibin
const EMAILS = [
  "mhamzin@gmail.com",
  "loguinov.yury@gmail.com",
  "vpolibin@gmail.com",
]

// [mhamzin, loguinov, vpolibin]
const ROWS: [number, number, number][] = [
  [56, 163, 83],
  [151, 168, 154],
  [179, 68, 246],
  [236, 57, 124],
  [138, 116, -77],
  [189, 125, 90],
  [-113, 294, 259],
  [-40, 138, 218],
  [176, 138, 178],
  [160, 188, 165],
  [173, 46, 154],
  [178, 174, 126],
  [134, 258, 245],
  [191, 218, 125],
  [244, 110, -36],
  [234, 107, 176],
  [186, -3, 224],
  [153, -120, 175],
  [-60, 140, 162],
  [122, 160, 149],
  [218, 160, 176],
  [165, 150, 94],
  [-92, 268, 132],
  [96, 139, 157],
  [-11, 138, 213],
  [241, 89, 271],
  [171, 134, 154],
  [85, 234, 182],
  [191, 200, 75],
  [128, 193, 217],
  [163, 90, 65],
  [183, 68, 165],
  [150, 73, 64],
  [200, 174, 199],
  [199, 180, 136],
  [89, 201, 230],
  [118, 129, 112],
  [126, 188, 55],
  [131, 221, 156],
  [177, 131, 75],
  [211, 112, 108],
  [136, 137, 147],
  [118, 127, 249],
  [208, 227, 69],
  [226, 150, 115],
  [185, 195, 205],
  [184, 138, 145],
  [205, 2, 48],
  [2, 175, 190],
  [128, 221, 197],
  [172, 171, 68],
  [85, 207, 227],
  [230, 204, 252],
  [125, 207, 233],
  [12, 162, 225],
  [143, 151, 149],
  [-146, 121, 223],
  [199, 76, -15],
  [184, 138, 171],
  [69, 111, 84],
  [162, 132, 166],
  [174, 209, 89],
  [100, 166, 235],
  [77, 184, 104],
  [98, -2, 148],
  [219, 235, 130],
  [178, -65, 247],
  [38, 214, -128],
  [203, 190, 149],
  [123, 164, 166],
  [226, -42, 158],
  [116, 261, 277],
  [211, 261, 52],
  [152, 160, 203],
  [110, 203, 178],
  [123, 172, 131],
  [190, 40, 92],
  [150, 133, 108],
  [-25, 184, 194],
  [227, -107, 174],
  [188, 58, 230],
  [-27, 156, 100],
  [157, 206, 247],
  [254, 184, 122],
  [178, 222, -19],
  [-20, 200, 182],
  [56, 171, 138],
  [50, -25, 298],
  [87, 194, 191],
  [266, -31, 125],
  [209, 183, 263],
  [84, 162, 201],
  [196, 69, 168],
  [244, 192, 165],
  [248, 153, 207],
  [143, 169, 209],
  [223, 175, 165],
  [176, 212, 66],
  [12, -16, 173],
  [171, 149, 107],
  [163, -58, 234],
  [18, 149, 216],
]

// Spread games evenly from 2023-10-01 to 2026-03-29
const START_DATE = new Date("2023-10-01").getTime()
const END_DATE   = new Date("2026-03-29").getTime()

export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get("secret")
  if (secret !== process.env.IMPORT_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // 1. Look up user_id + display name for each email
  const users: { id: string; name: string }[] = []
  for (const email of EMAILS) {
    const res = await sql`
      SELECT u.id, COALESCE(p.nickname, u.name, u.email) AS name
      FROM auth_users u
      LEFT JOIN user_profiles p ON p.user_id = u.id
      WHERE u.email = ${email}
    `
    if (res.rows.length === 0) {
      return NextResponse.json({ error: `User not found: ${email}` }, { status: 404 })
    }
    users.push({ id: res.rows[0].id, name: res.rows[0].name })
  }

  // 2. Clear any previously imported rows (idempotent re-run)
  await sql`DELETE FROM game_history WHERE table_id LIKE 'hist-%'`

  // 3. Build all insert promises and run in parallel
  const stepMs = (END_DATE - START_DATE) / (ROWS.length - 1)
  const inserts: Promise<unknown>[] = []

  for (let i = 0; i < ROWS.length; i++) {
    const scores = ROWS[i]
    const playedAt = new Date(START_DATE + stepMs * i).toISOString()
    const tableId = `hist-${String(i + 1).padStart(3, "0")}`

    const sorted = [...scores].map((s, idx) => ({ s, idx })).sort((a, b) => b.s - a.s)
    const places = [0, 0, 0]
    sorted.forEach((item, rank) => { places[item.idx] = rank + 1 })

    const playersData = users.map((u, j) => ({
      name: u.name,
      score: scores[j],
      place: places[j],
    }))

    for (let j = 0; j < 3; j++) {
      inserts.push(sql`
        INSERT INTO game_history
          (user_id, table_id, player_name, total_rounds, final_score,
           players_count, game_length, is_winner, poker_hands,
           players_data, place, played_at)
        VALUES
          (${users[j].id}, ${tableId}, ${users[j].name}, ${22}, ${scores[j]},
           ${3}, ${"basic"}, ${places[j] === 1}, ${0},
           ${JSON.stringify(playersData)}::jsonb, ${places[j]}, ${playedAt})
      `)
    }
  }

  await Promise.all(inserts)
  const inserted = inserts.length

  return NextResponse.json({ ok: true, inserted, users: users.map(u => u.name) })
}
