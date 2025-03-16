"use client"

import { useEffect, useState, useRef } from "react"
import { useParams } from "next/navigation"
import GameTable from "../../../components/GameTable"
import { useToast } from "@/hooks/use-toast"
import type { GameData, Card } from "../../../types/game"

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
      if (eventSourceRef.current) {
        eventSourceRef.current.close()
      }

      console.log(`Connecting to SSE for table: ${tableId}`)
      const eventSource = new EventSource(`/api/sse?tableId=${tableId}&clientId=${Date.now()}`)

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          console.log("Received SSE message:", data)
          updateGameState(data)
        } catch (error) {
          console.error("Error parsing SSE message:", error)
        }
      }

      eventSource.addEventListener("init", (event) => {
        try {
          const data = JSON.parse((event as MessageEvent).data)
          console.log("Received SSE init event:", data)
          updateGameState(data)
        } catch (error) {
          console.error("Error parsing SSE init event:", error)
        }
      })

      eventSource.addEventListener("update", (event) => {
        try {
          const data = JSON.parse((event as MessageEvent).data)
          console.log("Received SSE update event:", data)
          updateGameState(data)
        } catch (error) {
          console.error("Error parsing SSE update event:", error)
        }
      })

      eventSource.addEventListener("open", () => {
        console.log("SSE connection opened for table:", tableId)
      })

      eventSource.onerror = (error) => {
        console.error("SSE error:", error)
        eventSource.close()

        // Add a small random delay before reconnecting to prevent all clients
        // from trying to reconnect at the exact same time
        const reconnectDelay = 2000 + Math.random() * 1000
        console.log(`Will attempt to reconnect SSE in ${reconnectDelay}ms`)
        setTimeout(connectSSE, reconnectDelay)
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

  useEffect(() => {
    // Back to original refresh interval
    const refreshInterval = setInterval(async () => {
      if (!eventSourceRef.current || eventSourceRef.current.readyState !== 1) {
        try {
          const response = await fetch(`/api/game/state?tableId=${tableId}`)
          if (response.ok) {
            const data = await response.json()
            updateGameState(data.gameData)
          }
        } catch (error) {
          console.error("Error refreshing game state:", error)
        }
      }
    }, 5000) // Back to original 5 seconds

    return () => clearInterval(refreshInterval)
  }, [tableId])

  const updateGameState = (data: GameData) => {
    console.log("Updating game state. Received data:", data)

    setGameData((prevData) => {
      // If it's a new round, ALWAYS clear the table
      if (prevData && data.currentRound > prevData.currentRound) {
        console.log("NEW ROUND DETECTED - Clearing table")
        return {
          ...data,
          cardsOnTable: [], // Force empty array for new rounds
          lastPlayedCard: null, // Also clear the last played card
        }
      }

      // If it's a new play within the same round, also clear the table
      if (prevData && data.currentPlay > prevData.currentPlay) {
        console.log("NEW PLAY DETECTED - Clearing table")
        return {
          ...data,
          cardsOnTable: [], // Force empty array for new plays
          lastPlayedCard: null, // Also clear the last played card
        }
      }

      // If all cards are played, keep the server's state
      if (data.allCardsPlayed) {
        console.log("ALL CARDS PLAYED - Keeping server state with cards:", data.cardsOnTable)
        return data
      }

      // For normal gameplay, use the server's state
      return data
    })

    const storedPlayerName = localStorage.getItem("playerName")
    console.log("Current player name:", storedPlayerName)
    console.log("Players:", data.players)
    const currentPlayer = data.players.find((player) => player.name === storedPlayerName)
    const isCurrentPlayerOwner = currentPlayer?.isOwner || false
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
      console.log("Game started. Received data:", data)
      updateGameState(data.gameData)

      toast({
        title: "Game Started",
        description: "The game has been started successfully!",
      })
    } catch (error) {
      console.error("Error starting game:", error)
      toast({
        title: "Error",
        description: "Failed to start the game. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handlePlayCard = async (card: Card) => {
    if (!gameData || !currentPlayerName) return

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
        body: JSON.stringify({ tableId, playerName: currentPlayerName, card }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to play the card")
      }

      const data = await response.json()
      console.log("Card played. Received data:", data)
      updateGameState(data.gameData)

      if (data.message === "Game over") {
        toast({
          title: "Game Over",
          description: "The game has ended. Check the final scores!",
        })
      } else {
        toast({
          title: "Card Played",
          description: "Your card has been played successfully.",
        })
      }
    } catch (error) {
      console.error("Error playing card:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to play the card. Please try again.",
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
        currentRound={gameData.currentRound}
        currentPlay={gameData.currentPlay}
        currentTurn={gameData.currentTurn}
        cardsOnTable={gameData.cardsOnTable}
        lastPlayedCard={gameData.lastPlayedCard}
        onShare={handleShare}
        onStartGame={handleStartGame}
        onPlayCard={handlePlayCard}
        gameData={gameData}
      />
    </div>
  )
}

