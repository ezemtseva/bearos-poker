"use client"

import { Dialog, DialogContent, DialogHeader, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import type { Player } from "../types/game"
import { useEffect, useRef } from "react"
import { useSound } from "@/hooks/use-sound"
import { useLocale } from "@/lib/locale-context"
import soundManager from "@/app/utils/sound"

const SKIN_GAME_OVER: Record<string, string> = {
  krug:        "/sounds/game-over (krug).mp3",
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
  const { playSound, stopSound } = useSound()
  const customAudioRef = useRef<HTMLAudioElement | null>(null)

  // Play the game-over sound when the dialog opens, stop when it closes
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        const skin = (() => { try { return localStorage.getItem("tableSkin") || "" } catch { return "" } })()
        const customPath = SKIN_GAME_OVER[skin]
        if (customPath) {
          const audio = new Audio(customPath)
          audio.volume = soundManager.getVolume()
          audio.play().catch(() => {})
          customAudioRef.current = audio
        } else {
          playSound("gameOver")
        }
      }, 100)
      return () => clearTimeout(timer)
    } else {
      // Stop all game-over sounds on close
      if (customAudioRef.current) {
        customAudioRef.current.pause()
        customAudioRef.current.currentTime = 0
        customAudioRef.current = null
      }
      stopSound("gameOver")
    }
  }, [isOpen, playSound, stopSound])

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[440px] border-2 border-bp-accent">
        <DialogHeader>
          <span className="bp-label text-center">{t("gameOver")}</span>
          <DialogDescription className="text-center font-display font-bold text-xl text-bp-text leading-snug">
            {t("congratsTo")} <span className="text-bp-accent">{winner.name}</span>
          </DialogDescription>
        </DialogHeader>
        <div className="py-2">
          <ul className="flex flex-col">
            {sortedPlayers.map((player, index) => (
              <li
                key={player.name}
                className={`flex justify-between items-center gap-3 py-2.5 ${index > 0 ? "border-t border-bp-divider" : ""}`}
              >
                <span className="flex items-center gap-3 min-w-0">
                  <span className={`w-11 text-center font-mono text-xs py-[5px] rounded-full flex-shrink-0 ${index === 0 ? "bg-bp-accent text-bp-bg" : "bg-bp-surface3 text-bp-text2"}`}>
                    {index + 1}
                  </span>
                  <span className={`truncate ${index === 0 ? "font-semibold text-bp-text" : "text-bp-text2"}`}>{player.name}</span>
                </span>
                <span className={`font-display font-bold flex-shrink-0 ${player.score < 0 ? "text-bp-warning" : index === 0 ? "text-bp-accent" : "text-bp-text"}`}>
                  {player.score} <span className="font-mono text-xs font-normal text-bp-muted">{t("pts")}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
        <DialogFooter className="sm:justify-center">
          <Button onClick={onClose} className="min-w-[140px] focus-visible:ring-0 focus-visible:ring-offset-0">
            {t("close")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
