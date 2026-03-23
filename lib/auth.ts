import NextAuth from "next-auth"
import Google from "next-auth/providers/google"
import Credentials from "next-auth/providers/credentials"
import { sql } from "@vercel/postgres"
import bcrypt from "bcryptjs"
import type { Adapter, AdapterUser, AdapterAccount, AdapterSession, VerificationToken } from "next-auth/adapters"

// ── Custom Postgres adapter using our auth_* tables ──────────────────────────
function PokerPostgresAdapter(): Adapter {
  return {
    async createUser(user) {
      const { rows } = await sql`
        INSERT INTO auth_users (name, email, email_verified, image)
        VALUES (${user.name ?? null}, ${user.email}, ${user.emailVerified?.toISOString() ?? null}, ${user.image ?? null})
        RETURNING *
      `
      return toAdapterUser(rows[0])
    },
    async getUser(id) {
      const { rows } = await sql`SELECT * FROM auth_users WHERE id = ${id}`
      return rows[0] ? toAdapterUser(rows[0]) : null
    },
    async getUserByEmail(email) {
      const { rows } = await sql`SELECT * FROM auth_users WHERE email = ${email}`
      return rows[0] ? toAdapterUser(rows[0]) : null
    },
    async getUserByAccount({ provider, providerAccountId }) {
      const { rows } = await sql`
        SELECT u.* FROM auth_users u
        JOIN auth_accounts a ON a.user_id = u.id
        WHERE a.provider = ${provider} AND a.provider_account_id = ${providerAccountId}
      `
      return rows[0] ? toAdapterUser(rows[0]) : null
    },
    async updateUser(user) {
      const { rows } = await sql`
        UPDATE auth_users SET
          name = COALESCE(${user.name ?? null}, name),
          email = COALESCE(${user.email ?? null}, email),
          image = COALESCE(${user.image ?? null}, image),
          email_verified = COALESCE(${user.emailVerified?.toISOString() ?? null}, email_verified)
        WHERE id = ${user.id!}
        RETURNING *
      `
      return toAdapterUser(rows[0])
    },
    async linkAccount(account) {
      await sql`
        INSERT INTO auth_accounts (user_id, type, provider, provider_account_id, refresh_token, access_token, expires_at, token_type, scope, id_token, session_state)
        VALUES (${account.userId}, ${account.type}, ${account.provider}, ${account.providerAccountId},
          ${account.refresh_token ?? null}, ${account.access_token ?? null}, ${(account.expires_at as number) ?? null},
          ${account.token_type ?? null}, ${account.scope ?? null}, ${account.id_token ?? null}, ${(account.session_state as string) ?? null})
      `
      return account as AdapterAccount
    },
    async createSession(session) {
      const { rows } = await sql`
        INSERT INTO auth_sessions (user_id, expires, session_token)
        VALUES (${session.userId}, ${session.expires.toISOString()}, ${session.sessionToken})
        RETURNING *
      `
      return toAdapterSession(rows[0])
    },
    async getSessionAndUser(sessionToken) {
      const { rows } = await sql`
        SELECT s.*, u.id as uid, u.name as uname, u.email as uemail,
               u.email_verified as uemail_verified, u.image as uimage
        FROM auth_sessions s
        JOIN auth_users u ON u.id = s.user_id
        WHERE s.session_token = ${sessionToken} AND s.expires > NOW()
      `
      if (!rows[0]) return null
      const r = rows[0]
      return {
        session: { sessionToken: r.session_token, userId: r.user_id, expires: new Date(r.expires) },
        user: { id: r.uid, name: r.uname, email: r.uemail, emailVerified: r.uemail_verified ? new Date(r.uemail_verified) : null, image: r.uimage },
      }
    },
    async updateSession(session) {
      const { rows } = await sql`
        UPDATE auth_sessions SET expires = ${session.expires!.toISOString()}
        WHERE session_token = ${session.sessionToken}
        RETURNING *
      `
      return rows[0] ? toAdapterSession(rows[0]) : null
    },
    async deleteSession(sessionToken) {
      await sql`DELETE FROM auth_sessions WHERE session_token = ${sessionToken}`
    },
    async createVerificationToken(token) {
      await sql`
        INSERT INTO auth_verification_tokens (identifier, token, expires)
        VALUES (${token.identifier}, ${token.token}, ${token.expires.toISOString()})
      `
      return token as VerificationToken
    },
    async useVerificationToken({ identifier, token }) {
      const { rows } = await sql`
        DELETE FROM auth_verification_tokens
        WHERE identifier = ${identifier} AND token = ${token}
        RETURNING *
      `
      return rows[0] ? { identifier: rows[0].identifier, token: rows[0].token, expires: new Date(rows[0].expires) } : null
    },
    async deleteUser(userId) {
      await sql`DELETE FROM auth_users WHERE id = ${userId}`
    },
    async unlinkAccount({ provider, providerAccountId }) {
      await sql`DELETE FROM auth_accounts WHERE provider = ${provider} AND provider_account_id = ${providerAccountId}`
    },
  }
}

function toAdapterUser(row: Record<string, unknown>): AdapterUser {
  return {
    id: row.id as string,
    name: row.name as string | null,
    email: row.email as string,
    emailVerified: row.email_verified ? new Date(row.email_verified as string) : null,
    image: row.image as string | null,
  }
}

function toAdapterSession(row: Record<string, unknown>): AdapterSession {
  return {
    sessionToken: row.session_token as string,
    userId: row.user_id as string,
    expires: new Date(row.expires as string),
  }
}

// ── Auth config ───────────────────────────────────────────────────────────────
export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PokerPostgresAdapter(),
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID!,
      clientSecret: process.env.AUTH_GOOGLE_SECRET!,
      allowDangerousEmailAccountLinking: true,
    }),
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null
        const email = credentials.email as string
        const password = credentials.password as string

        const { rows } = await sql`SELECT * FROM auth_users WHERE email = ${email}`
        const user = rows[0]
        if (!user || !user.password) return null

        const valid = await bcrypt.compare(password, user.password as string)
        if (!valid) return null

        return { id: user.id as string, name: user.name as string, email: user.email as string, image: user.image as string | null }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
      }
      return token
    },
    async session({ session, token }) {
      if (session.user && token) {
        session.user.id = token.id as string
        // Attach profile avatar/nickname
        if (token.id) {
          const { rows } = await sql`SELECT avatar_url, nickname FROM user_profiles WHERE user_id = ${token.id as string}`
          if (rows[0]) {
            if (rows[0].avatar_url) session.user.image = rows[0].avatar_url as string
            if (rows[0].nickname) session.user.name = rows[0].nickname as string
          }
        }
      }
      return session
    },
  },
})
