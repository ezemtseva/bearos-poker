"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import GameTable from "../../../components/GameTable"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import type { GameData } from "../../../types/game"

export default function Game() {
  const params = useParams()
  const tableId = params?.tableId as string
  const [gameData, setGameData] = useState<GameData | null>(null)
  const { toast } = useToast()

  useEffect(() => {
    if (!tableId) {
      toast({
        title: "Error",
        description: "No table ID provided",
        variant: "destructive",
      })
      return
    }

    const eventSource = new EventSource(`/api/sse?tableId=${tableId}`)

    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data)
      setGameData(data)
    }

    eventSource.addEventListener("init", (event) => {
      const data = JSON.parse((event as MessageEvent).data)
      setGameData(data)
    })

    eventSource.addEventListener("update", (event) => {
      const data = JSON.parse((event as MessageEvent).data)
      setGameData(data)
    })

    eventSource.onerror = (error) => {
      console.error("SSE error:", error)
      toast({
        title: "Error",
        description: "Failed to connect to game server",
        variant: "destructive",
      })
      eventSource.close()
    }

    return () => {
      eventSource.close()
    }
  }, [tableId, toast])

  const handleShare = () => {
    const shareUrl = `${window.location.origin}/join-game?tableId=${tableId}`
    navigator.clipboard.writeText(shareUrl)
    toast({
      title: "Link Copied!",
      description: "Share this link with your friends to invite them to the game.",
    })
  }

  if (!gameData) {
    return <div>Loading...</div>
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <GameTable tableId={gameData.tableId} players={gameData.players} />
      <div className="mt-4 flex justify-center">
        <Button onClick={handleShare}>Share Game Link</Button>
      </div>
    </div>
  )
}

