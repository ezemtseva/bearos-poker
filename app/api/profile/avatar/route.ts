import { NextResponse } from "next/server"
import { put } from "@vercel/blob"
import { sql } from "@vercel/postgres"
import { auth } from "@/lib/auth"

export const maxDuration = 30

export async function POST(req: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const userId = session.user.id

    let formData: FormData
    try {
      formData = await req.formData()
    } catch (e) {
      return NextResponse.json({ error: `formData parse failed: ${String(e)}` }, { status: 400 })
    }

    const file = formData.get("avatar") as File | null
    if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 })

    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"]
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: "Invalid file type" }, { status: 400 })
    }
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: "File too large. Max 5MB" }, { status: 400 })
    }

    const ext = file.name.split(".").pop() ?? "jpg"
    const buffer = await file.arrayBuffer()

    const blob = await put(`avatars/${userId}.${ext}`, buffer, {
      access: "public",
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType: file.type,
    })

    await sql`
      INSERT INTO user_profiles (user_id, avatar_url, updated_at)
      VALUES (${userId}, ${blob.url}, NOW())
      ON CONFLICT (user_id) DO UPDATE SET avatar_url = ${blob.url}, updated_at = NOW()
    `

    return NextResponse.json({ url: blob.url })
  } catch (error) {
    console.error("Avatar upload error:", error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
