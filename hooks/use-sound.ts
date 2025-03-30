"use client"

import { useCallback, useState, useEffect } from "react"
import soundManager from "@/app/utils/sound"

export function useSound() {
  const [muted, setMuted] = useState(soundManager.isMuted())
  const [volume, setVolumeState] = useState(soundManager.getVolume())

  // Sync with soundManager on mount
  useEffect(() => {
    // Initialize state from soundManager
    setMuted(soundManager.isMuted())
    setVolumeState(soundManager.getVolume())
  }, [])

  // Function to play sounds
  const playSound = useCallback((soundName: string) => {
    soundManager.play(soundName)
  }, [])

  // Toggle mute function
  const toggleMute = useCallback(() => {
    const newMuted = !soundManager.isMuted()
    soundManager.setMuted(newMuted)
    setMuted(newMuted)
  }, [])

  // Set volume function
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

