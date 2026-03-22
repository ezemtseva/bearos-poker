"use client"

import { useEffect } from "react"
import { ROOM_SKINS } from "./SettingsPanel"

function getRoomSkinBackground(skinId: string): string {
  const skin = ROOM_SKINS.find((s) => s.id === skinId) ?? ROOM_SKINS[0]
  return skin.value
}

function readRoomSkin(): string {
  try { return localStorage.getItem("roomSkin") || "classic_blue" } catch { return "classic_blue" }
}

function applyRoomSkin(skinId: string) {
  document.body.style.backgroundImage = getRoomSkinBackground(skinId)
}

export default function RoomSkinApplier() {
  useEffect(() => {
    applyRoomSkin(readRoomSkin())

    function handleSettingsChanged(e: Event) {
      const detail = (e as CustomEvent).detail
      if ("roomSkin" in detail) applyRoomSkin(detail.roomSkin)
    }
    window.addEventListener("settingsChanged", handleSettingsChanged)
    return () => window.removeEventListener("settingsChanged", handleSettingsChanged)
  }, [])

  return null
}
