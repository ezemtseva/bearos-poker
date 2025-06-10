"use client"

import { useCallback, useState, useEffect } from "react"
import soundManager from "@/app/utils/sound"

// Импортируй тип SoundName из sound.ts
type SoundName = Parameters<typeof soundManager.play>[0]

export function useSound() {
  const [muted, setMuted] = useState(soundManager.isMuted())
  const [volume, setVolumeState] = useState(soundManager.getVolume())

  useEffect(() => {
    setMuted(soundManager.isMuted())
    setVolumeState(soundManager.getVolume())
  }, [])

  const playSound = useCallback((soundName: SoundName) => {
    soundManager.play(soundName)
  }, [])

  const toggleMute = useCallback(() => {
    const newMuted = !soundManager.isMuted()
    soundManager.setMuted(newMuted)
    setMuted(newMuted)
  }, [])

  const setVolume = useCallback((newVolume: number) => {
    soundManager.setVolume(newVolume)
    setVolumeState(newVolume)
  }, [])

  return {
    playSound,
    muted,
    toggleMute,
    volume,
    setVolume,
  }
}
