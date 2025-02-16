"use client"

import { useEffect, useState, useRef } from "react"
import { useParams } from "next/navigation"
import GameTable from "../../../components/GameTable"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import type { GameData, Player } from "../../../types/game"

export default function Game() {
  const params = useParams()
  const tableId = params?.tableId as string
  const [gameData, setGameData] = useState<GameData | null>(null)
  const [isOwner, setIsOwner] = useState(false)
  const { toast } = useToast()
  const eventSourceRef = useRef<EventSource | null>(null)

  useEffect(() => {
    if (!tableId) {
      toast({
        title: "Error",
        description: "No table ID provided",
        variant: "destructive",
      })
      return
    }

    const connectSSE = () => {
      const eventSource = new EventSource(`/api/socket?tableId=${tableId}`)

      eventSource.onmessage = (event) => {
        const data = JSON.parse(event.data)
        console.log("Received message:", data)
        setGameData(data)
        setIsOwner(
          data.players.some((player: Player) => player.isOwner && player.name === localStorage.getItem("playerName")),
        )
      }

      eventSource.addEventListener("init", (event) => {
        const data = JSON.parse((event as MessageEvent).data)
        setGameData(data)
        setIsOwner(
          data.players.some((player: Player) => player.isOwner && player.name === localStorage.getItem("playerName")),
        )
      })

      eventSource.addEventListener("update", (event) => {
        const data = JSON.parse((event as MessageEvent).data)
        setGameData(data)
        setIsOwner(
          data.players.some((player: Player) => player.isOwner && player.name === localStorage.getItem("playerName")),
        )
      })

      eventSource.onerror = (error) => {
        console.error("SSE error:", error)
        eventSource.close()
        setTimeout(connectSSE, 5000) // Attempt to reconnect after 5 seconds
      }

      eventSourceRef.current = eventSource
    }

    connectSSE()

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close()
      }
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

  const handleStartGame = async () => {
    try {
      const response = await fetch("/api/game/start", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ tableId }),
      })

      if (!response.ok) {
        throw new Error("Failed to start the game")
      }

      toast({
        title: "Game Started",
        description: "The game has been started successfully!",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to start the game. Please try again.",
        variant: "destructive",
      })
    }
  }

  if (!gameData) {
    return <div>Loading...</div>
  }

  const canStartGame = isOwner && gameData.players.length >= 2 && !gameData.gameStarted

  return (
    <div className="container mx-auto px-4 py-8">
      <GameTable tableId={gameData.tableId} players={gameData.players} />
      <div className="mt-4 flex justify-center space-x-4">
        <Button onClick={handleShare}>Share Game Link</Button>
        {canStartGame && <Button onClick={handleStartGame}>Start Game</Button>}
      </div>
    </div>
  )
}

