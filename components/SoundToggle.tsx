"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { Volume2, VolumeX, Volume1, Volume } from "lucide-react"
import { useSound } from "@/hooks/use-sound"
import { useLocale } from "@/lib/locale-context"

export function iconButtonClass(active: boolean) {
  return `w-11 h-11 rounded-full flex items-center justify-center border transition-colors flex-shrink-0 ${
    active
      ? "bg-bp-accent border-bp-accent text-bp-bg"
      : "bg-transparent border-bp-strong text-bp-text2 hover:text-bp-text hover:border-bp-muted"
  }`
}

export default function SoundToggle() {
  const { t } = useLocale()
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
    if (muted) return <VolumeX size={18} />
    if (volume === 0) return <VolumeX size={18} />
    if (volume < 0.5) return <Volume size={18} />
    if (volume < 0.8) return <Volume1 size={18} />
    return <Volume2 size={18} />
  }

  const handleButtonClick = () => {
    toggleMute()
  }

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation()
    const newVolume = Number.parseFloat(e.target.value)
    setVolume(newVolume)
  }

  const pct = muted ? 0 : Math.round(volume * 100)

  return (
    <div className="relative">
      <button
        type="button"
        ref={buttonRef}
        onClick={handleButtonClick}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className={iconButtonClass(showVolumeControls)}
        aria-label={muted ? "Unmute sounds" : "Mute sounds"}
        aria-expanded={showVolumeControls}
        title={muted ? "Unmute" : "Mute"}
      >
        {getVolumeIcon()}
      </button>

      {showVolumeControls && (
        <div
          ref={controlsRef}
          role="dialog"
          aria-label={t("sound")}
          className="absolute right-0 top-[54px] w-[280px] max-md:fixed max-md:left-4 max-md:right-4 max-md:top-[calc(var(--header-h)+8px)] max-md:w-auto bg-bp-surface2 border border-bp-strong rounded-2xl shadow-[0_24px_60px_rgba(0,0,0,0.6)] p-4 z-50 flex flex-col gap-3"
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          <div className="flex justify-between items-center">
            <span className="font-semibold text-[15px] text-bp-text">{t("sound")}</span>
            <span className="font-mono text-[13px] text-bp-text2">{pct}%</span>
          </div>
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={toggleMute}
              aria-label={muted ? "Unmute" : "Mute"}
              className={`w-9 h-9 rounded-full border border-bp-strong flex items-center justify-center flex-shrink-0 ${muted ? "bg-bp-accent text-bp-bg" : "bg-bp-surface3 text-bp-text2"}`}
            >
              <VolumeX size={16} />
            </button>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={volume}
              onChange={handleVolumeChange}
              aria-label={t("sound")}
              className="flex-1 cursor-pointer"
            />
          </div>
          <span className="text-xs text-bp-dim">{t("soundHint")}</span>
        </div>
      )}
    </div>
  )
}
