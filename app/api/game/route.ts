import { sql } from "@vercel/postgres"
import { NextResponse } from "next/server"

// First, let's create our table if it doesn't exist
async function initializeDatabase() {
  await sql`
    CREATE TABLE IF NOT EXISTS poker_games (
      table_id TEXT PRIMARY KEY,
      players JSONB NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `
}

export async function POST(request: Request) {
  await initializeDatabase()

  const { action, tableId, playerName } = await request.json()

  if (action === "create") {
    const newTableId = Math.random().toString(36).substr(2, 9)
    const gameData = {
      players: [{ name: playerName, seatNumber: 1, isOwner: true }],
    }

    await sql`
      INSERT INTO poker_games (table_id, players)
      VALUES (${newTableId}, ${JSON.stringify(gameData.players)});
    `

    return NextResponse.json({ tableId: newTableId })
  } else if (action === "join") {
    const result = await sql`
      SELECT * FROM poker_games WHERE table_id = ${tableId};
    `

    if (result.rows.length === 0) {
      return NextResponse.json({ error: "Game not found" }, { status: 404 })
    }

    const game = result.rows[0]
    const players = game.players

    if (players.length >= 6) {
      return NextResponse.json({ error: "Game is full" }, { status: 400 })
    }

    const newSeatNumber = players.length + 1
    players.push({ name: playerName, seatNumber: newSeatNumber, isOwner: false })

    await sql`
      UPDATE poker_games 
      SET players = ${JSON.stringify(players)}
      WHERE table_id = ${tableId};
    `

    // Emit a WebSocket event to update all connected clients
    // This part is removed because the interfaces are removed.  The functionality would need to be re-implemented using a different approach if needed.

    return NextResponse.json({ tableId, seatNumber: newSeatNumber })
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 })
}

export async function GET(request: Request) {
  await initializeDatabase()

  const { searchParams } = new URL(request.url)
  const tableId = searchParams.get("tableId")

  if (!tableId) {
    return NextResponse.json({ error: "Table ID is required" }, { status: 400 })
  }

  const result = await sql`
    SELECT * FROM poker_games WHERE table_id = ${tableId};
  `

  if (result.rows.length === 0) {
    return NextResponse.json({ error: "Game not found" }, { status: 404 })
  }

  const game = result.rows[0]
  return NextResponse.json({
    tableId: game.table_id,
    players: game.players,
  })
}

