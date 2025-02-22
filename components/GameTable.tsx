"use client"

import { TableHeader } from "@/components/ui/table"
import { useState, useEffect } from "react"
import type { Player, Card, GameData, ScoreTableRow } from "../types/game"
import { Table, TableBody, TableCell, TableHead, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import PlayingCard from "./PlayingCard"

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
}: GameTableProps) {
  const [displayedCards, setDisplayedCards] = useState<Card[]>(cardsOnTable)
  const [isProcessingPlay, setIsProcessingPlay] = useState(false)

  useEffect(() => {
    setDisplayedCards(cardsOnTable)

    if (gameData.playEndTimestamp && !isProcessingPlay) {
      setIsProcessingPlay(true)
      const delay = 2000 // 2 seconds delay
      const timer = setTimeout(() => {
        setDisplayedCards([])
        setIsProcessingPlay(false)
      }, delay)
      return () => clearTimeout(timer)
    }
  }, [cardsOnTable, gameData.playEndTimestamp, isProcessingPlay])

  const currentPlayerName = localStorage.getItem("playerName")
  const currentPlayer = players.find((p) => p.name === currentPlayerName)
  const canStartGame = isOwner && players.length >= 2 && !gameStarted
  const isCurrentPlayerTurn = currentPlayer && gameData.players[gameData.currentTurn]?.name === currentPlayer.name

  const cardsThisRound = currentRound <= 6 ? currentRound : currentRound <= 12 ? 13 - currentRound : 19 - currentRound

  return (
    <div className="space-y-8">
      {/* Game Info */}
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-2">Bearos Poker</h1>
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
      <div className="relative w-[600px] h-[400px] mx-auto">
        <div className="absolute inset-0 bg-green-600 border-8 border-black rounded-[50%]"></div>
        {players.map((player, index) => {
          const angle = index * (360 / players.length) * (Math.PI / 180)
          const xRadius = 280
          const yRadius = 180
          const left = 300 + xRadius * Math.cos(angle)
          const top = 200 + yRadius * Math.sin(angle)

          return (
            <div
              key={index}
              className={`absolute w-20 h-20 -ml-10 -mt-10 rounded-full flex items-center justify-center text-center shadow-md ${
                players[currentTurn]?.name === player.name ? "bg-yellow-200" : "bg-gray-200"
              }`}
              style={{
                left: `${left}px`,
                top: `${top}px`,
              }}
            >
              <div>
                <p className="font-bold text-sm">{player.name}</p>
                {player.isOwner && <p className="text-xs text-green-700">(Owner)</p>}
              </div>
            </div>
          )
        })}

        {/* Cards on table */}
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 flex space-x-2">
          {displayedCards.map((card, index) => (
            <div key={index}>
              <PlayingCard suit={card.suit} value={card.value} disabled />
            </div>
          ))}
        </div>
      </div>

      {/* Player's hand */}
      {currentPlayer && gameStarted && (
        <div className="mt-8">
          <h2 className="text-xl font-bold mb-2">Your Hand</h2>
          <div className="flex justify-center space-x-2">
            {currentPlayer.hand && currentPlayer.hand.length > 0 ? (
              currentPlayer.hand.map((card, index) => (
                <PlayingCard
                  key={index}
                  suit={card.suit}
                  value={card.value}
                  onClick={() => onPlayCard(card)}
                  disabled={!isCurrentPlayerTurn || isProcessingPlay}
                />
              ))
            ) : (
              <p>No cards in hand</p>
            )}
          </div>
          {gameStarted && currentRound <= 18 && (
            <p className="text-center mt-2 font-bold">
              {isCurrentPlayerTurn ? (
                <span className="text-green-600">It's your turn! Select a card to play.</span>
              ) : (
                <span className="text-blue-600">Waiting for {players[currentTurn]?.name}'s turn...</span>
              )}
            </p>
          )}
        </div>
      )}

      {/* Score Table */}
      <div className="max-w-3xl mx-auto mt-8">
        <h2 className="text-2xl font-bold mb-4">Score Table</h2>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Round</TableHead>
              {players.map((player) => (
                <TableHead key={player.name}>{player.name}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {gameData.scoreTable && gameData.scoreTable.length > 0 ? (
              gameData.scoreTable.map((round: ScoreTableRow) => (
                <TableRow key={round.roundId}>
                  <TableCell>{round.roundName}</TableCell>
                  {players.map((player) => (
                    <TableCell key={player.name}>{(round.scores && round.scores[player.name]) || "-"}</TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={players.length + 1}>No scores available</TableCell>
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

