"use client"

import React from "react"
import { TableHeader } from "@/components/ui/table"
import { useState, useEffect } from "react"
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
  const { toast } = useToast()

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
    if (gameData.allCardsPlayed) {
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
  }, [cardsOnTable, gameData.allCardsPlayed])

  useEffect(() => {
    if (gameData.gameOver) {
      setShowResultsDialog(true)
    }
  }, [gameData.gameOver])

  const currentPlayerName = localStorage.getItem("playerName")
  const currentPlayer = players.find((p) => p.name === currentPlayerName)
  const canStartGame = isOwner && players.length >= 2 && !gameStarted
  const isCurrentPlayerTurn =
    currentPlayer && gameData.players[gameData.currentTurn]?.name === currentPlayer.name && gameStarted

  const cardsThisRound = currentRound <= 6 ? currentRound : currentRound <= 12 ? 13 - currentRound : 19 - currentRound

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

    const hasSuit = currentPlayer.hand.some((c) => c.suit === leadingSuit)

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
    if (!gameData.allBetsPlaced) {
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

    if (gameData.lastPlayedCard?.suit === "spades" && gameData.lastPlayedCard.value === 7) {
      if (gameData.lastPlayedCard.pokerOption === "Trumps") {
        const validCards = getValidCardsAfterTrumps(currentPlayer?.hand || [])
        if (!validCards.some((c) => c.suit === card.suit && c.value === card.value)) {
          toast({
            title: "Invalid Play",
            description: "You must play your highest trump card or highest card if you have no trumps.",
            variant: "destructive",
          })
          return
        }
      }
      // Remove special handling for 'Poker' option here
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

  const handlePlaceBet = async () => {
    if (betAmount === null || betAmount < 0 || betAmount > cardsThisRound) {
      toast({
        title: "Invalid Bet",
        description: `Please enter a bet between 0 and ${cardsThisRound}.`,
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

    const hasLeadingSuit = currentPlayer?.hand.some((c) => c.suit === leadingSuit)
    return !hasLeadingSuit
  }

  const isValidCardToPlay = (card: Card) => {
    if (
      gameData.lastPlayedCard?.suit === "spades" &&
      gameData.lastPlayedCard.value === 7 &&
      gameData.lastPlayedCard.pokerOption === "Trumps"
    ) {
      const validCards = getValidCardsAfterTrumps(currentPlayer?.hand || [])
      return validCards.some((c) => c.suit === card.suit && c.value === card.value)
    }

    // Special case: 7 of spades can be played when diamonds are the leading suit
    if (card.suit === "spades" && card.value === 7 && cardsOnTable.length > 0) {
      const leadingSuit = cardsOnTable[0].suit
      if (leadingSuit === "diamonds") {
        return true // Can always play 7 of spades when diamonds are the leading suit
      }

      const hasLeadingSuit = currentPlayer?.hand.some((c) => c.suit === leadingSuit)
      return !hasLeadingSuit // Otherwise, can play 7 of spades only if player doesn't have the leading suit
    }

    return isValidPlay(card)
  }

  const highestScore = Math.max(...players.map((p) => p.score))

  const isBlindRound = gameData.scoreTable[currentRound - 1]?.roundName === "B"
  const shouldShowCardBacks = isBlindRound && !gameData.allBetsPlaced

  console.log(
    "Current round:",
    gameData.currentRound,
    "Game over:",
    gameData.gameOver,
    "Show dialog:",
    showResultsDialog,
  )

  return (
    <div className="space-y-8">
      {/* Game Info */}
      <div className="text-center">
        <p>Table ID: {tableId}</p>
        {gameStarted ? (
          <>
            <p>Round: {currentRound}</p>
            <p>Play: {currentPlay}</p>
            <p>Current Turn: {players[currentTurn]?.name}</p>
            <p>Cards this round: {cardsThisRound}</p>
          </>
        ) : (
          <>
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
          const yRadius = 180
          const left = 400 + xRadius * Math.cos(angle)
          const top = 200 + yRadius * Math.sin(angle)

          // Determine chip color based on score
          let chipColor = player.score === highestScore ? "bg-yellow-500" : "bg-green-700"
          if (player.score === 0) {
            chipColor = "bg-gray-500"
          } else if (player.score < 0) {
            chipColor = "bg-red-600"
          }

          return (
            <div
              key={index}
              className="absolute"
              style={{
                left: `${left}px`,
                top: `${top}px`,
              }}
            >
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
                  gameData.highestCard &&
                  card.suit === gameData.highestCard.suit &&
                  card.value === gameData.highestCard.value
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

      {/* Betting and Player's hand */}
      <div className="flex justify-between mt-8">
        {/* Your Bet section */}
        <div className="w-1/3">
          <h2 className="text-xl font-bold mb-2 text-center">Your Bet</h2>
          {gameStarted && currentPlayer && currentPlayer.bet === null ? (
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
          ) : (
            <p className="text-center">Your bet: {currentPlayer?.bet}</p>
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
                  disabled={!isCurrentPlayerTurn || isClearing || !isValidCardToPlay(card) || !gameData.allBetsPlaced}
                  showBack={shouldShowCardBacks}
                  className={`${!isValidCardToPlay(card) || !gameData.allBetsPlaced ? "opacity-50" : ""}`}
                />
              ))
            ) : (
              <p>No cards in hand</p>
            )}
          </div>
          {gameStarted && currentRound <= 18 && (
            <p className="text-center mt-2 font-bold">
              {!gameData.allBetsPlaced ? (
                <span className="text-yellow-600">Make your bet and wait until all players bet the round.</span>
              ) : isCurrentPlayerTurn ? (
                <span className="text-green-600">It's your turn! Select a card to play.</span>
              ) : (
                <span className="text-blue-600">Waiting for {players[currentTurn]?.name}'s turn...</span>
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
            {gameData.scoreTable && gameData.scoreTable.length > 0 ? (
              gameData.scoreTable.map((round: ScoreTableRow) => (
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
    </div>
  )
}

