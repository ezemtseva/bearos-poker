"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
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

      router.push(`/game/${data.tableId}`)
    } catch (error: unknown) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "An error occurred while creating the game",
        variant: "destructive",
      })
    }
  }

  return (
    <div className="container mx-auto px-4 min-h-screen flex items-center justify-center">
      <div className="max-w-md w-full">
        <h1 className="text-2xl font-bold mb-4 text-center text-white">{t("createTable")}</h1>
        <form onSubmit={handleCreateGame} className="space-y-4">
          <div>
            <label htmlFor="playerName" className="block text-sm font-medium text-white mb-1">
              {t("enterYourName")}
            </label>
            <Input
              type="text"
              id="playerName"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              className="w-full"
              required
            />
          </div>
          <Button type="submit" className="mx-auto block w-[120px] h-[40px]">
            {t("create")}
          </Button>
        </form>
      </div>
    </div>
  )
}
