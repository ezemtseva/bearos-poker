"use client"

import React from "react"
import { TableHeader } from "@/components/ui/table"
import { useState, useEffect, useRef } from "react"
import type { Player, Card, GameData, ScoreTableRow, PlayerScore } from "../types/game"
import { Table, TableBody, TableCell, TableHead, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import PlayingCard from "./PlayingCard"
import { useToast } from "@/hooks/use-toast"
import GameResultsDialog from "./GameResultsDialog"
import PokerCardDialog from "./PokerCardDialog"
// Add this at the top of the file, after the imports
import { useMemo } from "react"
// Add the import for ConfigureGameDialog near the top with other imports
import ConfigureGameDialog, { type GameLength } from "./ConfigureGameDialog"
// Add this import at the top with other imports
import { useSound } from "@/hooks/use-sound"
import { Settings, ChevronLeft, ChevronRight } from "lucide-react"

interface GameTableProps {
  tableId: string
  players: Player[]
  isOwner: boolean
  gameStarted: boolean
  currentRound: number
  currentPlay: number
  currentTurn: number
  cardsOnTable: Card[]
  onShare: () => void
  onStartGame: () => void
  onPlayCard: (card: Card) => void
  onPlaceBet: (bet: number) => void
  onConfigureGame: (gameLength: GameLength, hasGoldenRound: boolean) => void
  gameData: GameData
  lastPlayedCard: Card | null
}

export default function GameTable({
  tableId,
  players,
  isOwner,
  gameStarted,
  currentRound,
  currentPlay,
  currentTurn,
  cardsOnTable,
  onShare,
  onStartGame,
  onPlayCard,
  onPlaceBet,
  gameData,
  lastPlayedCard,
  onConfigureGame,
}: GameTableProps) {
  // Add a new state variable for the dialog
  const [showConfigureDialog, setShowConfigureDialog] = useState(false)
  // Add a new state variable near the top of the component with the other state variables
  const [isPlayingCard, setIsPlayingCard] = useState(false)
  const [displayedCards, setDisplayedCards] = useState<Card[]>(cardsOnTable)
  const [isClearing, setIsClearing] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [betAmount, setBetAmount] = useState<number | null>(0)
  const [showResultsDialog, setShowResultsDialog] = useState(false)
  const [showPokerCardDialog, setShowPokerCardDialog] = useState(false)
  const [pokerCardOption, setPokerCardOption] = useState<"Trumps" | "Poker" | "Simple" | null>(null)
  const [lastKnownBettingPlayer, setLastKnownBettingPlayer] = useState<string>("Waiting for players...")
  const [stableBettingUI, setStableBettingUI] = useState<boolean>(false)
  const [scoreTableExpanded, setScoreTableExpanded] = useState(() => {
    try { const v = localStorage.getItem("scoreTableExpanded"); return v !== null ? v === "true" : true } catch { return true }
  })
  const [showScoreSettings, setShowScoreSettings] = useState(false)
  const [scoreTablePlayerCount, setScoreTablePlayerCount] = useState(() => {
    try { const v = localStorage.getItem("scoreTablePlayerCount"); return v !== null ? Number(v) : (players.length || 1) } catch { return players.length || 1 }
  })
  const [scoreTablePosition, setScoreTablePosition] = useState<"left" | "right" | "bottom">(() => {
    try { const v = localStorage.getItem("scoreTablePosition"); return (v as "left" | "right" | "bottom") || "left" } catch { return "left" }
  })
  const { toast } = useToast()
  // Add this inside the GameTable component, near the top with other hooks
  const { playSound } = useSound()

  // Persist score table settings to localStorage
  useEffect(() => { try { localStorage.setItem("scoreTableExpanded", String(scoreTableExpanded)) } catch {} }, [scoreTableExpanded])
  useEffect(() => { try { localStorage.setItem("scoreTablePlayerCount", String(scoreTablePlayerCount)) } catch {} }, [scoreTablePlayerCount])
  useEffect(() => { try { localStorage.setItem("scoreTablePosition", scoreTablePosition) } catch {} }, [scoreTablePosition])

  // Refs to track stable state across renders
  const currentRoundRef = useRef<number>(currentRound)
  const bettingUITimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const lastBettingTurnRef = useRef<number | null>(null)

  // Safely handle potentially undefined gameData
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
    gameLength: "short",
    hasGoldenRound: false,
  }

  // Get current player information early
  const currentPlayerName = localStorage.getItem("playerName")
  const currentPlayer = players.find((p) => p.name === currentPlayerName)
  const canStartGame = isOwner && players.length >= 2 && !gameStarted
  const isCurrentPlayerTurn =
    currentPlayer &&
    safeGameData.players &&
    safeGameData.players[safeGameData.currentTurn] &&
    safeGameData.players[safeGameData.currentTurn].name === currentPlayer.name &&
    gameStarted

  // Check if all players have placed bets
  const allPlayersHaveBet = players.every((p) => p.bet !== null)
  const waitingForBetDelay = allPlayersHaveBet && !safeGameData.allBetsPlaced

  // Track round changes to reset betting UI state
  useEffect(() => {
    if (currentRound !== currentRoundRef.current) {
      console.log(`Round changed from ${currentRoundRef.current} to ${currentRound}`)
      currentRoundRef.current = currentRound
      setStableBettingUI(false)
      lastBettingTurnRef.current = null

      // Clear any pending timeout
      if (bettingUITimeoutRef.current) {
        clearTimeout(bettingUITimeoutRef.current)
        bettingUITimeoutRef.current = null
      }
    }
  }, [currentRound])

  // Track the current betting player in a useEffect to avoid infinite loops
  useEffect(() => {
    // Only update the betting player if we're in the betting phase
    if (
      gameStarted &&
      !safeGameData.allBetsPlaced &&
      !allPlayersHaveBet &&
      safeGameData.currentBettingTurn !== undefined &&
      typeof safeGameData.currentBettingTurn === "number" &&
      safeGameData.currentBettingTurn >= 0 &&
      safeGameData.currentBettingTurn < players.length
    ) {
      const playerName = players[safeGameData.currentBettingTurn].name
      if (playerName && playerName !== "Waiting for players...") {
        setLastKnownBettingPlayer(playerName)

        // Store the current betting turn
        lastBettingTurnRef.current = safeGameData.currentBettingTurn

        // Determine if it's the current player's turn to bet
        const isCurrentPlayerTurn = playerName === currentPlayerName

        // If it's the current player's turn, stabilize the UI immediately
        if (isCurrentPlayerTurn && currentPlayer?.bet === null) {
          setStableBettingUI(true)

          // Clear any pending timeout
          if (bettingUITimeoutRef.current) {
            clearTimeout(bettingUITimeoutRef.current)
            bettingUITimeoutRef.current = null
          }
        }
      }
    }

    // If all players have bet, make sure we show the transition message
    if (allPlayersHaveBet && !safeGameData.allBetsPlaced) {
      setStableBettingUI(false)
      if (bettingUITimeoutRef.current) {
        clearTimeout(bettingUITimeoutRef.current)
        bettingUITimeoutRef.current = null
      }
    }
  }, [
    gameStarted,
    safeGameData.currentBettingTurn,
    players,
    safeGameData.allBetsPlaced,
    allPlayersHaveBet,
    currentPlayer,
    currentPlayerName,
  ])

  // Add this near the top of the component, where other useEffects are defined
  useEffect(() => {
    // Log the current betting state whenever it changes
    if (gameStarted) {
      console.log("Betting state:", {
        currentBettingTurn: safeGameData.currentBettingTurn,
        allBetsPlaced: safeGameData.allBetsPlaced,
        allPlayersHaveBet,
        currentPlayerName,
        lastKnownBettingPlayer,
        stableBettingUI,
      })
    }
  }, [
    gameStarted,
    safeGameData.currentBettingTurn,
    safeGameData.allBetsPlaced,
    allPlayersHaveBet,
    currentPlayerName,
    lastKnownBettingPlayer,
    stableBettingUI,
  ])

  const getValidCardsAfterTrumps = (hand: Card[]): Card[] => {
    const diamonds = hand.filter((c) => c.suit === "diamonds")
    if (diamonds.length > 0) {
      const highestDiamond = diamonds.reduce((max, card) => (card.value > max.value ? card : max), diamonds[0])
      return [highestDiamond]
    }
    // If no diamonds, return the highest card(s) of any suit
    const highestValue = Math.max(...hand.map((c) => c.value))
    return hand.filter((c) => c.value === highestValue)
  }

  useEffect(() => {
    let timer: NodeJS.Timeout | null = null

    // Check for new round or new play - always clear cards in these cases
    if ((safeGameData.currentRound > 0 && safeGameData.currentPlay === 1) || safeGameData.cardsOnTable.length === 0) {
      console.log("GameTable: Clearing displayed cards for new round/play")
      setDisplayedCards([])
      setIsClearing(false)
      return
    }

    // For normal gameplay, show the cards on the table
    setDisplayedCards(cardsOnTable)
    setIsClearing(false)

    // Only set up clearing logic if all cards have been played
    if (safeGameData.allCardsPlayed) {
      setIsClearing(true)

      // Use a slightly longer timeout than the server (2.5s vs 2s)
      // to ensure we don't clear cards before the server processes them
      timer = setTimeout(() => {
        setIsClearing(false)
        setDisplayedCards([])
      }, 2500)
    }

    // Clean up the timer when component unmounts or dependencies change
    return () => {
      if (timer) {
        clearTimeout(timer)
      }
    }
  }, [cardsOnTable, safeGameData.allCardsPlayed, safeGameData.currentRound, safeGameData.currentPlay])

  useEffect(() => {
    if (safeGameData.gameOver) {
      console.log("Game over detected in GameTable - showing results dialog")
      setShowResultsDialog(true)
    }
  }, [safeGameData.gameOver])


  // Add a function to get the total number of rounds based on game length
  const getTotalRounds = (gameLength: GameLength): number => {
    switch (gameLength) {
      case "short":
        return 18
      case "basic":
        return 22
      case "long":
        return 28
      default:
        return 18
    }
  }

  // Add a function to get the round names based on game length
  const getRoundNames = (gameLength: GameLength): string[] => {
    switch (gameLength) {
      case "short":
        return ["1", "2", "3", "4", "5", "6", "B", "B", "B", "B", "B", "B", "6", "5", "4", "3", "2", "1"]
      case "basic":
        return [
          "1",
          "2",
          "3",
          "4",
          "5",
          "6",
          "6",
          "6",
          "B",
          "B",
          "B",
          "B",
          "B",
          "B",
          "6",
          "6",
          "6",
          "5",
          "4",
          "3",
          "2",
          "1",
        ]
      case "long":
        return [
          "1",
          "2",
          "3",
          "4",
          "5",
          "6",
          "6",
          "6",
          "6",
          "6",
          "6",
          "B",
          "B",
          "B",
          "B",
          "B",
          "B",
          "6",
          "6",
          "6",
          "6",
          "6",
          "6",
          "5",
          "4",
          "3",
          "2",
          "1",
        ]
      default:
        return ["1", "2", "3", "4", "5", "6", "B", "B", "B", "B", "B", "B", "6", "5", "4", "3", "2", "1"]
    }
  }

  // Update the cardsThisRound calculation to use the game length
  const cardsThisRound = useMemo(() => {
    if (!gameStarted || currentRound <= 0) return 0

    const gameLength = safeGameData.gameLength || "short"
    const roundNames = getRoundNames(gameLength)
    if (currentRound > roundNames.length) return 0

    const roundName = roundNames[currentRound - 1]
    if (roundName === "B") return 6
    return Number.parseInt(roundName, 10)
  }, [gameStarted, currentRound, safeGameData.gameLength])

  const isValidPlay = (card: Card): boolean => {
    if (!currentPlayer) return false

    if (currentPlayer.hand.length === 1) return true // Player can play their last card regardless of suit

    if (cardsOnTable.length === 0) return true // First player can play any card

    const firstCard = cardsOnTable[0]
    const leadingSuit = firstCard.suit

    // Special case: 7 of spades can be played when diamonds are the leading suit
    if (card.suit === "spades" && card.value === 7) {
      return true // 7 of spades can now be played anytime (with Poker or Simple options)
    }

    // Special case for 7 of spades with 'Poker' option as the first card
    if (firstCard.suit === "spades" && firstCard.value === 7 && firstCard.pokerOption === "Poker") {
      return true // Any card can be played
    }

    // Check if player has any cards of the leading suit
    const hasSuit = currentPlayer.hand.some((c) => c.suit === leadingSuit && !(c.suit === "spades" && c.value === 7))

    if (hasSuit) {
      return card.suit === leadingSuit // Must follow suit if possible (except for 7 of spades which is handled above)
    }

    // If player doesn't have the leading suit, check if they have trumps
    const hasTrumps = currentPlayer.hand.some((c) => c.suit === "diamonds")
    if (hasTrumps) {
      return card.suit === "diamonds" // Must play a trump if they have one and can't follow suit (except for 7 of spades)
    }

    // If player has neither the leading suit nor trumps, they can play any card
    return true
  }

  // Modify the handlePlayCard function to check and set the isPlayingCard state
  const handlePlayCard = async (card: Card) => {
    // If a card play is already in progress, ignore additional clicks
    if (isPlayingCard) {
      return
    }

    if (!safeGameData.allBetsPlaced && !allPlayersHaveBet) {
        toast({
        title: "Cannot play card",
        description: "Please wait for all players to place their bets.",
        variant: "destructive",
      })
      return
    }

    // For 7 of spades, show the dialog and play special card sound
    if (card.suit === "spades" && card.value === 7) {
      let availableOptions = ["Poker", "Simple"]

      // If it's the first card, Trumps is also available
      if (cardsOnTable.length === 0) {
        availableOptions = ["Trumps", "Poker", "Simple"]
      }

      setPokerCardOption(null)
      setShowPokerCardDialog(true)
      return
    }

    // Remove the playSound("playCard") call here since it will be played for all players in the Game component

    if (!safeGameData.allBetsPlaced && !allPlayersHaveBet) {
      toast({
        title: "Cannot play card",
        description: "Please wait for all players to place their bets.",
        variant: "destructive",
      })
      return
    }

    // For 7 of spades, show the dialog
    if (card.suit === "spades" && card.value === 7) {
      let availableOptions = ["Poker", "Simple"]

      // If it's the first card, Trumps is also available
      if (cardsOnTable.length === 0) {
        availableOptions = ["Trumps", "Poker", "Simple"]
      }

      setPokerCardOption(null)
      setShowPokerCardDialog(true)
      return
    }

    // Check if 7 of spades with 'Trumps' option is on the table
    const sevenOfSpadesWithTrumps = cardsOnTable.find(
      (c) => c.suit === "spades" && c.value === 7 && c.pokerOption === "Trumps",
    )
    if (sevenOfSpadesWithTrumps) {
      const validCards = getValidCardsAfterTrumps(currentPlayer?.hand || [])
      if (!validCards.some((c) => c.suit === card.suit && c.value === card.value)) {
        toast({
          title: "Invalid Play",
          description: "You must play your highest trump card or highest card if you have no trumps.",
          variant: "destructive",
        })
        return
      }
    } else if (!isValidPlay(card)) {
      setErrorMessage(
        "Invalid card play. You must follow the leading suit if possible, or play a trump if you don't have the leading suit.",
      )
      toast({
        title: "Invalid Play",
        description:
          "You must follow the leading suit if possible, or play a trump if you don't have the leading suit.",
        variant: "destructive",
      })
      return
    }

    // Set the playing card state to true to prevent multiple clicks
    setIsPlayingCard(true)

    // Immediately show the card on the table for the current player
    // Create a temporary local copy of the card with the player's name
    if (currentPlayerName) {
      const localCard: Card = {
        ...card,
        playerName: currentPlayerName,
      }

      // Update the displayed cards immediately for the current player
      setDisplayedCards([...displayedCards, localCard])

      // Remove the card from the player's hand locally
      if (currentPlayer) {
        const updatedPlayer = {
          ...currentPlayer,
          hand: currentPlayer.hand.filter((c) => !(c.suit === card.suit && c.value === card.value)),
        }

        // Create a local update of the game state
        const localPlayers = [...players]
        const playerIndex = localPlayers.findIndex((p) => p.name === currentPlayerName)
        if (playerIndex !== -1) {
          localPlayers[playerIndex] = updatedPlayer
        }
      }
    }

    // Then send the actual request to the server
    await playCard(card)
  }

  // Modify the playCard function to reset the isPlayingCard state
  const playCard = async (card: Card, pokerOption?: "Trumps" | "Poker" | "Simple") => {
    setErrorMessage(null)

    // For 7 of spades with poker option, show it immediately
    if (card.suit === "spades" && card.value === 7 && pokerOption && currentPlayerName) {
      // Create a temporary local copy of the card with the player's name and poker option
      const localCard: Card = {
        ...card,
        playerName: currentPlayerName,
        pokerOption,
      }

      // Update the displayed cards immediately for the current player
      setDisplayedCards([...displayedCards, localCard])

      // Remove the card from the player's hand locally
      if (currentPlayer) {
        const updatedPlayer = {
          ...currentPlayer,
          hand: currentPlayer.hand.filter((c) => !(c.suit === card.suit && c.value === card.value)),
        }

        // Create a local update of the game state
        const localPlayers = [...players]
        const playerIndex = localPlayers.findIndex((p) => p.name === currentPlayerName)
        if (playerIndex !== -1) {
          localPlayers[playerIndex] = updatedPlayer
        }
      }
    }

    try {
      const response = await fetch("/api/game/play-card", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ tableId, playerName: currentPlayerName, card, pokerOption }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to play the card")
      }

      const data = await response.json()
      console.log("Card played. Received data:", data)
      // The game state will be updated through the SSE connection

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

      // If there was an error, revert the local changes
      setDisplayedCards(cardsOnTable)
    } finally {
      // Reset the playing card state regardless of success or failure
      setIsPlayingCard(false)
    }
  }

  const calculateForbiddenBet = (): number | null => {
    if (
      !gameStarted ||
      !safeGameData.scoreTable ||
      currentRound <= 0 ||
      currentRound > safeGameData.scoreTable.length
    ) {
      return null
    }

    // Get the current round's score table
    const currentRoundScores = safeGameData.scoreTable[currentRound - 1]
    if (!currentRoundScores) return null

    // Calculate the sum of all existing bets
    let totalBets = 0
    let playerCount = 0

    for (const playerName in currentRoundScores.scores) {
      const playerScore = currentRoundScores.scores[playerName]
      if (playerScore && playerScore.bet !== null) {
        totalBets += playerScore.bet
        playerCount++
      }
    }

    // If all players except the current one have placed bets
    if (playerCount === players.length - 1) {
      // The forbidden bet is the value that would make the total equal to cardsThisRound
      const forbiddenBet = cardsThisRound - totalBets
      // Only return a forbidden bet if it's within the valid range
      if (forbiddenBet >= 0 && forbiddenBet <= cardsThisRound) {
        return forbiddenBet
      }
    }

    return null
  }

  // Modify the handlePlaceBet function to remove the local sound playing
  const handlePlaceBet = () => {
    if (betAmount === null || betAmount < 0 || betAmount > cardsThisRound) {
        toast({
        title: "Invalid Bet",
        description: `Please enter a bet between 0 and ${cardsThisRound}.`,
        variant: "destructive",
      })
      return
    }

    const forbiddenBet = calculateForbiddenBet()
    if (forbiddenBet !== null && betAmount === forbiddenBet) {
        toast({
        title: "Invalid Bet",
        description: `You cannot bet ${forbiddenBet} as it would make the total bets equal to the number of cards (${cardsThisRound}).`,
        variant: "destructive",
      })
      return
    }

    // Remove the playSound("placeBet") call here since it will be played for all players in the Game component

    onPlaceBet(betAmount)
  }

  // Add sound to the handlePokerCardOptionSelect function
  const handlePokerCardOptionSelect = (option: "Trumps" | "Poker" | "Simple") => {
    setPokerCardOption(option)
    setShowPokerCardDialog(false)
    setIsPlayingCard(true) // Set the flag before playing the card
    playSound("playCard")
    playCard({ suit: "spades", value: 7 }, option)
  }

  const isValidSimplePlay = () => {
    // Simple option is now always valid for 7 of spades
    return true
  }

  const isValidCardToPlay = (card: Card) => {
    // Check if 7 of spades with 'Trumps' option is on the table
    const sevenOfSpadesWithTrumps = cardsOnTable.find(
      (c) => c.suit === "spades" && c.value === 7 && c.pokerOption === "Trumps",
    )
    if (sevenOfSpadesWithTrumps) {
      const validCards = getValidCardsAfterTrumps(currentPlayer?.hand || [])
      return validCards.some((c) => c.suit === card.suit && c.value === card.value)
    }

    // Add this new check: Special case for 7 of spades with 'Poker' option as the first card
    if (
      cardsOnTable.length > 0 &&
      cardsOnTable[0].suit === "spades" &&
      cardsOnTable[0].value === 7 &&
      cardsOnTable[0].pokerOption === "Poker"
    ) {
      return true // Any card can be played in response to 7 of spades with 'Poker' option
    }

    // Special case: 7 of spades can always be played (except when Trumps is active)
    if (card.suit === "spades" && card.value === 7) {
      return true // 7 of spades can now be played anytime
    }

    // For diamond cards when spades is the leading suit
    if (card.suit === "diamonds" && cardsOnTable.length > 0) {
      const leadingSuit = cardsOnTable[0].suit
      if (leadingSuit === "spades") {
        // Check if player has any spades other than 7 of spades
        const hasRegularSpades = currentPlayer?.hand.some(
          (c) => c.suit === "spades" && !(c.suit === "spades" && c.value === 7),
        )
        return !hasRegularSpades // Can play diamonds if player doesn't have regular spades
      }
    }

    return isValidPlay(card)
  }

  // Replace the existing highestScore calculation with:
  const highestScore = useMemo(() => {
    return Math.max(...(players.length > 0 ? players.map((p) => p.score) : [0]))
  }, [players])

  // Replace the existing isBlindRound calculation with:
  const isBlindRound = useMemo(() => {
    return (
      safeGameData.scoreTable &&
      safeGameData.scoreTable.length > 0 &&
      currentRound > 0 &&
      currentRound <= safeGameData.scoreTable.length &&
      safeGameData.scoreTable[currentRound - 1]?.roundName === "B"
    )
  }, [safeGameData.scoreTable, currentRound])

  // Replace the existing shouldShowCardBacks calculation with:
  const shouldShowCardBacks = useMemo(() => {
    return isBlindRound && !safeGameData.allBetsPlaced
  }, [isBlindRound, safeGameData.allBetsPlaced])

  // Calculate the current betting player name
  let currentBettingPlayerName = "Waiting for players..."

  // Only try to access the current betting player if the game has started
  if (
    gameStarted &&
    safeGameData.currentBettingTurn !== undefined &&
    typeof safeGameData.currentBettingTurn === "number" &&
    safeGameData.currentBettingTurn >= 0 &&
    safeGameData.currentBettingTurn < players.length
  ) {
    currentBettingPlayerName = players[safeGameData.currentBettingTurn].name
  }

  // Use the last known betting player if we have one and the current one is the default
  if (currentBettingPlayerName === "Waiting for players..." && lastKnownBettingPlayer !== "Waiting for players...") {
    currentBettingPlayerName = lastKnownBettingPlayer
  }

  // Determine if it's the current player's turn to bet with improved stability
  const isCurrentPlayerBettingTurn = useMemo(() => {
    // If we've already stabilized the UI, maintain that state
    if (stableBettingUI && currentPlayer && currentPlayer.bet === null) {
      console.log("Using stabilized UI state for betting turn")
      return true
    }

    // If the player has already bet, it's definitely not their turn
    if (currentPlayer?.bet !== null) {
      return false
    }

    // Check if it's explicitly this player's turn based on currentBettingTurn
    if (
      currentPlayer &&
      gameStarted &&
      safeGameData.currentBettingTurn !== undefined &&
      typeof safeGameData.currentBettingTurn === "number" &&
      safeGameData.currentBettingTurn >= 0 &&
      safeGameData.currentBettingTurn < players.length
    ) {
      const isTurn = players[safeGameData.currentBettingTurn].name === currentPlayer.name
      console.log(
        `Checking if it's ${currentPlayer.name}'s turn to bet: ${isTurn} (currentBettingTurn: ${safeGameData.currentBettingTurn})`,
      )

      if (isTurn) {
        // Stabilize the UI if it's the player's turn
        if (!stableBettingUI && !bettingUITimeoutRef.current) {
          setStableBettingUI(true)
        }
        return true
      }
    }

    return false
  }, [currentPlayer, gameStarted, safeGameData.currentBettingTurn, players, stableBettingUI])

  // Check if we're in the waiting period after all bets are placed
  const isInBetDisplayPeriod = safeGameData.betsPlacedTimestamp && !safeGameData.allBetsPlaced

  // Function to determine if we should show bet banners
  const shouldShowBetBanners = () => {
    // Show bet banners if any player has placed a bet and we haven't started playing cards yet
    return (
      gameStarted &&
      players.some((player) => player.bet !== null) &&
      safeGameData.currentPlay === 1 &&
      cardsOnTable.length === 0
    )
  }

  // Add this function inside the GameTable component
  const renderGameStatusMessage = () => {
    console.log("Rendering game status with:", {
      allBetsPlaced: safeGameData.allBetsPlaced,
      currentBettingTurn: safeGameData.currentBettingTurn,
      currentPlayerBet: currentPlayer?.bet,
      allPlayersHaveBet,
      isCurrentPlayerBettingTurn,
      currentBettingPlayerName,
    })

    // NEW: If we're in the golden round, show a special message
    if (safeGameData.isGoldenRound) {
      if (isCurrentPlayerTurn) {
        return <span className="text-amber-500 font-bold">Golden Round! It's your turn to play a card!</span>
      } else {
        return (
          <span className="text-amber-500 font-bold">
            Golden Round! Waiting for {players[currentTurn]?.name || "other player"} to play a card...
          </span>
        )
      }
    }

    // If all bets are placed, we're in the card playing phase
    if (safeGameData.allBetsPlaced) {
      if (isCurrentPlayerTurn) {
        return <span className="text-green-600">It's your turn to play a card!</span>
      } else {
        return (
          <span className="text-yellow-600">
            Waiting for {players[currentTurn]?.name || "other player"} to play a card...
          </span>
        )
      }
    }

    // If the player has already placed a bet, show a stable message
    if (currentPlayer && currentPlayer.bet !== null) {
      return <span className="text-blue-600">Waiting for other players to place their bets...</span>
    }

    // If all players have bet but allBetsPlaced is false, we're in the transition period
    if (allPlayersHaveBet && !safeGameData.allBetsPlaced) {
      return <span className="text-blue-600">Preparing to start the round...</span>
    }

    // If it's the current player's turn to bet, show that message
    if (isCurrentPlayerBettingTurn) {
      return <span className="text-green-600">It's your turn to place a bet!</span>
    }

    // Otherwise, we're waiting for another player to bet
    return (
      <span className="text-yellow-600">
        Waiting for{" "}
        {currentBettingPlayerName.startsWith("Waiting")
          ? players.find((p) => p.name !== currentPlayerName)?.name || "other players"
          : currentBettingPlayerName}{" "}
        to place their bet...
      </span>
    )
  }

  // Add this function to handle saving the game configuration
  const handleSaveGameConfig = (gameLength: GameLength, hasGoldenRound: boolean) => {
    onConfigureGame(gameLength, hasGoldenRound)
  }

  // Score table helpers (used in both panel and layout)
  const stCurrentIdx = players.findIndex((p) => p.name === currentPlayerName)
  const orderedPlayers = stCurrentIdx > 0
    ? [players[stCurrentIdx], ...players.filter((_, i) => i !== stCurrentIdx)]
    : [...players]
  const visibleWidth = 70 + Math.max(1, Math.min(scoreTablePlayerCount, players.length || 1)) * 200

  const isBottomPosition = scoreTablePosition === "bottom"

  // Chevron direction depends on position
  const collapseIcon = isBottomPosition
    ? (scoreTableExpanded ? "▼" : "▲")
    : (scoreTablePosition === "right" ? (scoreTableExpanded ? "▶" : "◀") : (scoreTableExpanded ? "◀" : "▶"))

  const scoreTablePanel = (
    <div
      className={`flex-shrink-0 transition-all duration-300 ${
        isBottomPosition
          ? scoreTableExpanded ? "w-full" : "h-10 overflow-hidden"
          : scoreTableExpanded ? "" : "w-auto"
      }`}
      style={!isBottomPosition && scoreTableExpanded ? { width: visibleWidth } : undefined}
    >
      {/* Header row: toggle + title + gear */}
      <div className="flex items-center gap-2 mb-3">
        <button
          onClick={() => setScoreTableExpanded((v) => !v)}
          className="text-sm font-semibold text-gray-300 hover:text-white"
        >
          {collapseIcon}
        </button>
        <span className="text-sm font-semibold text-gray-300 flex-1 whitespace-nowrap">Score Table</span>
        {scoreTableExpanded && (
          <>
            <button
              onClick={() => setShowScoreSettings((v) => !v)}
              className="text-gray-400 hover:text-white"
              title="Score table settings"
            >
              <Settings size={15} />
            </button>
          </>
        )}
      </div>

      {/* Settings panel */}
      {scoreTableExpanded && showScoreSettings && (
        <div className="mb-3 p-3 bg-gray-800 rounded-lg flex flex-wrap items-center gap-3">
          <span className="text-xs text-gray-300 whitespace-nowrap">Players shown:</span>
          <select
            value={scoreTablePlayerCount}
            onChange={(e) => setScoreTablePlayerCount(Number(e.target.value))}
            className="text-xs bg-gray-700 text-white border border-gray-600 rounded px-2 py-1"
          >
            {Array.from({ length: players.length }, (_, i) => i + 1).map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
          <span className="text-xs text-gray-300 whitespace-nowrap">Position:</span>
          <select
            value={scoreTablePosition}
            onChange={(e) => setScoreTablePosition(e.target.value as "left" | "right" | "bottom")}
            className="text-xs bg-gray-700 text-white border border-gray-600 rounded px-2 py-1"
          >
            <option value="left">Left</option>
            <option value="right">Right</option>
            <option value="bottom">Bottom</option>
          </select>
        </div>
      )}

      {scoreTableExpanded && (
        <div className="overflow-x-auto" style={{ maxWidth: isBottomPosition ? undefined : visibleWidth }}>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-white font-bold text-left border-r border-gray-600 border-b-0"></TableHead>
                {orderedPlayers.map((player) => (
                  <TableHead key={player.name} colSpan={4} className="text-left text-white font-bold border-r border-gray-600">
                    {player.name}
                  </TableHead>
                ))}
              </TableRow>
              <TableRow>
                <TableHead className="border-r border-gray-600"></TableHead>
                {orderedPlayers.map((player) => (
                  <React.Fragment key={player.name}>
                    <TableHead className="text-center">Bet</TableHead>
                    <TableHead className="text-center">Wins</TableHead>
                    <TableHead className="text-center">Points</TableHead>
                    <TableHead className="text-center border-r border-gray-600">Round</TableHead>
                  </React.Fragment>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {safeGameData.scoreTable && safeGameData.scoreTable.length > 0 ? (
                safeGameData.scoreTable.map((round: ScoreTableRow) => (
                  <TableRow
                    key={round.roundId}
                    className={`
                    ${round.roundId === currentRound ? "bg-blue-400/70" : ""}
                    ${round.roundId < currentRound ? "bg-gray-600/70" : ""}
                  `}
                  >
                    <TableCell className="border-r border-gray-600">{round.roundName}</TableCell>
                    {orderedPlayers.map((player) => {
                      const playerScore: PlayerScore = round.scores[player.name] || {
                        cumulativePoints: 0,
                        roundPoints: 0,
                        bet: null,
                      }
                      const wins =
                        round.roundId === currentRound ? player.roundWins || 0 : round.scores[player.name]?.wins || 0
                      return (
                        <React.Fragment key={player.name}>
                          <TableCell className="text-center">
                            {playerScore.bet !== null ? playerScore.bet : "-"}
                          </TableCell>
                          <TableCell className="text-center">
                            {round.roundId === currentRound
                              ? wins
                              : playerScore.wins !== undefined
                                ? playerScore.wins
                                : "-"}
                          </TableCell>
                          <TableCell className="text-center">{playerScore.cumulativePoints}</TableCell>
                          <TableCell
                            className={`text-center border-r border-gray-600 ${
                              playerScore.roundPoints < 0
                                ? "text-red-600"
                                : playerScore.roundPoints > 0
                                  ? "text-green-600"
                                  : ""
                            }`}
                          >
                            {playerScore.roundPoints > 0
                              ? `+${playerScore.roundPoints}`
                              : playerScore.roundPoints === 0
                                ? "-"
                                : playerScore.roundPoints}
                          </TableCell>
                        </React.Fragment>
                      )
                    })}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={orderedPlayers.length * 4 + 1}>No scores available</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )

  return (
    <div className={`flex gap-4 ${isBottomPosition ? "flex-col items-stretch" : "flex-row items-start"}`}>

      {/* Score table: left or right position */}
      {scoreTablePosition === "left" && scoreTablePanel}

      {/* Main content */}
      <div className="flex-1 space-y-8">

      {/* Game Info */}
      <div className="text-center relative">
        {gameStarted ? (
          <div className="flex justify-center items-center space-x-6">
            <p>
              <span className="font-semibold">Table ID:</span> {tableId}
            </p>
            <p>
              <span className="font-semibold">Round:</span> {currentRound}
            </p>
            <p>
              <span className="font-semibold">Play:</span> {currentPlay}
            </p>
            <p>
              <span className="font-semibold">Current Turn:</span> {players[currentTurn]?.name || "Waiting..."}
            </p>
            <p>
              <span className="font-semibold">Cards this Round:</span> {cardsThisRound}
            </p>
          </div>
        ) : (
          <>
            <p>Table ID: {tableId}</p>
            {players.length < 2 ? (
              <p className="text-yellow-600 font-semibold">Waiting for more players to join...</p>
            ) : (
              <p>Waiting for game to start...</p>
            )}
          </>
        )}
      </div>

      {/* Buttons */}
      <div className="flex justify-center space-x-4">
        {!gameStarted && <Button onClick={onShare}>Share Game Link</Button>}
        {!gameStarted && isOwner && players.length >= 2 && (
          <Button onClick={() => setShowConfigureDialog(true)}>Configure Game</Button>
        )}
        {canStartGame && <Button onClick={onStartGame}>Start Game</Button>}
      </div>

      {/* Table with seats */}
      <div className="relative w-[800px] h-[400px] mx-auto overflow-visible">
        {/* Table shadow */}
        <div className="absolute inset-0 rounded-[200px/100px] bg-black/20 transform translate-y-2 blur-md"></div>

        {/* Table rail (border) */}
        <div className="absolute inset-0 rounded-[200px/100px] bg-[#e6e0d4] shadow-lg"></div>

        {/* Table felt */}
        <div className="absolute inset-[20px] rounded-[180px/90px] bg-[#0f4c81]">
          {/* Inner felt line */}
          <div className="absolute inset-[30px] rounded-[150px/75px] border-2 border-[#0a3d6a] opacity-50"></div>
        </div>

        {/* Player seats */}
        {players.map((player, index) => {
          // Seat positions centered on each border segment of the rounded-rect table.
          // Flat edge centers: bottom (400,400), top (400,0), left (0,200), right (800,200)
          // Corner arc midpoints (border-radius 200px/100px): TL(59,29) TR(741,29) BL(59,371) BR(741,371)
          const seatPositions: Record<number, [number, number][]> = {
            1: [[400, 400]],
            2: [[400, 400], [400, 0]],
            3: [[400, 400], [59, 29], [741, 29]],
            4: [[400, 400], [0, 200], [400, 0], [800, 200]],
            5: [[400, 400], [59, 371], [59, 29], [741, 29], [741, 371]],
            6: [[400, 400], [59, 371], [59, 29], [400, 0], [741, 29], [741, 371]],
          }
          const [left, top] = seatPositions[players.length]?.[index] ?? [400, 200]

          // Score color: positive = green, negative = red, zero = gray
          let scoreColor = "text-green-400"
          if (player.score === 0) {
            scoreColor = "text-gray-400"
          } else if (player.score < 0) {
            scoreColor = "text-red-400"
          }

          const isCurrentTurn = safeGameData.allBetsPlaced && players[currentTurn]?.name === player.name
          const isBettingTurn =
            !safeGameData.allBetsPlaced &&
            typeof safeGameData.currentBettingTurn === "number" &&
            players[safeGameData.currentBettingTurn]?.name === player.name
          const isActiveTurn = isCurrentTurn || isBettingTurn
          const isLeader = player.score === highestScore && highestScore > 0
          const betValue = shouldShowBetBanners() && player.bet !== null ? player.bet : "—"

          // ─── Seat appearance — edit these to restyle seats ───────────────
          const seatBg         = "bg-gray-700"           // default background
          const seatBgTurn     = "bg-yellow-100"           // background when it's this player's turn
          const seatText       = "text-gray-100"         // default text color
          const seatBorder     = "border-gray-500"       // default border
          const seatBorderTurn = "border-transparent"     // border when it's this player's turn
          const seatBorderLead = "border-yellow-400 ring-1 ring-yellow-400"              // leader highlight
          const dividerColor   = "border-gray-600"       // divider between name and stats rows
          const labelColor     = "text-gray-400"         // stat labels (pts / bet / wins)
          // ─────────────────────────────────────────────────────────────────

          const borderClass = isLeader
            ? seatBorderLead
            : isActiveTurn
            ? seatBorderTurn
            : seatBorder

          return (
            <div
              key={index}
              className="absolute -translate-x-1/2 -translate-y-1/2"
              style={{ left: `${left}px`, top: `${top}px` }}
            >
              <div
                className={`w-[150px] rounded-xl shadow-lg border-2 ${isActiveTurn ? seatBgTurn : seatBg} ${seatText} ${borderClass}`}
              >
                {/* Top row: avatar + name */}
                <div className="flex items-center gap-2 px-3 py-2">
                  <div className="w-7 h-7 rounded-full bg-gray-500 flex-shrink-0 flex items-center justify-center text-white text-xs font-bold">
                    {player.name.charAt(0).toUpperCase()}
                  </div>
                  <span className={`text-sm font-bold ${isActiveTurn ? "text-gray-500" : ""}`}>{player.name}</span>
                </div>
                {/* Stats row: pts | bet | wins */}
                <div className={`grid grid-cols-3 border-t ${dividerColor} px-1 py-1.5`}>
                  <div className="flex flex-col items-center">
                    <span className={`text-[10px] uppercase tracking-wide ${labelColor}`}>pts</span>
                    <span className={`text-sm font-bold ${scoreColor}`}>{player.score}</span>
                  </div>
                  <div className="flex flex-col items-center">
                    <span className={`text-[10px] uppercase tracking-wide ${labelColor}`}>bet</span>
                    <span className="text-sm font-bold text-purple-300">{betValue}</span>
                  </div>
                  <div className="flex flex-col items-center">
                    <span className={`text-[10px] uppercase tracking-wide ${labelColor}`}>wins</span>
                    <span className="text-sm font-bold text-blue-300">{player.roundWins}</span>
                  </div>
                </div>
              </div>
            </div>
          )
        })}

        {/* Cards on table */}
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 flex space-x-2">
          {cardsOnTable.map((card, index) => (
            <div key={index} className="relative">
              <PlayingCard
                suit={card.suit}
                value={card.value}
                disabled
                className={
                  safeGameData.highestCard &&
                  card.suit === safeGameData.highestCard.suit &&
                  card.value === safeGameData.highestCard.value
                    ? "bg-yellow-100"
                    : card.suit === "diamonds"
                      ? "bg-red-100"
                      : "bg-white"
                }
              />
              {card.suit === "spades" && card.value === 7 && card.pokerOption && (
                <div
                  className={`absolute bottom-0 left-0 right-0 text-white text-xs py-1 px-2 text-center
  ${card.pokerOption === "Trumps" ? "bg-red-300" : card.pokerOption === "Poker" ? "bg-yellow-300" : "bg-blue-300"}`}
                >
                  {card.pokerOption}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Spacer container to manage vertical spacing */}
      <div className="h-2"></div>

      {/* Betting and Player's hand */}
      <div className="flex mt-4">
        {/* Spacer div */}
        <div className="w-1/6"></div>
        {/* Your Bet/Win section — hidden once current player has placed their bet */}
        {(!gameStarted || !currentPlayer || currentPlayer.bet === null) && <div className={`w-1/3 mr-8 flex flex-col rounded-xl p-3 border-2 ${isCurrentPlayerBettingTurn ? "border-green-400 animate-bet-border" : "border-transparent"}`}>
          <h2 className="text-xl font-bold mb-2 text-center">Make Your Bet</h2>
          {!gameStarted ? (
            <div className="flex flex-col items-center mt-1">
              <p className="text-center">No bets and wins</p>
            </div>
          ) : currentPlayer && currentPlayer.bet === null ? (
            isCurrentPlayerBettingTurn ? (
              <div className="flex flex-col flex-1">
                {/* Number display + up/down buttons */}
                <div className="relative flex items-center justify-center flex-1">
                  <span className="text-white text-6xl font-bold select-none">
                    {betAmount ?? 0}
                  </span>
                  <button
                    onClick={() => setBetAmount((v) => Math.max((v ?? 0) - 1, 0))}
                    className="absolute w-10 h-10 flex items-center justify-center rounded-lg bg-gray-700 hover:bg-gray-600 text-white border border-gray-500"
                    style={{ right: "calc(50% + 2.5rem)" }}
                  >
                    <ChevronLeft size={20} />
                  </button>
                  <button
                    onClick={() => setBetAmount((v) => Math.min((v ?? 0) + 1, cardsThisRound))}
                    className="absolute w-10 h-10 flex items-center justify-center rounded-lg bg-gray-700 hover:bg-gray-600 text-white border border-gray-500"
                    style={{ left: "calc(50% + 2.5rem)" }}
                  >
                    <ChevronRight size={20} />
                  </button>
                </div>
                {/* Confirm + forbidden bet — aligned with hand status messages */}
                <div className="flex flex-col items-center gap-1 mt-2">
                  {(() => {
                    const forbiddenBet = calculateForbiddenBet()
                    return forbiddenBet !== null
                      ? <p className="text-red-500 text-sm">You cannot bet {forbiddenBet}</p>
                      : null
                  })()}
                  <Button onClick={handlePlaceBet}>Confirm</Button>
                </div>
              </div>
            ) : (
              <p className="text-center text-yellow-600 mt-4">
                {waitingForBetDelay ? (
                  "Preparing to start the round..."
                ) : (
                  <>
                    Waiting for{" "}
                    {currentBettingPlayerName.startsWith("Waiting")
                      ? players.find((p) => p.name !== currentPlayerName)?.name || "other players"
                      : currentBettingPlayerName}{" "}
                    to place their bet...
                  </>
                )}
              </p>
            )
          ) : null}
        </div>}

        {/* Player's hand */}
        <div className="w-2/3">
          <h2 className="text-xl font-bold mb-2 text-center">Your Hand</h2>
          <div className="flex justify-center space-x-2">
            {currentPlayer && currentPlayer.hand && currentPlayer.hand.length > 0 ? (
              currentPlayer.hand.map((card, index) => (
                <PlayingCard
                  key={index}
                  suit={card.suit}
                  value={card.value}
                  onClick={() => handlePlayCard(card)}
                  disabled={
                    !isCurrentPlayerTurn ||
                    isClearing ||
                    !isValidCardToPlay(card) ||
                    !safeGameData.allBetsPlaced ||
                    isPlayingCard
                  }
                  showBack={shouldShowCardBacks}
                  className={`${
                    !isCurrentPlayerTurn || !isValidCardToPlay(card) || !safeGameData.allBetsPlaced || isPlayingCard
                      ? "opacity-50"
                      : ""
                  }`}
                />
              ))
            ) : (
              <p>No cards in hand</p>
            )}
          </div>
          {/* Replace the hardcoded check with the dynamic getTotalRounds function */}
          {gameStarted && currentRound <= getTotalRounds(safeGameData.gameLength || "basic") && (
            <p className="text-center mt-2 font-bold">{renderGameStatusMessage()}</p>
          )}
          {errorMessage && <p className="text-red-600 text-center mt-2">{errorMessage}</p>}
        </div>
      </div>

      </div>{/* end main content column */}

      {/* Score table: right position */}
      {scoreTablePosition === "right" && scoreTablePanel}

      {/* Score table: bottom position (rendered inside flex-col after main content) */}
      {scoreTablePosition === "bottom" && scoreTablePanel}

      <GameResultsDialog isOpen={showResultsDialog} onClose={() => setShowResultsDialog(false)} players={players} />
      <PokerCardDialog
        isOpen={showPokerCardDialog}
        onClose={() => setShowPokerCardDialog(false)}
        onOptionSelect={handlePokerCardOptionSelect}
        isFirstCard={cardsOnTable.length === 0}
        isValidSimple={isValidSimplePlay()}
        availableOptions={cardsOnTable.length === 0 ? ["Trumps", "Poker", "Simple"] : ["Poker", "Simple"]}
      />
      <ConfigureGameDialog
        isOpen={showConfigureDialog}
        onClose={() => setShowConfigureDialog(false)}
        onSave={handleSaveGameConfig}
        currentGameLength={safeGameData.gameLength || "short"}
        currentHasGoldenRound={safeGameData.hasGoldenRound || false}
      />

      {/* Add CSS for animations */}
      <style jsx global>{`
      @keyframes fadeIn {
        from { opacity: 0; transform: translate(-50%, -10px); }
        to { opacity: 1; transform: translate(-50%, 0); }
      }
      @keyframes betBorder {
        0%, 100% { border-color: rgb(74 222 128); box-shadow: 0 0 8px rgb(74 222 128 / 0.6); }
        50% { border-color: transparent; box-shadow: none; }
      }
      .animate-bet-border {
        animation: betBorder 1s ease-in-out infinite;
      }
    `}</style>
    </div>
  )
}
