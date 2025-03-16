import { type NextRequest, NextResponse } from "next/server"

export const runtime = "edge"

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const tableId = searchParams.get("tableId")
  const clientId = searchParams.get("clientId")

  console.log(`[PING] Received ping from client ${clientId} for table ${tableId}`)

  return NextResponse.json({ success: true, timestamp: Date.now() })
}

