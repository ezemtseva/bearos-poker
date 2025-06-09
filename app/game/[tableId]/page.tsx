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
  const { playSound } = useSound()

  const clientIdRef = useRef<string>(`client-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`)
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const isPollingRef = useRef<boolean>(false)
  const lastActionRef = useRef<number>(0)
  const lastSpecialCardRef = useRef<{ playerName: string; pokerOption: string } | null>(null)
  const lastCardsOnTableRef = useRef<Card[]>([])
  const lastPlayerBetsRef = useRef<Map<string, number | null>>(new Map())
  const gameStartedRef = useRef<boolean>(false)
  const playedLastCardRef = useRef<boolean>(false)
  const gameStartSoundPlayedRef = useRef<boolean>(false)
  const clearTableTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const tableJustClearedRef = useRef<boolean>(false)

  const fetchGameStateUnified = async (options?: {
    delayMs?: number
    markAction?: boolean
    suppressLoading?: boolean
    allowWhilePolling?: boolean
  }) => {
    const {
      delayMs = 0,
      markAction = false,
      suppressLoading = false,
      allowWhilePolling = false,
    } = options || {}

    if (!tableId || (isPollingRef.current && !allowWhilePolling)) return

    if (markAction) lastActionRef.current = Date.now()
    if (!allowWhilePolling) isPollingRef.current = true

    try {
      if (delayMs) await new Promise((res) => setTimeout(res, delayMs))
      const res = await fetch(`/api/game/state?tableId=${tableId}`)
      if (!res.ok) throw new Error(await res.text())
      const data = await res.json()
      if (data.gameData.gameOver && !gameData?.gameOver) playSound("gameOver")
      updateGameState(data.gameData)
      if (!suppressLoading) setIsLoading(false)
    } catch (e) {
      console.error("Error fetching game state:", e)
    } finally {
      if (!allowWhilePolling) isPollingRef.current = false
    }
  }

  useEffect(() => {
    const storedPlayerName = localStorage.getItem("playerName")
    setCurrentPlayerName(storedPlayerName)

    if (!tableId) {
      toast({ title: "Error", description: "No table ID provided", variant: "destructive" })
      return
    }

    fetchGameStateUnified()
    pollingIntervalRef.current = setInterval(() => fetchGameStateUnified(), 3000)

    return () => {
    if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current)
    if (clearTableTimeoutRef.current) clearTimeout(clearTableTimeoutRef.current)
    }
  }, [tableId, toast])

  const updateGameState = (data: GameData) => {
    let deferClearFromServer = tableJustClearedRef.current;
    console.log("Updating game state. Received data:", data)

    if (data.gameStarted && (!gameData || !gameData.gameStarted) && !gameStartSoundPlayedRef.current) {
      playSound("gameStart")
      gameStartSoundPlayedRef.current = true
    } else if (!data.gameStarted) {
      gameStartSoundPlayedRef.current = false
      gameStartedRef.current = false
    }

    const storedPlayerName = localStorage.getItem("playerName")
    const previousPlayer = gameData?.players.find((p) => p.name === storedPlayerName)
    const currentPlayer = data.players.find((p) => p.name === storedPlayerName)

    if (previousPlayer && currentPlayer && previousPlayer.hand && currentPlayer.hand) {
      if (currentPlayer.hand.length > previousPlayer.hand.length) {
        for (let i = 0; i < currentPlayer.hand.length - previousPlayer.hand.length; i++) {
          setTimeout(() => {
            playSound("dealCard")
          }, i * 200)
        }
      }
    }

    if (data.cardsOnTable && data.cardsOnTable.length > 0) {
      if (data.cardsOnTable.length > lastCardsOnTableRef.current.length) {
        if (!(gameData && (data.currentRound > gameData.currentRound || data.currentPlay > gameData.currentPlay))) {
          playSound("playCard")

          if (data.cardsOnTable.length === data.players.length) {
            const lastCard = data.cardsOnTable[data.cardsOnTable.length - 1]
            if (lastCard && lastCard.playerName === storedPlayerName) {
              playedLastCardRef.current = true
            }
          }
        }
      }
      lastCardsOnTableRef.current = [...data.cardsOnTable]

      // NEW: Локальная очистка стола после полной раздачи
      if (
        data.cardsOnTable.length === data.players.length &&
        !tableJustClearedRef.current
      ) {
        tableJustClearedRef.current = true

        clearTableTimeoutRef.current && clearTimeout(clearTableTimeoutRef.current)
        clearTableTimeoutRef.current = setTimeout(() => {
          deferClearFromServer = false
          setGameData((prevData) => {
            if (!prevData) return prevData
            return {
              ...prevData,
              cardsOnTable: [],
              lastPlayedCard: null,
            }
          })
          tableJustClearedRef.current = false
        }, 2000)
      }
    } else {
      lastCardsOnTableRef.current = []
    }

    if (data.players && data.players.length > 0) {
      let newBetPlaced = false

      data.players.forEach((player) => {
        const previousBet = lastPlayerBetsRef.current.get(player.name)
        if (previousBet === null && player.bet !== null) {
          newBetPlaced = true
        }
        lastPlayerBetsRef.current.set(player.name, player.bet)
      })

      if (newBetPlaced) {
        playSound("placeBet")
      }
    }

    if (
      data.lastPlayedCard &&
      data.lastPlayedCard.suit === "spades" &&
      data.lastPlayedCard.value === 7 &&
      data.lastPlayedCard.pokerOption &&
      data.lastPlayedCard.playerName
    ) {
      const specialCardId = `${data.lastPlayedCard.playerName}-${data.lastPlayedCard.pokerOption}`

      if (
        !lastSpecialCardRef.current ||
        `${lastSpecialCardRef.current.playerName}-${lastSpecialCardRef.current.pokerOption}` !== specialCardId
      ) {
        lastSpecialCardRef.current = {
          playerName: data.lastPlayedCard.playerName,
          pokerOption: data.lastPlayedCard.pokerOption,
        }

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
      if (!deferClearFromServer && prevData && data.currentRound > prevData.currentRound) {
        playSound("roundEnd")
        return {
          ...data,
          cardsOnTable: [],
          lastPlayedCard: null,
        }
      }

      if (!deferClearFromServer && prevData && data.currentPlay > prevData.currentPlay) {
        playedLastCardRef.current = false
        return {
          ...data,
          cardsOnTable: [],
          lastPlayedCard: null,
        }
      }

      if (data.allCardsPlayed) {
        return data
      }

      return data
    })

    const isCurrentPlayerOwner = currentPlayer?.isOwner || false
    setIsOwner(isCurrentPlayerOwner)
    setCurrentPlayerName(storedPlayerName)
  }

  const handleShare = () => {
    const shareUrl = `${window.location.origin}/join-game?tableId=${tableId}`
    navigator.clipboard.writeText(shareUrl)
    playSound("copy")
    toast({
      title: "Link Copied!",
      description: "Share this link with your friends to invite them to the game."
    })
  }

  const handleStartGame = async () => {
    try {
      playSound("gameStart")
      gameStartSoundPlayedRef.current = true

      const response = await fetch("/api/game/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tableId })
      })

      if (!response.ok) throw new Error("Failed to start the game")
      const data = await response.json()
      updateGameState(data.gameData)
      await fetchGameStateUnified({ delayMs: 500, markAction: true, suppressLoading: true, allowWhilePolling: true })

      toast({ title: "Game Started", description: "The game has been started successfully!" })
    } catch (error) {
      playSound("error")
      console.error("Error starting game:", error)
      toast({ title: "Error", description: "Failed to start the game. Please try again.", variant: "destructive" })
    }
  }

  const handlePlayCard = async (card: Card) => {
    if (!gameData || !currentPlayerName) return

    const currentPlayerIndex = gameData.players.findIndex((p) => p.name === currentPlayerName)
    if (currentPlayerIndex !== gameData.currentTurn) {
      toast({
        title: "Not your turn",
        description: "Please wait for your turn to play a card.",
        variant: "destructive"
      })
      return
    }

    try {
      const response = await fetch("/api/game/play-card", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tableId, playerName: currentPlayerName, card })
      })

      if (!response.ok) throw new Error("Failed to play the card")
      const data = await response.json()
      updateGameState(data.gameData)
      await fetchGameStateUnified({ delayMs: 500, markAction: true, suppressLoading: true, allowWhilePolling: true })

      toast({ title: "Card Played", description: "Your card has been played successfully." })
    } catch (error) {
      console.error("Error playing card:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to play the card. Please try again.",
        variant: "destructive"
      })
    }
  }

  const handlePlaceBet = async (betAmount: number) => {
    if (!gameData || !currentPlayerName) return

    try {
      const response = await fetch("/api/game/place-bet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tableId, playerName: currentPlayerName, bet: betAmount })
      })

      if (!response.ok) throw new Error("Failed to place the bet")
      const data = await response.json()
      updateGameState(data.gameData)
      await fetchGameStateUnified({ delayMs: 500, markAction: true, suppressLoading: true, allowWhilePolling: true })

      toast({ title: "Bet Placed", description: `Your bet of ${betAmount} has been placed successfully.` })
    } catch (error) {
      console.error("Error placing bet:", error)
      toast({ title: "Error", description: "Failed to place the bet. Please try again.", variant: "destructive" })
    }
  }

  const handleConfigureGame = async (gameLength: GameLength, hasGoldenRound: boolean) => {
    try {
      const response = await fetch("/api/game/configure", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tableId, gameLength, hasGoldenRound })
      })

      if (!response.ok) throw new Error("Failed to configure the game")
      const data = await response.json()
      updateGameState(data.gameData)
      await fetchGameStateUnified({ delayMs: 500, markAction: true, suppressLoading: true, allowWhilePolling: true })

      toast({
        title: "Game Configured",
        description: `Game type set to ${gameLength}${hasGoldenRound ? " with Golden Round" : ""}.`
      })
    } catch (error) {
      console.error("Error configuring game:", error)
      toast({ title: "Error", description: "Failed to configure the game. Please try again.", variant: "destructive" })
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
    gameLength: "basic"
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
