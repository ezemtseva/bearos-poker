"use client"

import { Dialog, DialogContent, DialogHeader, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import type { Player } from "../types/game"
import { useEffect } from "react"
import { useSound } from "@/hooks/use-sound"
import { useLocale } from "@/lib/locale-context"
import soundManager from "@/app/utils/sound"

const SKIN_GAME_OVER: Record<string, string> = {
  modniy_luk:  "/sounds/game-over (shopping).mp3",
  chechnia:    "/sounds/game-over (mucuraev).mp3",
  verstalibin: "/sounds/game-over (mercedes).mp3",
  bombardini:  "/sounds/game-over (aaa boshki).mp3",
}

interface GameResultsDialogProps {
  isOpen: boolean
  onClose: () => void
  players: Player[]
}

export default function GameResultsDialog({ isOpen, onClose, players }: GameResultsDialogProps) {
  const { t } = useLocale()
  const sortedPlayers = [...players].sort((a, b) => b.score - a.score)
  const winner = sortedPlayers[0]
  const { playSound } = useSound()

  // Play the game-over sound when the dialog opens
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        const skin = (() => { try { return localStorage.getItem("tableSkin") || "" } catch { return "" } })()
        const customPath = SKIN_GAME_OVER[skin]
        if (customPath) {
          soundManager.playFile(customPath)
        } else {
          playSound("gameOver")
        }
      }, 100)
      return () => clearTimeout(timer)
    }
  }, [isOpen, playSound])

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px] shadow-[0_0_15px_5px_rgba(255,215,0,0.7)]">
        <DialogHeader>
          <DialogDescription className="text-center text-lg font-bold text-white">
            {t("congratsTo")} <span className="underline text-yellow-300">{winner.name}</span>!
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <ul className="space-y-2">
            {sortedPlayers.map((player, index) => (
              <li
                key={player.name}
                className={`flex justify-between items-center ${index === 0 ? "font-bold text-yellow-300" : "text-gray-300"}`}
              >
                <span>
                  {index + 1}. {player.name}
                </span>
                <span>{player.score} {t("pts")}</span>
              </li>
            ))}
          </ul>
        </div>
        <DialogFooter className="sm:justify-center">
          <Button onClick={onClose} className="w-[120px] h-[40px]">
            {t("close")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
