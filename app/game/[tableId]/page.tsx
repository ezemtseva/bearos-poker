"use client"

import { useEffect, useState, useRef } from "react"
import { useParams } from "next/navigation"
import GameTable from "../../../components/GameTable"
import { useToast } from "@/hooks/use-toast"
import type { GameData, Card, GameLength } from "../../../types/game"

export default function Game() {
  const params = useParams()
  const tableId = params?.tableId as string
  const [gameData, setGameData] = useState<GameData | null>(null)
  const [isOwner, setIsOwner] = useState(false)
  const [currentPlayerName, setCurrentPlayerName] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const { toast } = useToast()
  const clientIdRef = useRef<string>(`client-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`)
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const isPollingRef = useRef<boolean>(false)
  const lastActionRef = useRef<number>(0)

  // Function to fetch game state
  const fetchGameState = async () => {
    if (!tableId || isPollingRef.current) return

    isPollingRef.current = true

    try {
      const response = await fetch(`/api/game/state?tableId=${tableId}`)
      if (response.ok) {
        const data = await response.json()
        updateGameState(data.gameData)
        setIsLoading(false)
      } else {
        console.error("Error response from server:", await response.text())
      }
    } catch (error) {
      console.error("Error fetching game state:", error)
    } finally {
      isPollingRef.current = false
    }
  }

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

    // Initial fetch
    fetchGameState()

    // Set up polling
    pollingIntervalRef.current = setInterval(fetchGameState, 2000)

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current)
      }
    }
  }, [tableId, toast])

  // Optimistic update after action
  const fetchLatestState = async () => {
    try {
      // Mark that we just performed an action
      lastActionRef.current = Date.now()

      // Wait a short time to allow the server to process the action
      await new Promise((resolve) => setTimeout(resolve, 500))

      const response = await fetch(`/api/game/state?tableId=${tableId}`)
      if (response.ok) {
        const data = await response.json()
        updateGameState(data.gameData)
      }
    } catch (error) {
      console.error("Error fetching latest game state:", error)
    }
  }

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

      // Fetch latest state after a short delay
      fetchLatestState()

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

      // Fetch latest state after a short delay
      fetchLatestState()

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

  const handlePlaceBet = async (betAmount: number) => {
    if (!gameData || !currentPlayerName) return

    try {
      console.log(`Placing bet: ${betAmount} for player ${currentPlayerName}`)
      const response = await fetch("/api/game/place-bet", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ tableId, playerName: currentPlayerName, bet: betAmount }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to place the bet")
      }

      const data = await response.json()
      console.log("Bet placed. Received data:", data)
      updateGameState(data.gameData)

      // Fetch latest state after a short delay
      fetchLatestState()

      toast({
        title: "Bet Placed",
        description: `Your bet of ${betAmount} has been placed successfully.`,
      })
    } catch (error) {
      console.error("Error placing bet:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to place the bet. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleConfigureGame = async (gameLength: GameLength) => {
    try {
      const response = await fetch("/api/game/configure", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ tableId, gameLength }),
      })

      if (!response.ok) {
        throw new Error("Failed to configure the game")
      }

      const data = await response.json()
      console.log("Game configured. Received data:", data)
      updateGameState(data.gameData)

      // Fetch latest state after a short delay
      fetchLatestState()

      toast({
        title: "Game Configured",
        description: `Game length set to ${gameLength}.`,
      })
    } catch (error) {
      console.error("Error configuring game:", error)
      toast({
        title: "Error",
        description: "Failed to configure the game. Please try again.",
        variant: "destructive",
      })
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[50vh]">
        <div className="text-white text-xl">Loading game data...</div>
      </div>
    )
  }

  const safeGameData = gameData || {
    tableId: "",
    players: [],
    gameStarted: false,
    currentRound: 0,
    currentPlay: 0,
    currentTurn: 0,
    cardsOnTable: [],
    deck: [],
    scoreTable: [],
    allCardsPlayedTimestamp: null,
    playEndTimestamp: null,
    lastPlayedCard: null,
    allCardsPlayed: false,
    highestCard: null,
    roundStartPlayerIndex: 0,
    allBetsPlaced: false,
    gameOver: false,
    currentBettingTurn: undefined,
    betsPlacedTimestamp: null,
    gameLength: "basic", // Changed from "short" to "basic"
  }

  if (!gameData) {
    return (
      <div className="flex justify-center items-center min-h-[50vh]">
        <div className="text-white text-xl">Error loading game data. Please refresh the page or try again later.</div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <GameTable
        tableId={safeGameData.tableId}
        players={safeGameData.players}
        isOwner={isOwner}
        gameStarted={safeGameData.gameStarted}
        currentRound={safeGameData.currentRound}
        currentPlay={safeGameData.currentPlay}
        currentTurn={safeGameData.currentTurn}
        cardsOnTable={safeGameData.cardsOnTable}
        lastPlayedCard={safeGameData.lastPlayedCard}
        onShare={handleShare}
        onStartGame={handleStartGame}
        onPlayCard={handlePlayCard}
        onPlaceBet={handlePlaceBet}
        onConfigureGame={handleConfigureGame}
        gameData={safeGameData}
      />
    </div>
  )
}

