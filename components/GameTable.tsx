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
  const { toast } = useToast()

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

  const currentPlayerName = localStorage.getItem("playerName")
  const currentPlayer = players.find((p) => p.name === currentPlayerName)
  const canStartGame = isOwner && players.length >= 2 && !gameStarted
  const isCurrentPlayerTurn =
    currentPlayer && gameData.players[gameData.currentTurn]?.name === currentPlayer.name && gameStarted

  const cardsThisRound = currentRound <= 6 ? currentRound : currentRound <= 12 ? 13 - currentRound : 19 - currentRound

  const isValidPlay = (card: Card): boolean => {
    if (currentPlayer?.hand.length === 1) return true // Player can play their last card regardless of suit

    if (cardsOnTable.length === 0) return true // First player can play any card

    const leadingSuit = cardsOnTable[0].suit
    const hasSuit = currentPlayer?.hand.some((c) => c.suit === leadingSuit)
    const hasTrumps = currentPlayer?.hand.some((c) => c.suit === "diamonds")

    if (card.suit === leadingSuit) return true // Following the leading suit
    if (!hasSuit && card.suit === "diamonds") return true // Playing a trump when no leading suit
    if (!hasSuit && !hasTrumps) return true // Can play any card if no leading suit or trumps

    return false // Invalid play
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

    if (!isValidPlay(card)) {
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

    setErrorMessage(null)

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

  const highestScore = Math.max(...players.map((p) => p.score))

  const isBlindRound = gameData.scoreTable[currentRound - 1]?.roundName === "B"
  const shouldShowCardBacks = isBlindRound && !gameData.allBetsPlaced

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
            <PlayingCard
              key={index}
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
            <p className="text-center"> {currentPlayer?.bet}</p>
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
                  disabled={!isCurrentPlayerTurn || isClearing || !isValidPlay(card) || !gameData.allBetsPlaced}
                  showBack={shouldShowCardBacks}
                  className={`${card.suit === "diamonds" ? "bg-red-100" : "bg-white"} ${
                    !isValidPlay(card) || !gameData.allBetsPlaced ? "opacity-50" : ""
                  }`}
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

      {/* Game Over Message */}
      {currentRound > 18 && (
        <div className="mt-8 text-center">
          <h2 className="text-3xl font-bold mb-4">Game Over!</h2>
          <h3 className="text-xl font-semibold mb-2">Final Scores:</h3>
          <ul>
            {players
              .sort((a, b) => b.score - a.score)
              .map((player, index) => (
                <li key={player.name} className={`text-lg ${index === 0 ? "font-bold text-green-600" : ""}`}>
                  {index === 0 && "🏆 "}
                  {player.name}: {player.score} points
                </li>
              ))}
          </ul>
          {isOwner && (
            <Button onClick={onStartGame} className="mt-4">
              Start New Game
            </Button>
          )}
        </div>
      )}
    </div>
  )
}

