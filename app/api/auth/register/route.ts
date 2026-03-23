import { sql } from "@vercel/postgres"
import { NextResponse } from "next/server"
import bcrypt from "bcryptjs"

export async function POST(req: Request) {
  try {
    const { email, password, name } = await req.json()

    if (!email || !password || !name) {
      return NextResponse.json({ error: "All fields required" }, { status: 400 })
    }

    if (password.length < 6) {
      return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 })
    }

    const existing = await sql`SELECT id FROM auth_users WHERE email = ${email}`
    if (existing.rows.length > 0) {
      return NextResponse.json({ error: "Email already registered" }, { status: 409 })
    }

    const hash = await bcrypt.hash(password, 12)

    const { rows } = await sql`
      INSERT INTO auth_users (name, email, password)
      VALUES (${name}, ${email}, ${hash})
      RETURNING id
    `

    // Create default profile and settings
    await sql`INSERT INTO user_profiles (user_id, nickname) VALUES (${rows[0].id}, ${name})`
    await sql`INSERT INTO user_settings (user_id) VALUES (${rows[0].id})`

    return NextResponse.json({ ok: true }, { status: 201 })
  } catch (error) {
    console.error("Register error:", error)
    return NextResponse.json({ error: "Registration failed" }, { status: 500 })
  }
}
