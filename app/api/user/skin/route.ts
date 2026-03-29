import { NextResponse } from "next/server"
import { put, del } from "@vercel/blob"
import { sql } from "@vercel/postgres"
import { auth } from "@/lib/auth"

export const maxDuration = 30

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const userId = session.user.id

  let formData: FormData
  try {
    formData = await req.formData()
  } catch (e) {
    return NextResponse.json({ error: `formData parse failed: ${String(e)}` }, { status: 400 })
  }

  const file = formData.get("file") as File | null
  const type = formData.get("type") as string | null // "table" or "card"

  if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 })
  if (type !== "table" && type !== "card") return NextResponse.json({ error: "Invalid type" }, { status: 400 })

  const allowedTypes = ["image/jpeg", "image/png", "image/webp"]
  if (!allowedTypes.includes(file.type)) {
    return NextResponse.json({ error: "Invalid file type. Use JPG, PNG or WebP" }, { status: 400 })
  }
  if (file.size > 5 * 1024 * 1024) {
    return NextResponse.json({ error: "File too large. Max 5MB" }, { status: 400 })
  }

  const column = type === "table" ? "custom_table_skin" : "custom_card_skin"

  // Delete old skin from Blob if exists
  const { rows } = await sql`SELECT custom_table_skin, custom_card_skin FROM user_settings WHERE user_id = ${userId}`
  const oldUrl = rows[0]?.[column]
  if (oldUrl) {
    try { await del(oldUrl) } catch {}
  }

  const ext = file.name.split(".").pop() ?? "jpg"
  const buffer = await file.arrayBuffer()

  const blob = await put(`skins/${userId}-${type}.${ext}`, buffer, {
    access: "public",
    contentType: file.type,
  })

  if (type === "table") {
    await sql`
      INSERT INTO user_settings (user_id, custom_table_skin, table_skin, updated_at)
      VALUES (${userId}, ${blob.url}, 'custom_table', NOW())
      ON CONFLICT (user_id) DO UPDATE SET custom_table_skin = ${blob.url}, table_skin = 'custom_table', updated_at = NOW()
    `
  } else {
    await sql`
      INSERT INTO user_settings (user_id, custom_card_skin, card_back_skin, updated_at)
      VALUES (${userId}, ${blob.url}, 'custom_card', NOW())
      ON CONFLICT (user_id) DO UPDATE SET custom_card_skin = ${blob.url}, card_back_skin = 'custom_card', updated_at = NOW()
    `
  }

  return NextResponse.json({ url: blob.url })
}

export async function DELETE(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const userId = session.user.id
  const { type } = await req.json()
  if (type !== "table" && type !== "card") return NextResponse.json({ error: "Invalid type" }, { status: 400 })

  const column = type === "table" ? "custom_table_skin" : "custom_card_skin"
  const { rows } = await sql`SELECT custom_table_skin, custom_card_skin FROM user_settings WHERE user_id = ${userId}`
  const oldUrl = rows[0]?.[column]
  if (oldUrl) {
    try { await del(oldUrl) } catch {}
  }

  if (type === "table") {
    await sql`UPDATE user_settings SET custom_table_skin = NULL, table_skin = 'blue', updated_at = NOW() WHERE user_id = ${userId}`
  } else {
    await sql`UPDATE user_settings SET custom_card_skin = NULL, card_back_skin = 'black', updated_at = NOW() WHERE user_id = ${userId}`
  }

  return NextResponse.json({ ok: true })
}
