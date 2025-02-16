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
  const socketRef = useRef<WebSocket | null>(null)

  useEffect(() => {
    if (!tableId) {
      toast({
        title: "Error",
        description: "No table ID provided",
        variant: "destructive",
      })
      return
    }

    const connectWebSocket = () => {
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:"
      const socket = new WebSocket(`${protocol}//${window.location.host}/api/socket?tableId=${tableId}`)

      socket.onopen = () => {
        console.log("WebSocket connection opened")
      }

      socket.onmessage = (event) => {
        const data = JSON.parse(event.data)
        console.log("Received message:", data)

        if (data.type === "game-update" || data.type === "game-started") {
          setGameData(data.gameData)
          setIsOwner(
            data.gameData.players.some(
              (player: Player) => player.isOwner && player.name === localStorage.getItem("playerName"),
            ),
          )
        }
      }

      socket.onerror = (error) => {
        console.error("WebSocket error:", error)
        toast({
          title: "Error",
          description: "Failed to connect to game server",
          variant: "destructive",
        })
      }

      socket.onclose = () => {
        console.log("WebSocket connection closed")
        setTimeout(connectWebSocket, 5000) // Attempt to reconnect after 5 seconds
      }

      socketRef.current = socket
    }

    connectWebSocket()

    return () => {
      if (socketRef.current) {
        socketRef.current.close()
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

