"use client"

import { useId, useState, useEffect } from "react"
import { CARD_BACK_SKINS } from "./SettingsPanel"

interface CardBackProps {
  className?: string
  size?: "normal" | "small" | "medium"
}

function readCardBackSkin(): string {
  try { return localStorage.getItem("cardBackSkin") || "black" } catch { return "black" }
}

export default function CardBack({ className = "", size = "normal" }: CardBackProps) {
  const sizeClass = size === "medium" ? "w-[62px] h-[93px] rounded-xl" : size === "small" ? "w-14 h-[84px] rounded-xl" : "w-24 h-36 rounded-2xl"
  const patternId = useId()
  const [skinId, setSkinId] = useState("black")

  useEffect(() => {
    setSkinId(readCardBackSkin())
    function handleSettingsChanged(e: Event) {
      const detail = (e as CustomEvent).detail
      if ("cardBackSkin" in detail) setSkinId(detail.cardBackSkin)
    }
    window.addEventListener("settingsChanged", handleSettingsChanged)
    return () => window.removeEventListener("settingsChanged", handleSettingsChanged)
  }, [])

  const skin = CARD_BACK_SKINS.find((s) => s.id === skinId) ?? CARD_BACK_SKINS[0]

  return (
    <div className={`${sizeClass} overflow-hidden border border-white/20 ${className}`}>
      {skin.type === "image" ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={skin.value} alt="card back" className="w-full h-full object-cover" />
      ) : (
        <svg width="100%" height="100%" viewBox="0 0 96 144" preserveAspectRatio="none" className="w-full h-full">
          <defs>
            <pattern id={patternId} width="12" height="12" patternUnits="userSpaceOnUse">
              <path d="M0 6 L6 0 L12 6 L6 12 Z" fill="none" stroke="rgba(255, 255, 255, 0.3)" strokeWidth="0.5" />
            </pattern>
          </defs>
          <clipPath id={`clip-${patternId}`}>
            <rect x="1" y="1" width="94" height="142" rx="7" ry="7" />
          </clipPath>
          <rect x="1" y="1" width="94" height="142" fill={skin.value} clipPath={`url(#clip-${patternId})`} />
          <rect x="1" y="1" width="94" height="142" fill={`url(#${patternId})`} clipPath={`url(#clip-${patternId})`} />
        </svg>
      )}
    </div>
  )
}
