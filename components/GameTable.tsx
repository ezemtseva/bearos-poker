"use client"

import React from "react"
import { TableHeader } from "@/components/ui/table"
import { useState, useEffect, useRef } from "react"
import type { Player, Card, GameData, ScoreTableRow, PlayerScore } from "../types/game"
import { Table, TableBody, TableCell, TableHead, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import PlayingCard from "./PlayingCard"
import { useToast } from "@/hooks/use-toast"
import GameResultsDialog from "./GameResultsDialog"
import PokerCardDialog from "./PokerCardDialog"

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
  gameData,
  lastPlayedCard,
}: GameTableProps) {
  const [displayedCards, setDisplayedCards] = useState<Card[]>(cardsOnTable)
  const [isClearing, setIsClearing] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [betAmount, setBetAmount] = useState<number | null>(0)
  const [showResultsDialog, setShowResultsDialog] = useState(false)
  const [showPokerCardDialog, setShowPokerCardDialog] = useState(false)
  const [pokerCardOption, setPokerCardOption] = useState<"Trumps" | "Poker" | "Simple" | null>(null)
  const [lastKnownBettingPlayer, setLastKnownBettingPlayer] = useState<string>("Waiting for players...")
  const [stableBettingUI, setStableBettingUI] = useState<boolean>(false)
  const { toast } = useToast()

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
  }

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
    if (gameStarted && safeGameData.currentBettingTurn !== undefined) {
      if (safeGameData.currentBettingTurn >= 0 && safeGameData.currentBettingTurn < players.length) {
        const playerName = players[safeGameData.currentBettingTurn].name
        if (playerName && playerName !== "Waiting for players...") {
          setLastKnownBettingPlayer(playerName)

          // Store the current betting turn
          lastBettingTurnRef.current = safeGameData.currentBettingTurn

          // Determine if it's the current player's turn to bet
          const currentPlayerName = localStorage.getItem("playerName")
          const isCurrentPlayerTurn = playerName === currentPlayerName

          // If it's the current player's turn, stabilize the UI immediately
          if (isCurrentPlayerTurn) {
            setStableBettingUI(true)

            // Clear any pending timeout
            if (bettingUITimeoutRef.current) {
              clearTimeout(bettingUITimeoutRef.current)
              bettingUITimeoutRef.current = null
            }
          }
        }
      }
    }
  }, [gameStarted, safeGameData.currentBettingTurn, players])

  const getValidCardsAfterTrumps = (hand: Card[]): Card[] => {
    const diamonds = hand.filter((c) => c.suit === "diamonds")
    if (diamonds.length > 0) {
      const highestDiamond = diamonds.reduce((max, card) => (card.value > max.value ? card : max))
      return [highestDiamond]
    }
    // If no diamonds, return the highest card(s) of any suit
    const highestValue = Math.max(...hand.map((c) => c.value))
    return hand.filter((c) => c.value === highestValue)
  }

  useEffect(() => {
    if (safeGameData.allCardsPlayed) {
      setDisplayedCards(cardsOnTable)
      setIsClearing(true)
      const timer = setTimeout(() => {
        setIsClearing(false)
        setDisplayedCards([])
      }, 2000)
      return () => clearTimeout(timer)
    } else {
      setDisplayedCards(cardsOnTable)
      setIsClearing(false)
    }
  }, [cardsOnTable, safeGameData.allCardsPlayed])

  useEffect(() => {
    if (safeGameData.gameOver) {
      setShowResultsDialog(true)
    }
  }, [safeGameData.gameOver])

  const currentPlayerName = localStorage.getItem("playerName")
  const currentPlayer = players.find((p) => p.name === currentPlayerName)
  const canStartGame = isOwner && players.length >= 2 && !gameStarted
  const isCurrentPlayerTurn =
    currentPlayer &&
    safeGameData.players &&
    safeGameData.players[safeGameData.currentTurn] &&
    safeGameData.players[safeGameData.currentTurn].name === currentPlayer.name &&
    gameStarted

  const cardsThisRound = currentRound <= 6 ? currentRound : currentRound <= 12 ? 6 : 19 - currentRound

  const isValidPlay = (card: Card): boolean => {
    if (!currentPlayer) return false

    if (currentPlayer.hand.length === 1) return true // Player can play their last card regardless of suit

    if (cardsOnTable.length === 0) return true // First player can play any card

    const firstCard = cardsOnTable[0]
    const leadingSuit = firstCard.suit

    // Special case: 7 of spades can be played when diamonds are the leading suit
    if (card.suit === "spades" && card.value === 7 && leadingSuit === "diamonds") {
      return true // Can play 7 of spades when diamonds are the leading suit
    }

    // Special case for 7 of spades with 'Poker' option as the first card
    if (firstCard.suit === "spades" && firstCard.value === 7 && firstCard.pokerOption === "Poker") {
      return true // Any card can be played
    }

    // Check if player has any cards of the leading suit, excluding 7 of spades
    const hasSuit = currentPlayer.hand.some((c) => c.suit === leadingSuit && !(c.suit === "spades" && c.value === 7))

    if (card.suit === "spades" && card.value === 7) {
      return !hasSuit // Can play 7 of spades only if player doesn't have the leading suit
    }

    if (hasSuit) {
      return card.suit === leadingSuit // Must follow suit if possible
    }

    // If player doesn't have the leading suit, check if they have trumps
    const hasTrumps = currentPlayer.hand.some((c) => c.suit === "diamonds")
    if (hasTrumps) {
      return card.suit === "diamonds" // Must play a trump if they have one and can't follow suit
    }

    // If player has neither the leading suit nor trumps, they can play any card
    return true
  }

  const handlePlayCard = async (card: Card) => {
    if (!safeGameData.allBetsPlaced) {
      toast({
        title: "Cannot play card",
        description: "Please wait for all players to place their bets.",
        variant: "destructive",
      })
      return
    }

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

    await playCard(card)
  }

  const playCard = async (card: Card, pokerOption?: "Trumps" | "Poker" | "Simple") => {
    setErrorMessage(null)

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

  const handlePlaceBet = async () => {
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

    try {
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
      // The game state will be updated through the SSE connection

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

  const handlePokerCardOptionSelect = (option: "Trumps" | "Poker" | "Simple") => {
    setPokerCardOption(option)
    setShowPokerCardDialog(false)
    playCard({ suit: "spades", value: 7 }, option)
  }

  const isValidSimplePlay = () => {
    if (cardsOnTable.length === 0) return true

    const leadingSuit = cardsOnTable[0].suit

    // Always allow Simple option when diamonds are the leading suit
    if (leadingSuit === "diamonds") return true

    // For spades as leading suit, check if player has regular spades cards
    if (leadingSuit === "spades") {
      // Check if player has any spades other than 7 of spades
      const hasRegularSpades = currentPlayer?.hand.some(
        (c) => c.suit === "spades" && !(c.suit === "spades" && c.value === 7),
      )
      return !hasRegularSpades // Can play 7 of spades as Simple if player doesn't have regular spades
    }

    // For other suits, check if player has the leading suit
    const hasLeadingSuit = currentPlayer?.hand.some((c) => c.suit === leadingSuit)
    return !hasLeadingSuit
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

    // Special case: 7 of spades can be played when diamonds are the leading suit
    if (card.suit === "spades" && card.value === 7 && cardsOnTable.length > 0) {
      const leadingSuit = cardsOnTable[0].suit
      if (leadingSuit === "diamonds") {
        return true // Can always play 7 of spades when diamonds are the leading suit
      }

      // Check if player has the leading suit
      const hasLeadingSuit = currentPlayer?.hand.some(
        (c) => c.suit === leadingSuit && !(c.suit === "spades" && c.value === 7),
      )
      return !hasLeadingSuit // Can play 7 of spades only if player doesn't have the leading suit
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

  const highestScore = Math.max(...(players.length > 0 ? players.map((p) => p.score) : [0]))

  const isBlindRound =
    safeGameData.scoreTable &&
    safeGameData.scoreTable.length > 0 &&
    currentRound > 0 &&
    currentRound <= safeGameData.scoreTable.length &&
    safeGameData.scoreTable[currentRound - 1]?.roundName === "B"

  const shouldShowCardBacks = isBlindRound && !safeGameData.allBetsPlaced

  // Calculate the current betting player name
  let currentBettingPlayerName = "Waiting for players..."

  // Only try to access the current betting player if the game has started
  if (gameStarted && safeGameData.currentBettingTurn !== undefined) {
    // Make sure the index is valid
    if (safeGameData.currentBettingTurn >= 0 && safeGameData.currentBettingTurn < players.length) {
      currentBettingPlayerName = players[safeGameData.currentBettingTurn].name
    }
  }

  // Use the last known betting player if we have one and the current one is the default
  if (currentBettingPlayerName === "Waiting for players..." && lastKnownBettingPlayer !== "Waiting for players...") {
    currentBettingPlayerName = lastKnownBettingPlayer
  }

  // Determine if it's the current player's turn to bet with improved stability
  const isCurrentPlayerBettingTurn = (() => {
    // If we've already stabilized the UI, maintain that state
    if (stableBettingUI && currentPlayer && currentPlayer.bet === null) {
      return true
    }

    // Otherwise, calculate based on current data
    if (
      currentPlayer &&
      gameStarted &&
      safeGameData.currentBettingTurn !== undefined &&
      safeGameData.currentBettingTurn !== null &&
      safeGameData.currentBettingTurn >= 0 &&
      safeGameData.currentBettingTurn < players.length
    ) {
      const isTurn = players[safeGameData.currentBettingTurn].name === currentPlayer.name

      // If it's the player's turn and they haven't placed a bet yet, stabilize the UI
      if (isTurn && currentPlayer.bet === null) {
        // Use a timeout to prevent rapid toggling
        if (!stableBettingUI && !bettingUITimeoutRef.current) {
          bettingUITimeoutRef.current = setTimeout(() => {
            setStableBettingUI(true)
            bettingUITimeoutRef.current = null
          }, 100) // Small delay to ensure stability
        }
        return true
      }
    }

    return false
  })()

  // Check if we're in the waiting period after all bets are placed
  const isInBetDisplayPeriod = safeGameData.betsPlacedTimestamp && !safeGameData.allBetsPlaced

  // Debug logging
  useEffect(() => {
    console.log("Current round:", currentRound)
    console.log("Current betting turn:", safeGameData.currentBettingTurn)
    console.log("Is current player betting turn:", isCurrentPlayerBettingTurn)
    console.log("Stable betting UI:", stableBettingUI)
    console.log("Current player bet:", currentPlayer?.bet)
    console.log("Bets placed timestamp:", safeGameData.betsPlacedTimestamp)
    console.log("All bets placed:", safeGameData.allBetsPlaced)
    console.log(
      "All players have bet:",
      players.every((p) => p.bet !== null),
    )
  }, [
    currentRound,
    safeGameData.currentBettingTurn,
    isCurrentPlayerBettingTurn,
    stableBettingUI,
    currentPlayer?.bet,
    safeGameData.betsPlacedTimestamp,
    safeGameData.allBetsPlaced,
    players,
  ])

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

  // Check if all players have placed bets but we're waiting for the delay
  const allPlayersHaveBet = players.every((p) => p.bet !== null)
  const waitingForBetDelay = allPlayersHaveBet && !safeGameData.allBetsPlaced

  return (
    <div className="space-y-8">
      {/* Game Info */}
      <div className="text-center">
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
            <p>Waiting for game to start...</p>
            {!gameStarted && players.length < 2 && (
              <p className="text-yellow-600 font-semibold">Waiting for more players to join...</p>
            )}
          </>
        )}
      </div>

      {/* Buttons */}
      <div className="flex justify-center space-x-4">
        {!gameStarted && <Button onClick={onShare}>Share Game Link</Button>}
        {canStartGame && <Button onClick={onStartGame}>Start Game</Button>}
      </div>

      {/* Table with seats */}
      <div className="relative w-[800px] h-[400px] mx-auto">
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
          const angle = index * (360 / players.length) * (Math.PI / 180)
          const xRadius = 380 // Increased radius for wider oval
          const yRadius = 200
          const left = 400 + xRadius * Math.cos(angle)
          const top = 200 + yRadius * Math.sin(angle)

          // Determine chip color based on score
          let chipColor = "bg-green-700" // Default for positive scores that aren't the highest

          if (player.score === 0) {
            chipColor = "bg-gray-500" // Zero score
          } else if (player.score < 0 && player.score !== highestScore) {
            chipColor = "bg-red-600" // Negative score but not the highest
          } else if (player.score === highestScore) {
            chipColor = "bg-yellow-500" // Highest score (even if negative)
          }

          const showBetBanner = shouldShowBetBanners() && player.bet !== null

          return (
            <div
              key={index}
              className="absolute"
              style={{
                left: `${left}px`,
                top: `${top}px`,
              }}
            >
              {/* Bet Banner */}
              {showBetBanner && (
                <div
                  className="absolute -top-12 left-1/2 transform -translate-x-1/2 bg-yellow-500 text-black px-3 py-1 rounded-md shadow-md z-10 whitespace-nowrap font-bold"
                  style={{
                    animation: "fadeIn 0.3s ease-in-out",
                  }}
                >
                  Bet: {player.bet}
                </div>
              )}

              <div
                className={`relative w-20 h-20 -ml-10 -mt-10 rounded-full flex items-center justify-center text-center shadow-md ${
                  players[currentTurn]?.name === player.name ? "bg-yellow-200" : "bg-gray-200"
                }`}
              >
                <div>
                  <p className="font-bold text-sm text-black">{player.name}</p>
                  {player.isOwner && <p className="text-xs text-gray-600">(Owner)</p>}
                </div>
                {/* Points Chip */}
                <div
                  className={`absolute -bottom-2 -left-2 w-8 h-8 rounded-full ${chipColor} flex items-center justify-center text-white text-xs font-bold shadow-md`}
                >
                  {player.score}
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
        {/* Your Bet/Win section */}
        <div className="w-1/3 mr-8">
          <h2 className="text-xl font-bold mb-2 text-center">Your Bets & Wins</h2>
          {!gameStarted ? (
            <div className="flex flex-col items-center mt-1">
              <p className="text-center">No bets and wins</p>
            </div>
          ) : currentPlayer && currentPlayer.bet === null ? (
            <div className="flex flex-col items-center space-y-2 mt-2">
              {isCurrentPlayerBettingTurn ? (
                <>
                  <div className="flex flex-col items-center space-y-2">
                    <Input
                      type="number"
                      min={0}
                      max={cardsThisRound}
                      value={betAmount !== null ? betAmount.toString() : ""}
                      onChange={(e) => {
                        const value = e.target.value
                        if (value === "" || value === "-") {
                          setBetAmount(null)
                        } else {
                          const numValue = Number.parseInt(value, 10)
                          if (!isNaN(numValue) && numValue >= 0 && numValue <= cardsThisRound) {
                            setBetAmount(numValue)
                          }
                        }
                      }}
                      className="w-20 text-center"
                    />
                    <Button onClick={handlePlaceBet}>Confirm Bet</Button>
                  </div>
                  {(() => {
                    const forbiddenBet = calculateForbiddenBet()
                    if (forbiddenBet !== null) {
                      return <p className="text-red-500 text-sm mt-2">You cannot bet {forbiddenBet}</p>
                    }
                    return null
                  })()}
                </>
              ) : (
                <p className="text-center text-yellow-600">
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
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center space-y-2 mt-10">
              <p className="text-center">Current round bet: {currentPlayer?.bet}</p>
              <p className="text-center">Current round wins: {currentPlayer?.roundWins || 0}</p>
            </div>
          )}
        </div>

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
                    !isCurrentPlayerTurn || isClearing || !isValidCardToPlay(card) || !safeGameData.allBetsPlaced
                  }
                  showBack={shouldShowCardBacks}
                  className={`${!isValidCardToPlay(card) || !safeGameData.allBetsPlaced ? "opacity-50" : ""}`}
                />
              ))
            ) : (
              <p>No cards in hand</p>
            )}
          </div>
          {gameStarted && currentRound <= 18 && (
            <p className="text-center mt-2 font-bold">
              {!safeGameData.allBetsPlaced ? (
                waitingForBetDelay ? (
                  <span className="text-blue-600">Preparing to start the round...</span>
                ) : isCurrentPlayerBettingTurn ? (
                  <span className="text-green-600">It's your turn to place a bet!</span>
                ) : (
                  <span className="text-yellow-600">
                    Waiting for{" "}
                    {currentBettingPlayerName.startsWith("Waiting")
                      ? players.find((p) => p.name !== currentPlayerName)?.name || "other players"
                      : currentBettingPlayerName}{" "}
                    to place their bet...
                  </span>
                )
              ) : isCurrentPlayerTurn ? (
                <span className="text-green-600">It's your turn! Select a card to play.</span>
              ) : (
                <span className="text-blue-600">
                  Waiting for {players[currentTurn]?.name || "next player"}'s turn...
                </span>
              )}
            </p>
          )}
          {errorMessage && <p className="text-red-600 text-center mt-2">{errorMessage}</p>}
        </div>
      </div>

      {/* Score Table */}
      <div className="max-w-5xl mx-auto mt-8 overflow-x-auto">
        <h2 className="text-2xl font-bold mb-4">Score Table</h2>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-white font-bold">Round</TableHead>
              {players.map((player) => (
                <TableHead key={player.name} colSpan={3} className="text-center text-white font-bold">
                  {player.name}
                </TableHead>
              ))}
            </TableRow>
            <TableRow>
              <TableHead></TableHead>
              {players.map((player) => (
                <React.Fragment key={player.name}>
                  <TableHead className="text-center">Bet</TableHead>
                  <TableHead className="text-center">Total</TableHead>
                  <TableHead className="text-center">Round</TableHead>
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
                  <TableCell>{round.roundName}</TableCell>
                  {players.map((player) => {
                    const playerScore: PlayerScore = round.scores[player.name] || {
                      cumulativePoints: 0,
                      roundPoints: 0,
                      bet: null,
                    }
                    return (
                      <React.Fragment key={player.name}>
                        <TableCell className="text-center">
                          {playerScore.bet !== null ? playerScore.bet : "-"}
                        </TableCell>
                        <TableCell className="text-center">{playerScore.cumulativePoints}</TableCell>
                        <TableCell
                          className={`text-center ${
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
                <TableCell colSpan={players.length * 3 + 1}>No scores available</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <GameResultsDialog isOpen={showResultsDialog} onClose={() => setShowResultsDialog(false)} players={players} />
      <PokerCardDialog
        isOpen={showPokerCardDialog}
        onClose={() => setShowPokerCardDialog(false)}
        onOptionSelect={handlePokerCardOptionSelect}
        isFirstCard={cardsOnTable.length === 0}
        isValidSimple={isValidSimplePlay()}
        availableOptions={cardsOnTable.length === 0 ? ["Trumps", "Poker", "Simple"] : ["Poker", "Simple"]}
      />

      {/* Add CSS for animations */}
      <style jsx global>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translate(-50%, -10px); }
          to { opacity: 1; transform: translate(-50%, 0); }
        }
      `}</style>
    </div>
  )
}

