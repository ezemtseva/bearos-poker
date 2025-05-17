"use client"

import { Dialog, DialogContent, DialogHeader, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import type { Player } from "../types/game"
import { useEffect } from "react"
import { useSound } from "@/hooks/use-sound"

interface GameResultsDialogProps {
  isOpen: boolean
  onClose: () => void
  players: Player[]
}

export default function GameResultsDialog({ isOpen, onClose, players }: GameResultsDialogProps) {
  const sortedPlayers = [...players].sort((a, b) => b.score - a.score)
  const winner = sortedPlayers[0]
  const { playSound } = useSound()

  // Play the game-over sound when the dialog opens
  useEffect(() => {
    if (isOpen) {
      console.log("GameResultsDialog opened - Playing game over sound")
      // Use a small timeout to ensure the sound plays after the dialog is visible
      const timer = setTimeout(() => {
        playSound("gameOver")
      }, 100)
      return () => clearTimeout(timer)
    }
  }, [isOpen, playSound])

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px] shadow-[0_0_15px_5px_rgba(255,215,0,0.7)]">
        <DialogHeader>
          <DialogDescription className="text-center text-lg font-bold text-gray-700">
            Congratulations to <span className="underline text-gray-900">{winner.name}</span>!
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <ul className="space-y-2">
            {sortedPlayers.map((player, index) => (
              <li
                key={player.name}
                className={`flex justify-between items-center ${index === 0 ? "font-bold text-primary" : ""}`}
              >
                <span>
                  {index + 1}. {player.name}
                </span>
                <span>{player.score} points</span>
              </li>
            ))}
          </ul>
        </div>
        <DialogFooter className="sm:justify-center">
          <Button onClick={onClose} className="w-[120px] h-[40px]">
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
