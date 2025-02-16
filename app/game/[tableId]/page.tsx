"use client"

import { useEffect, useState, useRef } from "react"
import { useParams } from "next/navigation"
import GameTable from "../../../components/GameTable"
import { useToast } from "@/hooks/use-toast"
import type { GameData, Player, ScoreTableRow } from "../../../types/game"

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
        updateGameState(data)
      }

      eventSource.addEventListener("init", (event) => {
        const data = JSON.parse((event as MessageEvent).data)
        updateGameState(data)
      })

      eventSource.addEventListener("update", (event) => {
        const data = JSON.parse((event as MessageEvent).data)
        updateGameState(data)
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

  const updateGameState = (data: GameData) => {
    if (!data.scoreTable) {
      data.scoreTable = initializeScoreTable(data.players)
    }
    setGameData(data)
    const currentPlayerName = localStorage.getItem("playerName")
    const isCurrentPlayerOwner = data.players.some(
      (player: Player) => player.isOwner && player.name === currentPlayerName,
    )
    setIsOwner(isCurrentPlayerOwner)
    console.log("Game state updated:", {
      gameData: data,
      currentPlayerName,
      isCurrentPlayerOwner,
      players: data.players,
    })
  }

  const initializeScoreTable = (players: Player[]): ScoreTableRow[] => {
    return Array.from({ length: 18 }, (_, index) => {
      const roundId = index + 1
      let roundName
      if (roundId <= 6) {
        roundName = roundId.toString()
      } else if (roundId <= 12) {
        roundName = "B"
      } else {
        roundName = (19 - roundId).toString()
      }
      const scores = players.reduce(
        (acc, player) => {
          acc[player.name] = null
          return acc
        },
        {} as { [playerName: string]: number | null },
      )
      return { roundId, roundName, scores }
    })
  }

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

  return (
    <div className="container mx-auto px-4 py-8">
      <GameTable
        tableId={gameData.tableId}
        players={gameData.players}
        isOwner={isOwner}
        gameStarted={gameData.gameStarted}
        onShare={handleShare}
        onStartGame={handleStartGame}
      />
    </div>
  )
}

