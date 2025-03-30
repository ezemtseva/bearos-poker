"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { Volume2, VolumeX, Volume1, Volume } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useSound } from "@/hooks/use-sound"

export default function SoundToggle() {
  const { muted, toggleMute, volume, setVolume } = useSound()
  const [showVolumeControls, setShowVolumeControls] = useState(false)
  const controlsRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)

  // Show volume controls on hover
  const handleMouseEnter = () => {
    setShowVolumeControls(true)
  }

  const handleMouseLeave = () => {
    // Use a small delay to prevent flickering when moving between button and controls
    setTimeout(() => {
      if (!controlsRef.current?.matches(":hover") && !buttonRef.current?.matches(":hover")) {
        setShowVolumeControls(false)
      }
    }, 100)
  }

  // Close volume controls when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        controlsRef.current &&
        !controlsRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setShowVolumeControls(false)
      }
    }

    if (showVolumeControls) {
      document.addEventListener("click", handleClickOutside)
    }

    return () => {
      document.removeEventListener("click", handleClickOutside)
    }
  }, [showVolumeControls])

  // Get the appropriate volume icon based on current volume
  const getVolumeIcon = () => {
    if (muted) return <VolumeX size={20} />
    if (volume === 0) return <VolumeX size={20} />
    if (volume < 0.5) return <Volume size={20} />
    if (volume < 0.8) return <Volume1 size={20} />
    return <Volume2 size={20} />
  }

  const handleButtonClick = () => {
    toggleMute()
  }

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation()
    const newVolume = Number.parseFloat(e.target.value)
    setVolume(newVolume)
  }

  return (
    <div className="relative">
      <Button
        ref={buttonRef}
        variant="ghost"
        size="sm"
        onClick={handleButtonClick}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className="rounded-full w-10 h-10 p-0 bg-gray-800/50 hover:bg-gray-700/70"
        aria-label={muted ? "Unmute sounds" : "Mute sounds"}
        title={muted ? "Unmute" : "Mute"}
      >
        {getVolumeIcon()}
      </Button>

      {showVolumeControls && (
        <div
          ref={controlsRef}
          className="absolute right-0 top-12 bg-gray-800 p-3 rounded-md shadow-lg z-50"
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          <div className="flex items-center space-x-2">
            <VolumeX size={16} className="text-gray-400" />
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={volume}
              onChange={handleVolumeChange}
              className="w-24 h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer"
            />
            <Volume2 size={16} className="text-gray-400" />
          </div>
        </div>
      )}
    </div>
  )
}

