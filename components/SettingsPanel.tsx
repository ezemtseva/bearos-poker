"use client"

import { useState, useEffect, useRef } from "react"
import { useSession } from "next-auth/react"
import { Settings, X } from "lucide-react"
import { useLocale } from "@/lib/locale-context"
import type { Locale } from "@/lib/translations"

const TABLE_SKINS = [
  { id: "blue", label: "Navy Blue", type: "color", value: "#0f4c81" },
  { id: "green", label: "Sage Green", type: "color", value: "#4a7c59" },
  { id: "teal", label: "Teal", type: "color", value: "#2d7d72" },
  { id: "slate", label: "Slate Blue", type: "color", value: "#4a6fa5" },
  { id: "purple", label: "Lavender", type: "color", value: "#6b5b95" },
  { id: "rose", label: "Dusty Rose", type: "color", value: "#8b4a6e" },
  { id: "mauve", label: "Mauve", type: "color", value: "#7d5a6b" },
  { id: "olive", label: "Olive", type: "color", value: "#5a6b2a" },
  { id: "burgundy", label: "Burgundy", type: "color", value: "#6b2d3e" },
  { id: "charcoal", label: "Charcoal", type: "color", value: "#3a3f4b" },
  { id: "modniy_luk", label: "Shopping Modniy Look", type: "image", value: "/table-skins/modniy_luk.jpg" },
  { id: "chechnia", label: "Chechnia", type: "image", value: "/table-skins/chechnia.png" },
  { id: "verstalibin", label: "Verstalibin", type: "image", value: "/table-skins/verstalibin.jpeg" },
  { id: "bombardini", label: "Bombardini Ronaldini", type: "image", value: "/table-skins/bombardini.png" },
] as const

const SEAT_SKINS = [
  { id: "gray",      label: "Gray",         value: "#374151" },
  { id: "navy",      label: "Navy",         value: "#152340" },
  { id: "forest",    label: "Forest",       value: "#143323" },
  { id: "crimson",   label: "Crimson",      value: "#3d1010" },
  { id: "plum",      label: "Plum",         value: "#2a1040" },
  { id: "teal",      label: "Teal",         value: "#0d2e2e" },
  { id: "midnight",  label: "Midnight",     value: "#111130" },
  { id: "mahogany",  label: "Mahogany",     value: "#2e1606" },
] as const

// radial-gradient: lighter center, dark vignette edges — same style as the original background photo
const ROOM_SKINS = [
  { id: "classic_blue",  label: "Classic Blue",   value: "radial-gradient(ellipse at center, #2e6bb0 0%, #050d1a 100%)" },
  { id: "deep_green",    label: "Deep Green",      value: "radial-gradient(ellipse at center, #2e7d50 0%, #040e07 100%)" },
  { id: "crimson",       label: "Crimson",         value: "radial-gradient(ellipse at center, #8b2a2a 0%, #0e0404 100%)" },
  { id: "plum",          label: "Plum",            value: "radial-gradient(ellipse at center, #6b2d8b 0%, #0a040e 100%)" },
  { id: "teal",          label: "Teal",            value: "radial-gradient(ellipse at center, #1a6b6b 0%, #020d0d 100%)" },
  { id: "midnight",      label: "Midnight",        value: "radial-gradient(ellipse at center, #2d2d7a 0%, #04040e 100%)" },
  { id: "mahogany",      label: "Mahogany",        value: "radial-gradient(ellipse at center, #7a3a10 0%, #0e0502 100%)" },
  { id: "noir",          label: "Noir",            value: "radial-gradient(ellipse at center, #3a3a3a 0%, #000000 100%)" },
] as const

const CARD_BACK_SKINS = [
  { id: "black", label: "Black", type: "color", value: "#000000" },
  { id: "navy", label: "Navy", type: "color", value: "#1a2e4a" },
  { id: "crimson", label: "Crimson", type: "color", value: "#6b1a1a" },
  { id: "forest", label: "Forest", type: "color", value: "#1a3d2b" },
  { id: "plum", label: "Plum", type: "color", value: "#3d1a4a" },
  { id: "midnight", label: "Midnight", type: "color", value: "#1a1a3d" },
  { id: "espresso", label: "Espresso", type: "color", value: "#2d1a0e" },
  { id: "slate_card", label: "Slate", type: "color", value: "#1e2a38" },
  { id: "modniy_luk_back", label: "Modniy Look", type: "image", value: "/table-skins/backside_modniy_luk.jpg" },
] as const

export type TableSkin = typeof TABLE_SKINS[number]["id"]
export type CardBackSkin = typeof CARD_BACK_SKINS[number]["id"]
export type RoomSkin = typeof ROOM_SKINS[number]["id"]
export type SeatSkin = typeof SEAT_SKINS[number]["id"]

function readBetBlink(): boolean {
  try { const v = localStorage.getItem("betBlinkEnabled"); return v === null ? false : v === "true" } catch { return false }
}

function readTableSkin(): string {
  try { return localStorage.getItem("tableSkin") || "blue" } catch { return "blue" }
}

function readCardBackSkin(): string {
  try { return localStorage.getItem("cardBackSkin") || "black" } catch { return "black" }
}

function readRoomSkin(): string {
  try { return localStorage.getItem("roomSkin") || "classic_blue" } catch { return "classic_blue" }
}

function readSeatSkin(): string {
  try { return localStorage.getItem("seatSkin") || "gray" } catch { return "gray" }
}

function saveSettingsToDB(patch: Record<string, unknown>) {
  fetch("/api/profile", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ settings: patch }),
  }).catch(() => {})
}

export default function SettingsPanel() {
  const { status } = useSession()
  const loggedIn = status === "authenticated"
  const { locale, setLocale, t } = useLocale()
  const [open, setOpen] = useState(false)
  const [betBlink, setBetBlink] = useState(false)
  const [tableSkin, setTableSkin] = useState("blue")
  const [cardBackSkin, setCardBackSkin] = useState("black")
  const [roomSkin, setRoomSkin] = useState("classic_blue")
  const [seatSkin, setSeatSkin] = useState("gray")
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setBetBlink(readBetBlink())
    setTableSkin(readTableSkin())
    setCardBackSkin(readCardBackSkin())
    setRoomSkin(readRoomSkin())
    setSeatSkin(readSeatSkin())
  }, [])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (open && panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [open])

  function toggleBetBlink(val: boolean) {
    setBetBlink(val)
    try { localStorage.setItem("betBlinkEnabled", String(val)) } catch {}
    window.dispatchEvent(new CustomEvent("settingsChanged", { detail: { betBlinkEnabled: val } }))
    if (loggedIn) saveSettingsToDB({ bet_blink_enabled: val })
  }

  function selectSkin(id: string) {
    setTableSkin(id)
    try { localStorage.setItem("tableSkin", id) } catch {}
    window.dispatchEvent(new CustomEvent("settingsChanged", { detail: { tableSkin: id } }))
    if (loggedIn) saveSettingsToDB({ table_skin: id })
  }

  function selectSeatSkin(id: string) {
    setSeatSkin(id)
    try { localStorage.setItem("seatSkin", id) } catch {}
    window.dispatchEvent(new CustomEvent("settingsChanged", { detail: { seatSkin: id } }))
    if (loggedIn) saveSettingsToDB({ seat_skin: id })
  }

  function selectRoomSkin(id: string) {
    setRoomSkin(id)
    try { localStorage.setItem("roomSkin", id) } catch {}
    window.dispatchEvent(new CustomEvent("settingsChanged", { detail: { roomSkin: id } }))
    if (loggedIn) saveSettingsToDB({ room_skin: id })
  }

  function selectCardBackSkin(id: string) {
    setCardBackSkin(id)
    try { localStorage.setItem("cardBackSkin", id) } catch {}
    window.dispatchEvent(new CustomEvent("settingsChanged", { detail: { cardBackSkin: id } }))
    if (loggedIn) saveSettingsToDB({ card_back_skin: id })
  }

  function selectLanguage(l: Locale) {
    setLocale(l)
    if (loggedIn) saveSettingsToDB({ language: l })
  }

  return (
    <div className="relative" ref={panelRef}>
      <button
        onClick={() => setOpen((v) => !v)}
        className={`rounded-full w-10 h-10 p-0 flex items-center justify-center transition-colors bg-gray-800/50 hover:bg-gray-700/70 ${open ? "text-white" : "text-gray-300"}`}
        title={t("settings")}
      >
        <Settings size={20} />
      </button>

      {open && (
        <div className="absolute right-0 top-12 w-80 bg-gray-800 border border-white/10 rounded-xl shadow-2xl z-50 p-4 max-h-[calc(100vh-80px)] overflow-y-auto">
          <div className="flex justify-between items-center mb-4">
            <span className="font-semibold text-white text-sm">{t("settings")}</span>
            <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-white">
              <X size={16} />
            </button>
          </div>

          {/* Language */}
          <div className="flex items-center justify-between mb-5">
            <div className="text-sm text-white">{t("language")}</div>
            <div className="flex gap-1">
              {(["en", "ru"] as Locale[]).map((l) => (
                <button
                  key={l}
                  onClick={() => selectLanguage(l)}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${locale === l ? "bg-blue-600 text-white" : "bg-gray-700 text-gray-300 hover:bg-gray-600"}`}
                >
                  {l.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-white/10 mb-4" />

          {/* Bet blink toggle */}
          <div className="flex items-center justify-between mb-5">
            <div>
              <div className="text-sm text-white">{t("bettingAlarm")}</div>
              <div className="text-xs text-gray-400">{t("bettingAlarmDesc")}</div>
            </div>
            <button
              onClick={() => toggleBetBlink(!betBlink)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${betBlink ? "bg-green-500" : "bg-gray-600"}`}
            >
              <span className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${betBlink ? "translate-x-6" : "translate-x-1"}`} />
            </button>
          </div>

          {/* Divider */}
          <div className="border-t border-white/10 mb-4" />

          {/* Room color */}
          <div className="mb-4">
            <div className="text-sm text-white mb-2">{t("roomColor")}</div>
            <div className="grid grid-cols-4 gap-2">
              {ROOM_SKINS.map((skin) => (
                <button
                  key={skin.id}
                  onClick={() => selectRoomSkin(skin.id)}
                  title={skin.label}
                  className={`relative rounded-lg overflow-hidden h-12 border-2 transition-all ${roomSkin === skin.id ? "border-white scale-105" : "border-transparent hover:border-white/40"}`}
                  style={{ background: skin.value }}
                >
                  {roomSkin === skin.id && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-3 h-3 rounded-full bg-white shadow" />
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-white/10 mb-4" />

          {/* Table skin */}
          <div className="mb-4">
            <div className="text-sm text-white mb-2">{t("tableSkin")}</div>
            <div className="grid grid-cols-4 gap-2">
              {TABLE_SKINS.map((skin) => (
                <button
                  key={skin.id}
                  onClick={() => selectSkin(skin.id)}
                  title={skin.label}
                  className={`relative rounded-lg overflow-hidden h-12 border-2 transition-all ${tableSkin === skin.id ? "border-white scale-105" : "border-transparent hover:border-white/40"}`}
                >
                  {skin.type === "color" ? (
                    <div className="w-full h-full" style={{ backgroundColor: skin.value }} />
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={skin.value} alt={skin.label} className="w-full h-full object-cover" />
                  )}
                  {tableSkin === skin.id && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-3 h-3 rounded-full bg-white shadow" />
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-white/10 mb-4" />

          {/* Card back skin */}
          <div>
            <div className="text-sm text-white mb-2">{t("cardBack")}</div>
            <div className="grid grid-cols-4 gap-2">
              {CARD_BACK_SKINS.map((skin) => (
                <button
                  key={skin.id}
                  onClick={() => selectCardBackSkin(skin.id)}
                  title={skin.label}
                  className={`relative rounded-lg overflow-hidden border-2 transition-all ${cardBackSkin === skin.id ? "border-white scale-105" : "border-transparent hover:border-white/40"}`}
                  style={{ aspectRatio: "2/3", height: "48px" }}
                >
                  {skin.type === "color" ? (
                    <div className="w-full h-full" style={{ backgroundColor: skin.value }}>
                      {/* Mini diamond pattern preview */}
                      <svg width="100%" height="100%" style={{ position: "absolute", inset: 0 }}>
                        <defs>
                          <pattern id={`preview-${skin.id}`} width="8" height="8" patternUnits="userSpaceOnUse">
                            <path d="M0 4 L4 0 L8 4 L4 8 Z" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="0.5" />
                          </pattern>
                        </defs>
                        <rect width="100%" height="100%" fill={`url(#preview-${skin.id})`} />
                      </svg>
                    </div>
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={skin.value} alt={skin.label} className="w-full h-full object-cover" />
                  )}
                  {cardBackSkin === skin.id && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-3 h-3 rounded-full bg-white shadow" />
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-white/10 mb-4 mt-4" />

          {/* Seat color */}
          <div>
            <div className="text-sm text-white mb-2">{t("seatColor")}</div>
            <div className="grid grid-cols-4 gap-2">
              {SEAT_SKINS.map((skin) => (
                <button
                  key={skin.id}
                  onClick={() => selectSeatSkin(skin.id)}
                  title={skin.label}
                  className={`relative rounded-lg overflow-hidden h-12 border-2 transition-all ${seatSkin === skin.id ? "border-white scale-105" : "border-transparent hover:border-white/40"}`}
                  style={{ backgroundColor: skin.value }}
                >
                  {seatSkin === skin.id && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-3 h-3 rounded-full bg-white shadow" />
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>

        </div>
      )}
    </div>
  )
}

export { TABLE_SKINS, CARD_BACK_SKINS, ROOM_SKINS, SEAT_SKINS }
