"use client"

import { useState, Suspense } from "react"
import { signIn } from "next-auth/react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import Logo from "@/components/Logo"
import { useLocale } from "@/lib/locale-context"

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const callbackUrl = searchParams.get("callbackUrl") || "/"
  const { t } = useLocale()

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setLoading(true)
    const res = await signIn("credentials", { email, password, redirect: false })
    setLoading(false)
    if (res?.error) {
      setError(t("invalidCredentials"))
    } else {
      router.push(callbackUrl)
      router.refresh()
    }
  }

  async function handleGoogle() {
    await signIn("google", { callbackUrl })
  }

  return (
    <div className="flex-1 flex items-center justify-center px-4 py-8 md:py-14">
      <div className="w-full max-w-[440px] bg-bp-surface border border-bp-border rounded-3xl px-5 py-6 md:px-8 md:py-9 text-bp-text">
        <div className="flex flex-col items-center mb-7">
          <Logo size={48} className="mb-4" />
          <h1 className="m-0 font-display font-extrabold text-[32px] leading-none tracking-[-0.03em]">{t("signInHeading")}</h1>
        </div>

        {error && (
          <div className="mb-4 text-sm text-bp-warning bg-bp-warning/10 border border-bp-warning/30 rounded-xl px-3 py-2 text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-3 mb-5">
          <input
            type="email"
            placeholder={t("email")}
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            className="w-full h-[52px] bg-bp-surface2 border border-bp-strong text-bp-text placeholder:text-bp-dim rounded-xl px-4 text-base focus:outline-none focus:border-bp-accent"
          />
          <input
            type="password"
            placeholder={t("password")}
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            className="w-full h-[52px] bg-bp-surface2 border border-bp-strong text-bp-text placeholder:text-bp-dim rounded-xl px-4 text-base focus:outline-none focus:border-bp-accent"
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full h-[52px] bg-bp-accent hover:bg-bp-accentHover disabled:opacity-50 text-bp-bg font-semibold rounded-full text-base transition-colors"
          >
            {loading ? t("signingIn") : t("signInHeading")}
          </button>
        </form>

        <div className="relative mb-5">
          <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-bp-border" /></div>
          <div className="relative flex justify-center"><span className="bg-bp-surface px-2 font-mono text-[11px] tracking-[0.1em] uppercase text-bp-dim">{t("or")}</span></div>
        </div>

        <button
          onClick={handleGoogle}
          className="w-full h-[52px] flex items-center justify-center gap-2 border border-bp-strong hover:border-bp-muted text-bp-text font-semibold rounded-full text-[15px] transition-colors mb-6"
        >
          <svg width="18" height="18" viewBox="0 0 18 18"><path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z"/><path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"/><path fill="#FBBC05" d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"/><path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"/></svg>
          {t("continueWithGoogle")}
        </button>

        <p className="text-center text-sm text-bp-muted">
          {t("noAccount")}{" "}
          <Link href="/register" className="text-bp-accent hover:text-bp-accentHover">{t("register")}</Link>
        </p>
        <p className="text-center text-sm text-bp-dim mt-2">
          <Link href="/" className="hover:text-bp-text">{t("continueAsGuest")}</Link>
        </p>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  )
}
