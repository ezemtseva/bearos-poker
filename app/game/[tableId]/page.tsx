"use client"

import { useEffect, useState, useRef } from "react"
import { useParams } from "next/navigation"
import GameTable from "../../../components/GameTable"
import { useToast } from "@/hooks/use-toast"
import type { GameData, Card, GameLength } from "../../../types/game"
import { useSound } from "@/hooks/use-sound"

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
  // Add refs to track the last played card and bets to avoid playing sounds multiple times
  const lastSpecialCardRef = useRef<{ playerName: string; pokerOption: string } | null>(null)
  const lastCardsOnTableRef = useRef<Card[]>([])
  const lastPlayerBetsRef = useRef<Map<string, number | null>>(new Map())
  // Add a ref to track the game's started state
  const gameStartedRef = useRef<boolean>(false)
  // Add a ref to track if the current player played the last card in a trick
  const playedLastCardRef = useRef<boolean>(false)
  // Add a ref to track if we've played the game start sound
  const gameStartSoundPlayedRef = useRef<boolean>(false)

  const { playSound } = useSound()

  // Remove the debug sound test

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

        // Check if game is over and play game over sound
        if (data.gameData.gameOver && !gameData?.gameOver) {
          playSound("gameOver")
        }

        updateGameState(data.gameData)
      }
    } catch (error) {
      console.error("Error fetching latest game state:", error)
    }
  }

  // Add sound to the updateGameState function
  const updateGameState = (data: GameData) => {
    console.log("Updating game state. Received data:", data)

    // Check if the game has just started (for all players to hear game-start.mp3)
    // Only play the sound if:
    // 1. The game is now started
    // 2. It wasn't started before
    // 3. We haven't already played the sound
    if (data.gameStarted && (!gameData || !gameData.gameStarted) && !gameStartSoundPlayedRef.current) {
      console.log("Playing game start sound")
      playSound("gameStart")
      // Mark that we've played the sound to avoid duplicates
      gameStartSoundPlayedRef.current = true
    } else if (!data.gameStarted) {
      // Reset the ref if the game is not started (e.g., after a game ends)
      gameStartSoundPlayedRef.current = false
      gameStartedRef.current = false
    }

    // Check if new cards were dealt by comparing the current player's hand
    const storedPlayerName = localStorage.getItem("playerName")
    const previousPlayer = gameData?.players.find((p) => p.name === storedPlayerName)
    const currentPlayer = data.players.find((p) => p.name === storedPlayerName)

    if (previousPlayer && currentPlayer && previousPlayer.hand && currentPlayer.hand) {
      if (currentPlayer.hand.length > previousPlayer.hand.length) {
        // New cards were dealt
        for (let i = 0; i < currentPlayer.hand.length - previousPlayer.hand.length; i++) {
          // Stagger the deal sounds slightly
          setTimeout(() => {
            playSound("dealCard")
          }, i * 200)
        }
      }
    }

    // Check if a new card has been played (for all players to hear play-card.mp3)
    if (data.cardsOnTable && data.cardsOnTable.length > 0) {
      // Check if a new card has been added since last update
      if (data.cardsOnTable.length > lastCardsOnTableRef.current.length) {
        // Only play the sound if it's not a new round/play (which would clear the table)
        if (!(gameData && (data.currentRound > gameData.currentRound || data.currentPlay > gameData.currentPlay))) {
          // Play the card sound for everyone
          playSound("playCard")

          // Check if this is the last card in the trick (all players have played)
          if (data.cardsOnTable.length === data.players.length) {
            // Check if the current player played the last card
            const lastCard = data.cardsOnTable[data.cardsOnTable.length - 1]
            if (lastCard && lastCard.playerName === storedPlayerName) {
              // Mark that the current player played the last card
              playedLastCardRef.current = true
            }
          }
        }
      }
      // Update the ref with current cards on table
      lastCardsOnTableRef.current = [...data.cardsOnTable]
    } else {
      // Table was cleared, reset our reference
      lastCardsOnTableRef.current = []
    }

    // Check if any player has placed a new bet (for all players to hear place-bet.mp3)
    if (data.players && data.players.length > 0) {
      let newBetPlaced = false

      data.players.forEach((player) => {
        const previousBet = lastPlayerBetsRef.current.get(player.name)

        // If this is a new bet (was null before, now has a value)
        if (previousBet === null && player.bet !== null) {
          newBetPlaced = true
        }

        // Update our tracking of this player's bet
        lastPlayerBetsRef.current.set(player.name, player.bet)
      })

      if (newBetPlaced) {
        // Play the bet sound for everyone
        playSound("placeBet")
      }
    }

    // Check if the last played card is the 7 of spades with a specific option
    if (
      data.lastPlayedCard &&
      data.lastPlayedCard.suit === "spades" &&
      data.lastPlayedCard.value === 7 &&
      data.lastPlayedCard.pokerOption &&
      data.lastPlayedCard.playerName
    ) {
      // Create a unique identifier for this special card play
      const specialCardId = `${data.lastPlayedCard.playerName}-${data.lastPlayedCard.pokerOption}`

      // Check if this is a new special card play we haven't played a sound for yet
      if (
        !lastSpecialCardRef.current ||
        `${lastSpecialCardRef.current.playerName}-${lastSpecialCardRef.current.pokerOption}` !== specialCardId
      ) {
        // Update the ref to avoid playing the sound multiple times
        lastSpecialCardRef.current = {
          playerName: data.lastPlayedCard.playerName,
          pokerOption: data.lastPlayedCard.pokerOption,
        }

        // Play the appropriate sound based on the option
        switch (data.lastPlayedCard.pokerOption) {
          case "Trumps":
            playSound("specialCardTrumps")
            break
          case "Poker":
            playSound("specialCardPoker")
            break
          case "Simple":
            playSound("specialCardSimple")
            break
        }
      }
    }

    setGameData((prevData) => {
      // If it's a new round, ALWAYS clear the table and play sound
      if (prevData && data.currentRound > prevData.currentRound) {
        console.log("NEW ROUND DETECTED - Clearing table")
        playSound("roundEnd")
        return {
          ...data,
          cardsOnTable: [], // Force empty array for new rounds
          lastPlayedCard: null, // Also clear the last played card
        }
      }

      // If it's a new play within the same round, also clear the table
      if (prevData && data.currentPlay > prevData.currentPlay) {
        console.log("NEW PLAY DETECTED - Clearing table")

        // Only play the win sound if the current player played the last card in the previous trick
        if (playedLastCardRef.current) {
          playSound("winTrick")
          // Reset the flag
          playedLastCardRef.current = false
        }

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

    console.log("Current player name:", storedPlayerName)
    console.log("Players:", data.players)
    const isCurrentPlayerOwner = currentPlayer?.isOwner || false
    setIsOwner(isCurrentPlayerOwner)
    setCurrentPlayerName(storedPlayerName)
  }

  // Initialize the bet tracking when players change
  useEffect(() => {
    if (gameData && gameData.players) {
      // Initialize the map with all players' current bets
      const betsMap = new Map<string, number | null>()
      gameData.players.forEach((player) => {
        betsMap.set(player.name, player.bet)
      })
      lastPlayerBetsRef.current = betsMap
    }
  }, [gameData])

  const handleShare = () => {
    const shareUrl = `${window.location.origin}/join-game?tableId=${tableId}`
    navigator.clipboard.writeText(shareUrl)
    toast({
      title: "Link Copied!",
      description: "Share this link with your friends to invite them to the game.",
    })
  }

  // Update the handleStartGame function to play the sound only for the owner
  const handleStartGame = async () => {
    try {
      // Play the game start sound for the owner immediately
      playSound("gameStart")
      // Mark that we've played the sound to avoid duplicates when the state updates
      gameStartSoundPlayedRef.current = true

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
      playSound("error")
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

  const handleConfigureGame = async (gameLength: GameLength, hasGoldenRound: boolean) => {
    try {
      const response = await fetch("/api/game/configure", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ tableId, gameLength, hasGoldenRound }),
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
        description: `Game type set to ${gameLength}${hasGoldenRound ? " with Golden Round" : ""}.`,
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

