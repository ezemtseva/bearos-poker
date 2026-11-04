"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useToast } from "@/hooks/use-toast"
import { useSession } from "next-auth/react"
import { useLocale } from "@/lib/locale-context"

export default function JoinGameClient() {
  const { data: session } = useSession()
  const { t } = useLocale()
  const [tableId, setTableId] = useState("")
  const [playerName, setPlayerName] = useState("")
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()

  useEffect(() => {
    const tableIdParam = searchParams?.get("tableId")
    if (tableIdParam) setTableId(tableIdParam)

    const name = session?.user?.name || localStorage.getItem("playerName") || ""
    if (name) setPlayerName(name)
  }, [searchParams, session?.user?.name])

  const handleJoinGame = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!tableId || !playerName) {
      toast({ title: t("joinErrorMissing"), variant: "destructive" })
      return
    }

    localStorage.setItem("playerName", playerName)
    sessionStorage.setItem("playerName", playerName)

    const avatar = session?.user?.image ?? undefined

    try {
      const response = await fetch("/api/game/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tableId, playerName, avatar }),
      })

      const data = await response.json().catch(() => ({}))
      if (!response.ok || data.error) {
        const messages: Record<string, string> = {
          name_taken: t("joinErrorNameTaken"),
          not_found: t("joinErrorNotFound"),
          table_full: t("joinErrorFull"),
          missing_fields: t("joinErrorMissing"),
        }
        toast({ title: messages[data.code] ?? t("joinErrorGeneric"), variant: "destructive" })
        return
      }

      console.log("Joining game with player name:", playerName)

      router.push(`/game/${tableId}?playerName=${encodeURIComponent(playerName)}`)
    } catch (error: unknown) {
      console.error("Error joining game:", error)
      toast({ title: t("joinErrorGeneric"), variant: "destructive" })
    }
  }

  return (
    <div className="flex-1 flex items-center justify-center px-4 py-8 md:py-14">
      <form
        onSubmit={handleJoinGame}
        className="w-full max-w-[520px] bg-bp-surface border border-bp-border rounded-3xl px-5 py-6 md:px-8 md:py-9 flex flex-col gap-6 md:gap-7"
      >
        <h1 className="m-0 font-display font-extrabold text-[40px] md:text-[clamp(36px,5vw,52px)] leading-[0.98] tracking-[-0.03em]">
          {t("joinTitle")}
          <br />
          <span className="text-bp-accent">{t("titleTable")}</span>
        </h1>
        <div className="flex flex-col gap-2.5">
          <label htmlFor="tableId" className="bp-label">
            {t("tableId")}
          </label>
          <Input
            type="text"
            id="tableId"
            autoComplete="off"
            spellCheck={false}
            placeholder={t("tableIdPlaceholder")}
            value={tableId}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTableId(e.target.value)}
            className="h-[60px] md:h-16 px-4 md:px-[18px] font-mono text-[22px] md:text-2xl tracking-[0.18em] text-bp-accent placeholder:tracking-normal placeholder:text-lg"
            required
          />
        </div>
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
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPlayerName(e.target.value)}
            className="h-14 px-4 md:px-[18px] text-[17px] md:text-[17px]"
            required
          />
        </div>
        <Button type="submit" size="lg" className="w-full">
          {t("join")}
          <ArrowRight size={20} />
        </Button>
        <p className="m-0 text-sm text-bp-muted text-center">
          {t("noIdYet")}{" "}
          <Link href="/create-game" className="text-bp-accent hover:text-bp-accentHover">{t("createATable")}</Link>
        </p>
      </form>
    </div>
  )
}
