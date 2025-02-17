"use client"

import { useEffect, useState, useRef } from "react"
import { useParams } from "next/navigation"
import GameTable from "../../../components/GameTable"
import { useToast } from "@/hooks/use-toast"
import type { GameData, Player, Card } from "../../../types/game"

export default function Game() {
  const params = useParams()
  const tableId = params?.tableId as string
  const [gameData, setGameData] = useState<GameData | null>(null)
  const [isOwner, setIsOwner] = useState(false)
  const [currentPlayerName, setCurrentPlayerName] = useState<string | null>(null)
  const { toast } = useToast()
  const eventSourceRef = useRef<EventSource | null>(null)

  useEffect(() => {
    const storedPlayerName = localStorage.getItem("playerName")
    console.log("Initial player name from localStorage:", storedPlayerName)
    setCurrentPlayerName(storedPlayerName)

    if (!tableId) {
      toast({
        title: "Error",
        description: "No table ID provided",
        variant: "destructive",
      })
      return
    }

    const connectSSE = () => {
      const eventSource = new EventSource(`/api/sse?tableId=${tableId}`)

      eventSource.onmessage = (event) => {
        const data = JSON.parse(event.data)
        console.log("Received SSE message:", data)
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
    setGameData(data)
    const storedPlayerName = localStorage.getItem("playerName")
    console.log("Updating game state. Current player name:", storedPlayerName)
    console.log("Players:", data.players)
    const isCurrentPlayerOwner = data.players.some(
      (player: Player) => player.isOwner && player.name === storedPlayerName,
    )
    console.log("Is current player owner:", isCurrentPlayerOwner)
    setIsOwner(isCurrentPlayerOwner)
    setCurrentPlayerName(storedPlayerName)
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

      const data = await response.json()
      updateGameState(data.gameData)

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

  const handlePlayCard = async (card: Card) => {
    if (!gameData) return

    const currentPlayerIndex = gameData.players.findIndex((p) => p.name === currentPlayerName)

    if (currentPlayerIndex !== gameData.currentTurn) {
      toast({
        title: "Not your turn",
        description: "Please wait for your turn to play a card.",
        variant: "destructive",
      })
      return
    }

    try {
      const response = await fetch("/api/game/play-card", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ tableId, card }),
      })

      if (!response.ok) {
        throw new Error("Failed to play the card")
      }

      const data = await response.json()
      updateGameState(data.gameData)
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to play the card. Please try again.",
        variant: "destructive",
      })
    }
  }

  if (!gameData) {
    return <div>Loading...</div>
  }

  console.log("Rendering GameTable with props:", {
    tableId: gameData.tableId,
    players: gameData.players,
    isOwner,
    gameStarted: gameData.gameStarted,
    currentRound: gameData.currentRound,
    currentPlay: gameData.currentPlay,
    currentTurn: gameData.currentTurn,
  })

  return (
    <div className="container mx-auto px-4 py-8">
      <GameTable
        tableId={gameData.tableId}
        players={gameData.players}
        isOwner={isOwner}
        gameStarted={gameData.gameStarted}
        currentRound={gameData.currentRound}
        currentPlay={gameData.currentPlay}
        currentTurn={gameData.currentTurn}
        cardsOnTable={gameData.cardsOnTable}
        onShare={handleShare}
        onStartGame={handleStartGame}
        onPlayCard={handlePlayCard}
        gameData={gameData}
      />
    </div>
  )
}

