"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useToast } from "@/hooks/use-toast"
import { useSession } from "next-auth/react"
import { useLocale } from "@/lib/locale-context"

export default function CreateGame() {
  const { data: session } = useSession()
  const { t } = useLocale()
  const [playerName, setPlayerName] = useState("")
  const router = useRouter()
  const { toast } = useToast()

  useEffect(() => {
    // Pre-fill from session, then localStorage fallback
    const name = session?.user?.name || localStorage.getItem("playerName") || ""
    if (name) setPlayerName(name)
  }, [session?.user?.name])

  const handleCreateGame = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!playerName) {
      toast({ title: "Error", description: "Please enter your name", variant: "destructive" })
      return
    }

    localStorage.setItem("playerName", playerName)
    sessionStorage.setItem("playerName", playerName)

    // Pass profile avatar if logged in
    const avatar = session?.user?.image ?? undefined

    try {
      const response = await fetch("/api/game/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerName, avatar }),
      })

      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)
      const data = await response.json()
      if (data.error) throw new Error(data.error)

      router.push(`/game/${data.tableId}?playerName=${encodeURIComponent(playerName)}`)
    } catch (error: unknown) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "An error occurred while creating the game",
        variant: "destructive",
      })
    }
  }

  return (
    <div className="flex-1 flex items-center justify-center px-4 py-8 md:py-14">
      <form
        onSubmit={handleCreateGame}
        className="w-full max-w-[520px] bg-bp-surface border border-bp-border rounded-3xl px-5 py-6 md:px-8 md:py-9 flex flex-col gap-6 md:gap-7"
      >
        <h1 className="m-0 font-display font-extrabold text-[40px] md:text-[clamp(36px,5vw,52px)] leading-[0.98] tracking-[-0.03em]">
          {t("createTitle")}
          <br />
          <span className="text-bp-accent">{t("titleTable")}</span>
        </h1>
        <div className="flex flex-col gap-2.5">
          <label htmlFor="playerName" className="bp-label">
            {t("yourName")}
          </label>
          <Input
            type="text"
            id="playerName"
            autoComplete="nickname"
            placeholder={t("enterYourName")}
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            className="h-14 px-[18px] text-[17px] md:text-[17px]"
            required
          />
        </div>
        <Button type="submit" size="lg" className="w-full">
          {t("create")}
          <ArrowRight size={20} />
        </Button>
        <p className="m-0 text-sm text-bp-muted text-center">
          {t("haveIdQuestion")}{" "}
          <Link href="/join-game" className="text-bp-accent hover:text-bp-accentHover">{t("joinATable")}</Link>
        </p>
      </form>
    </div>
  )
}
