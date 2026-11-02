"use client"

import React from "react"
import { useState, useEffect, useRef } from "react"
import type { Player, Card, GameData, ScoreTableRow, PlayerScore } from "../types/game"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import PlayingCard from "./PlayingCard"
import { useToast } from "@/hooks/use-toast"
import GameResultsDialog from "./GameResultsDialog"
import PokerCardDialog from "./PokerCardDialog"
// Add this at the top of the file, after the imports
import { useMemo } from "react"
// Add the import for ConfigureGameDialog near the top with other imports
import ConfigureGameDialog, { GameConfigFields, type GameLength } from "./ConfigureGameDialog"
// Add this import at the top with other imports
import { useSound } from "@/hooks/use-sound"
import { ChevronLeft, ChevronRight, ChevronDown, ChevronUp, SlidersHorizontal, Minus, Plus, X, Link2, ArrowRight } from "lucide-react"
import { TABLE_SKINS, SEAT_SKINS, CARD_BACK_SKINS } from "./SettingsPanel"
import { useSession } from "next-auth/react"
import { useViewport } from "@/hooks/use-viewport"
import { useLocale } from "@/lib/locale-context"

interface GameTableProps {
  tableId: string
  players: Player[]
  isOwner: boolean
  gameStarted: boolean
  currentRound: number
  currentPlay: number
  currentTurn: number
  cardsOnTable: Card[]
  onShare: () => void
  onStartGame: () => void
  onPlayCard: (card: Card) => void
  onPlaceBet: (bet: number) => void
  onConfigureGame: (gameLength: GameLength, hasGoldenRound: boolean, hasNoTrumps: boolean) => void | Promise<void>
  onSetAvatar: (avatar: string) => void
  onSendReaction: (emoji: string) => void
  gameData: GameData
  lastPlayedCard: Card | null
}

const EMOJI_LIST = [
  "💩","🤡","😈","👺","👻","💀","👹","🤑","🤥","😁",
  "🤣","🥲","🥹","😊","😇","😉","😌","😘","😜","🤪",
  "🤨","🤓","🥸","🥳","😭","😮‍💨","😤","🤬","🤯","🥶",
  "😱","🫣","🫡","🤔","🤭","🤫","🫠","💋","🫦","🧠",
  "💪","🫶","👍","👎","🖕","✌️","🤞","🫰","🤘","🫵",
  "🤌","🐻","🐼","🐻‍❄️","🐔","🦍","🍌","🍆","🍑",
]

const STAR_PATH = "M12 2l3 6.5 7 .8-5.2 4.8 1.4 7L12 17.6 5.8 21.1l1.4-7L2 9.3l7-.8z"

const SUIT_SYMBOLS: Record<Card["suit"], string> = { spades: "♠", hearts: "♥", diamonds: "♦", clubs: "♣" }

function StarIcon({ size = 14, color = "#D7FF3F" }: { size?: number; color?: string }) {
  return (
    <svg role="img" aria-label="Leader" width={size} height={size} viewBox="0 0 24 24" className="flex-shrink-0">
      <path d={STAR_PATH} fill={color} />
    </svg>
  )
}

// Small accent circle with a dark star at the top-right corner of a seat
function LeaderBadge({ size = 24 }: { size?: number }) {
  return (
    <span
      aria-label="Leader"
      className="absolute rounded-full bg-bp-accent flex items-center justify-center z-[1]"
      style={{ width: size, height: size, top: -size * 0.4, right: -size * 0.4 }}
    >
      <svg width={Math.round(size * 0.54)} height={Math.round(size * 0.54)} viewBox="0 0 24 24" aria-hidden="true">
        <path d={STAR_PATH} fill="#0B0C0F" />
      </svg>
    </span>
  )
}

export default function GameTable({
  tableId,
  players,
  isOwner,
  gameStarted,
  currentRound,
  currentPlay,
  currentTurn,
  cardsOnTable,
  onShare,
  onStartGame,
  onPlayCard,
  onPlaceBet,
  gameData,
  lastPlayedCard,
  onConfigureGame,
  onSetAvatar,
  onSendReaction,
}: GameTableProps) {
  const { isMobile, isTablet, width: viewportWidth } = useViewport()
  const { data: session } = useSession()
  const { t, locale } = useLocale()

  // Sync session name → localStorage only if no custom name was set during create/join
  useEffect(() => {
    if (session?.user?.name) {
      const sessionName = sessionStorage.getItem("playerName")
      if (!sessionName) {
        try { localStorage.setItem("playerName", session.user.name) } catch {}
      }
    }
  }, [session?.user?.name])

  // Load settings from DB if logged in (overrides localStorage)
  useEffect(() => {
    if (!session?.user?.id) return
    fetch("/api/profile")
      .then(r => r.json())
      .then(data => {
        if (!data.settings?.is_customized) return
        const s = data.settings
        try {
          const detail: Record<string, unknown> = {}
          if (s.custom_table_skin) { localStorage.setItem("customTableSkinUrl", s.custom_table_skin) }
          if (s.custom_card_skin)  { localStorage.setItem("customCardSkinUrl", s.custom_card_skin) }
          if (s.table_skin)    { localStorage.setItem("tableSkin", s.table_skin); setTableSkin(s.table_skin); detail.tableSkin = s.table_skin; if (s.custom_table_skin) detail.customTableSkinUrl = s.custom_table_skin }
          if (s.seat_skin)     { localStorage.setItem("seatSkin", s.seat_skin); setSeatSkin(s.seat_skin); detail.seatSkin = s.seat_skin }
          if (s.room_skin)     { localStorage.setItem("roomSkin", s.room_skin); detail.roomSkin = s.room_skin }
          if (s.card_back_skin){ localStorage.setItem("cardBackSkin", s.card_back_skin); detail.cardBackSkin = s.card_back_skin; if (s.custom_card_skin) detail.customCardSkinUrl = s.custom_card_skin }
          if (s.bet_blink_enabled !== undefined) { localStorage.setItem("betBlinkEnabled", String(s.bet_blink_enabled)); setBetBlinkEnabled(s.bet_blink_enabled); detail.betBlinkEnabled = s.bet_blink_enabled }
          if (Object.keys(detail).length > 0)
            window.dispatchEvent(new CustomEvent("settingsChanged", { detail }))
        } catch {}
      })
      .catch(() => {})
  }, [session?.user?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  // Add a new state variable for the dialog
  const [showConfigureDialog, setShowConfigureDialog] = useState(false)
  // Add a new state variable near the top of the component with the other state variables
  const [isPlayingCard, setIsPlayingCard] = useState(false)
  const [displayedCards, setDisplayedCards] = useState<Card[]>(cardsOnTable)
  const [isClearing, setIsClearing] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [betAmount, setBetAmount] = useState<number | null>(0)
  const [showResultsDialog, setShowResultsDialog] = useState(false)
  const [showPokerCardDialog, setShowPokerCardDialog] = useState(false)
  const [pokerCardOption, setPokerCardOption] = useState<"Trumps" | "Poker" | "Simple" | null>(null)
  const [showSuitPickerDialog, setShowSuitPickerDialog] = useState(false)
  const [lastKnownBettingPlayer, setLastKnownBettingPlayer] = useState<string>("Waiting for players...")
  const [stableBettingUI, setStableBettingUI] = useState<boolean>(false)
  const [scoreTableExpanded, setScoreTableExpanded] = useState(() => {
    try { const v = localStorage.getItem("scoreTableExpanded"); return v !== null ? v === "true" : true } catch { return true }
  })
  const [showScoreSettings, setShowScoreSettings] = useState(false)
  const [mobileNamePopup, setMobileNamePopup] = useState<string | null>(null)
  const [showWebEmojiPanel, setShowWebEmojiPanel] = useState(false)
  const [elapsedTime, setElapsedTime] = useState("0:00")
  const gameStartTimeRef = useRef<number | null>(null)
  const [scoreTablePlayerCount, setScoreTablePlayerCount] = useState(() => {
    try { const v = localStorage.getItem("scoreTablePlayerCount"); return v !== null ? Number(v) : (players.length || 1) } catch { return players.length || 1 }
  })
  const [scoreTablePosition, setScoreTablePosition] = useState<"left" | "right" | "bottom">(() => {
    try { const v = localStorage.getItem("scoreTablePosition"); return (v as "left" | "right" | "bottom") || "left" } catch { return "left" }
  })
  const [showAvatarPicker, setShowAvatarPicker] = useState(false)
  const [showMobileEmojiPanel, setShowMobileEmojiPanel] = useState(false)
  const [avatarPickerTab, setAvatarPickerTab] = useState<"image" | "emoji">("emoji")
  const [activeReactions, setActiveReactions] = useState<Map<string, { emoji: string; key: number }>>(new Map())
  const [betBlinkEnabled, setBetBlinkEnabled] = useState(false)
  const pokerHandsRef = useRef(0) // count rounds where 7♠ was in current player's hand
  const [tableSkin, setTableSkin] = useState("bearos")
  const [seatSkin, setSeatSkin] = useState("bearos")
  const [cardBackSkin, setCardBackSkin] = useState("black")
  const [cardsOnSeats, setCardsOnSeats] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const lastReactionTimestampRef = useRef<Map<string, number>>(new Map())
  const [betNotifications, setBetNotifications] = useState<Set<string>>(new Set())
  const prevBetsRef = useRef<Map<string, number | null>>(new Map())
  const betNotifFirstRender = useRef(true)
  const { toast } = useToast()
  // Add this inside the GameTable component, near the top with other hooks
  const { playSound } = useSound()

  // Load settings from localStorage on mount
  useEffect(() => {
    try {
      const blink = localStorage.getItem("betBlinkEnabled")
      if (blink !== null) setBetBlinkEnabled(blink === "true")
      const skin = localStorage.getItem("tableSkin")
      if (skin) setTableSkin(skin)
      const seat = localStorage.getItem("seatSkin")
      if (seat) setSeatSkin(seat)
      const cardBack = localStorage.getItem("cardBackSkin")
      if (cardBack) setCardBackSkin(cardBack)
      const cos = localStorage.getItem("cardsOnSeats")
      if (cos !== null) setCardsOnSeats(cos === "true")
    } catch {}
  }, [])

  // Listen for settings changes from SettingsPanel
  useEffect(() => {
    function handleSettingsChanged(e: Event) {
      const detail = (e as CustomEvent).detail
      if ("betBlinkEnabled" in detail) setBetBlinkEnabled(detail.betBlinkEnabled)
      if ("tableSkin" in detail) setTableSkin(detail.tableSkin)
      if ("seatSkin" in detail) setSeatSkin(detail.seatSkin)
      if ("cardBackSkin" in detail) setCardBackSkin(detail.cardBackSkin)
      if ("cardsOnSeats" in detail) setCardsOnSeats(detail.cardsOnSeats)
    }
    window.addEventListener("settingsChanged", handleSettingsChanged)
    return () => window.removeEventListener("settingsChanged", handleSettingsChanged)
  }, [])

  // Show floating bet notification above seat when a player places a bet
  useEffect(() => {
    if (betNotifFirstRender.current) {
      betNotifFirstRender.current = false
      prevBetsRef.current = new Map(players.map(p => [p.name, p.bet ?? null]))
      return
    }
    const newNames: string[] = []
    players.forEach(player => {
      const prev = prevBetsRef.current.get(player.name)
      if ((prev === null || prev === undefined) && player.bet !== null && player.bet !== undefined) {
        newNames.push(player.name)
      }
    })
    prevBetsRef.current = new Map(players.map(p => [p.name, p.bet ?? null]))
    if (newNames.length > 0) {
      setBetNotifications(prev => new Set(Array.from(prev).concat(newNames)))
      setTimeout(() => {
        setBetNotifications(prev => {
          const next = new Set(prev)
          newNames.forEach(name => next.delete(name))
          return next
        })
      }, 2000)
    }
  }, [players])

  // Game timer
  useEffect(() => {
    if (gameStarted && gameStartTimeRef.current === null) {
      gameStartTimeRef.current = Date.now()
    }
    if (!gameStarted) {
      gameStartTimeRef.current = null
      setElapsedTime("0:00")
      return
    }
    const interval = setInterval(() => {
      if (!gameStartTimeRef.current) return
      const secs = Math.floor((Date.now() - gameStartTimeRef.current) / 1000)
      const m = Math.floor(secs / 60)
      const s = secs % 60
      setElapsedTime(`${m}:${s.toString().padStart(2, "0")}`)
    }, 1000)
    return () => clearInterval(interval)
  }, [gameStarted])

  // Persist score table settings to localStorage
  useEffect(() => { try { localStorage.setItem("scoreTableExpanded", String(scoreTableExpanded)) } catch {} }, [scoreTableExpanded])
  useEffect(() => { try { localStorage.setItem("scoreTablePlayerCount", String(scoreTablePlayerCount)) } catch {} }, [scoreTablePlayerCount])
  useEffect(() => { try { localStorage.setItem("scoreTablePosition", scoreTablePosition) } catch {} }, [scoreTablePosition])

  // Auto-expand visible player count when new players join
  useEffect(() => {
    if (players.length > scoreTablePlayerCount) {
      setScoreTablePlayerCount(players.length)
    }
  }, [players.length])

  // Track emoji reactions from other players
  useEffect(() => {
    players.forEach((player) => {
      if (!player.reaction) return
      const { emoji, timestamp } = player.reaction
      const lastSeen = lastReactionTimestampRef.current.get(player.name)
      if (lastSeen !== timestamp && Date.now() - timestamp < 5000) {
        lastReactionTimestampRef.current.set(player.name, timestamp)
        setActiveReactions((prev) => {
          const next = new Map(prev)
          next.set(player.name, { emoji, key: timestamp })
          return next
        })
        setTimeout(() => {
          setActiveReactions((prev) => {
            const next = new Map(prev)
            next.delete(player.name)
            return next
          })
        }, 3000)
      }
    })
  }, [players])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement("canvas")
        canvas.width = 64
        canvas.height = 64
        const ctx = canvas.getContext("2d")!
        ctx.fillStyle = "#ffffff"
        ctx.fillRect(0, 0, 64, 64)
        ctx.drawImage(img, 0, 0, 64, 64)
        const base64 = canvas.toDataURL("image/jpeg", 0.7)
        onSetAvatar(base64)
        setShowAvatarPicker(false)
      }
      img.src = ev.target?.result as string
    }
    reader.readAsDataURL(file)
    e.target.value = ""
  }

  // Refs to track stable state across renders
  const currentRoundRef = useRef<number>(currentRound)
  const bettingUITimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const lastBettingTurnRef = useRef<number | null>(null)

  // Safely handle potentially undefined gameData
  const safeGameData = gameData || {
    tableId: "",
    players: [],
    gameStarted: false,
    currentRound: 0,
    currentPlay: 0,
    currentTurn: 0,
    cardsOnTable: [],
    deck: [],
    scoreTable: [],
    allCardsPlayedTimestamp: null,
    playEndTimestamp: null,
    lastPlayedCard: null,
    allCardsPlayed: false,
    highestCard: null,
    roundStartPlayerIndex: 0,
    allBetsPlaced: false,
    gameOver: false,
    currentBettingTurn: undefined,
    betsPlacedTimestamp: null,
    gameLength: "short",
    hasGoldenRound: false,
  }

  // Get current player information early — sessionStorage takes priority (set during create/join)
  const currentPlayerName = sessionStorage.getItem("playerName") || localStorage.getItem("playerName")
  const currentPlayer = players.find((p) => p.name === currentPlayerName)

  // Track poker hands (7♠ in current player's hand each round)
  const prevHandLengthRef = useRef(0)
  useEffect(() => {
    if (!currentPlayer?.hand) return
    const handLen = currentPlayer.hand.length
    if (handLen > prevHandLengthRef.current) {
      if (currentPlayer.hand.some((c) => c.suit === "spades" && c.value === 7)) {
        pokerHandsRef.current += 1
      }
    }
    prevHandLengthRef.current = handLen
  }, [currentPlayer?.hand]) // eslint-disable-line react-hooks/exhaustive-deps

  const canStartGame = isOwner && players.length >= 2 && !gameStarted
  const isCurrentPlayerTurn =
    currentPlayer &&
    safeGameData.players &&
    safeGameData.players[safeGameData.currentTurn] &&
    safeGameData.players[safeGameData.currentTurn].name === currentPlayer.name &&
    gameStarted

  // Check if all players have placed bets
  const allPlayersHaveBet = players.every((p) => p.bet !== null)
  const waitingForBetDelay = allPlayersHaveBet && !safeGameData.allBetsPlaced

  // Track round changes to reset betting UI state
  useEffect(() => {
    if (currentRound !== currentRoundRef.current) {
      console.log(`Round changed from ${currentRoundRef.current} to ${currentRound}`)
      currentRoundRef.current = currentRound
      setStableBettingUI(false)
      lastBettingTurnRef.current = null

      // Clear any pending timeout
      if (bettingUITimeoutRef.current) {
        clearTimeout(bettingUITimeoutRef.current)
        bettingUITimeoutRef.current = null
      }
    }
  }, [currentRound])

  // Track the current betting player in a useEffect to avoid infinite loops
  useEffect(() => {
    // Only update the betting player if we're in the betting phase
    if (
      gameStarted &&
      !safeGameData.allBetsPlaced &&
      !allPlayersHaveBet &&
      safeGameData.currentBettingTurn !== undefined &&
      typeof safeGameData.currentBettingTurn === "number" &&
      safeGameData.currentBettingTurn >= 0 &&
      safeGameData.currentBettingTurn < players.length
    ) {
      const playerName = players[safeGameData.currentBettingTurn].name
      if (playerName && playerName !== "Waiting for players...") {
        setLastKnownBettingPlayer(playerName)

        // Store the current betting turn
        lastBettingTurnRef.current = safeGameData.currentBettingTurn

        // Determine if it's the current player's turn to bet
        const isCurrentPlayerTurn = playerName === currentPlayerName

        // If it's the current player's turn, stabilize the UI immediately
        if (isCurrentPlayerTurn && currentPlayer?.bet === null) {
          setStableBettingUI(true)

          // Clear any pending timeout
          if (bettingUITimeoutRef.current) {
            clearTimeout(bettingUITimeoutRef.current)
            bettingUITimeoutRef.current = null
          }
        }
      }
    }

    // If all players have bet, make sure we show the transition message
    if (allPlayersHaveBet && !safeGameData.allBetsPlaced) {
      setStableBettingUI(false)
      if (bettingUITimeoutRef.current) {
        clearTimeout(bettingUITimeoutRef.current)
        bettingUITimeoutRef.current = null
      }
    }
  }, [
    gameStarted,
    safeGameData.currentBettingTurn,
    players,
    safeGameData.allBetsPlaced,
    allPlayersHaveBet,
    currentPlayer,
    currentPlayerName,
  ])

  // Add this near the top of the component, where other useEffects are defined
  useEffect(() => {
    // Log the current betting state whenever it changes
    if (gameStarted) {
      console.log("Betting state:", {
        currentBettingTurn: safeGameData.currentBettingTurn,
        allBetsPlaced: safeGameData.allBetsPlaced,
        allPlayersHaveBet,
        currentPlayerName,
        lastKnownBettingPlayer,
        stableBettingUI,
      })
    }
  }, [
    gameStarted,
    safeGameData.currentBettingTurn,
    safeGameData.allBetsPlaced,
    allPlayersHaveBet,
    currentPlayerName,
    lastKnownBettingPlayer,
    stableBettingUI,
  ])

  const isCurrentRoundNoTrumps = safeGameData.scoreTable?.[currentRound - 1]?.roundName === "NT"
  const isNoSuitRound = isCurrentRoundNoTrumps

  const getValidCardsAfterTrumps = (hand: Card[], requestedSuit?: string): Card[] => {
    // In no-trumps rounds: player must play highest card of requestedSuit, or any card if they don't have it
    if (isCurrentRoundNoTrumps) {
      if (requestedSuit) {
        const suitCards = hand.filter((c) => c.suit === requestedSuit)
        if (suitCards.length > 0) {
          const highest = suitCards.reduce((max, c) => (c.value > max.value ? c : max))
          return [highest]
        }
        return hand // no cards of requested suit — any card allowed
      }
      const highestValue = Math.max(...hand.map((c) => c.value))
      return hand.filter((c) => c.value === highestValue)
    }
    const diamonds = hand.filter((c) => c.suit === "diamonds")
    if (diamonds.length > 0) {
      const highestDiamond = diamonds.reduce((max, card) => (card.value > max.value ? card : max), diamonds[0])
      return [highestDiamond]
    }
    // If no diamonds, return the highest card(s) of any suit
    const highestValue = Math.max(...hand.map((c) => c.value))
    return hand.filter((c) => c.value === highestValue)
  }

  useEffect(() => {
    let timer: NodeJS.Timeout | null = null

    // Check for new round or new play - always clear cards in these cases
    if ((safeGameData.currentRound > 0 && safeGameData.currentPlay === 1) || safeGameData.cardsOnTable.length === 0) {
      console.log("GameTable: Clearing displayed cards for new round/play")
      setDisplayedCards([])
      setIsClearing(false)
      return
    }

    // For normal gameplay, show the cards on the table
    setDisplayedCards(cardsOnTable)
    setIsClearing(false)

    // Only set up clearing logic if all cards have been played
    if (safeGameData.allCardsPlayed) {
      setIsClearing(true)

      // Use a slightly longer timeout than the server (2.5s vs 2s)
      // to ensure we don't clear cards before the server processes them
      timer = setTimeout(() => {
        setIsClearing(false)
        setDisplayedCards([])
      }, 2500)
    }

    // Clean up the timer when component unmounts or dependencies change
    return () => {
      if (timer) {
        clearTimeout(timer)
      }
    }
  }, [cardsOnTable, safeGameData.allCardsPlayed, safeGameData.currentRound, safeGameData.currentPlay])

  useEffect(() => {
    if (safeGameData.gameOver) {
      console.log("Game over detected in GameTable - showing results dialog")
      setShowResultsDialog(true)

      // Record game history for logged-in users
      if (session?.user?.id) {
        const currentPlayerName = localStorage.getItem("playerName")

        // Compute each player's total score
        const playerTotals: Record<string, number> = {}
        for (const row of (safeGameData.scoreTable ?? [])) {
          for (const [name, s] of Object.entries(row.scores ?? {})) {
            playerTotals[name] = (playerTotals[name] ?? 0) + ((s as PlayerScore).roundPoints ?? 0)
          }
        }

        // Sort players by score descending to determine places
        const sorted = Object.entries(playerTotals).sort((a, b) => b[1] - a[1])
        const playersData = sorted.map(([name, score], idx) => ({ name, score, place: idx + 1 }))

        const finalScore = playerTotals[currentPlayerName ?? ""] ?? 0
        const place = playersData.findIndex(p => p.name === currentPlayerName) + 1
        const isWinner = place === 1 && playersData.length > 0

        fetch("/api/game/history", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tableId,
            playerName: currentPlayerName,
            totalRounds: safeGameData.currentRound,
            finalScore,
            playersCount: players.length,
            gameLength: safeGameData.gameLength ?? "basic",
            isWinner,
            pokerHands: players.find(p => p.name === currentPlayerName)?.pokerHands ?? 0,
            playersData,
            place,
          }),
        }).catch(() => {})
      }
    }
  }, [safeGameData.gameOver]) // eslint-disable-line react-hooks/exhaustive-deps


  // Add a function to get the total number of rounds based on game length
  const getTotalRounds = (gameLength: GameLength, hasGoldenRound = false, hasNoTrumps = false): number => {
    let base: number
    switch (gameLength) {
      case "short": base = 18; break
      case "basic": base = 22; break
      case "long": base = 28; break
      default: base = 18
    }
    if (hasNoTrumps) base += 6
    return hasGoldenRound ? base + 1 : base
  }

  // Add a function to get the round names based on game length
  const getRoundNames = (gameLength: GameLength, hasNoTrumps = false, hasGoldenRound = false): string[] => {
    let rounds: string[]
    switch (gameLength) {
      case "short":
        rounds = ["1", "2", "3", "4", "5", "6", "B", "B", "B", "B", "B", "B", "6", "5", "4", "3", "2", "1"]
        break
      case "basic":
        rounds = ["1", "2", "3", "4", "5", "6", "6", "6", "B", "B", "B", "B", "B", "B", "6", "6", "6", "5", "4", "3", "2", "1"]
        break
      case "long":
        rounds = ["1", "2", "3", "4", "5", "6", "6", "6", "6", "6", "6", "B", "B", "B", "B", "B", "B", "6", "6", "6", "6", "6", "6", "5", "4", "3", "2", "1"]
        break
      default:
        rounds = ["1", "2", "3", "4", "5", "6", "B", "B", "B", "B", "B", "B", "6", "5", "4", "3", "2", "1"]
    }
    if (hasNoTrumps) rounds.push("NT", "NT", "NT", "NT", "NT", "NT")
    if (hasGoldenRound) rounds.push("G")
    return rounds
  }

  // Update the cardsThisRound calculation to use the game length
  const cardsThisRound = useMemo(() => {
    if (!gameStarted || currentRound <= 0) return 0

    const gameLength = safeGameData.gameLength || "short"
    const roundNames = getRoundNames(gameLength, safeGameData.hasNoTrumps || false, safeGameData.hasGoldenRound || false)
    if (currentRound > roundNames.length) return 0

    const roundName = roundNames[currentRound - 1]
    if (roundName === "B" || roundName === "NT") return 6
    if (roundName === "G") return 1
    return Number.parseInt(roundName, 10)
  }, [gameStarted, currentRound, safeGameData.gameLength, safeGameData.hasNoTrumps, safeGameData.hasGoldenRound])

  const isValidPlay = (card: Card): boolean => {
    if (!currentPlayer) return false

    if (currentPlayer.hand.length === 1) return true // Player can play their last card regardless of suit

    if (cardsOnTable.length === 0) return true // First player can play any card

    const firstCard = cardsOnTable[0]
    const leadingSuit = firstCard.suit

    // Special case: 7 of spades can be played when diamonds are the leading suit
    if (card.suit === "spades" && card.value === 7) {
      return true // 7 of spades can now be played anytime (with Poker or Simple options)
    }

    // Special case for 7 of spades with 'Poker' option as the first card
    if (firstCard.suit === "spades" && firstCard.value === 7 && firstCard.pokerOption === "Poker") {
      return true // Any card can be played
    }

    // Check if player has any cards of the leading suit
    const hasSuit = currentPlayer.hand.some((c) => c.suit === leadingSuit && !(c.suit === "spades" && c.value === 7))

    if (hasSuit) {
      return card.suit === leadingSuit // Must follow suit if possible (except for 7 of spades which is handled above)
    }

    // In no-trumps rounds there are no trumps to follow
    if (!isCurrentRoundNoTrumps) {
      const hasTrumps = currentPlayer.hand.some((c) => c.suit === "diamonds")
      if (hasTrumps) {
        return card.suit === "diamonds"
      }
    }

    // If player has neither the leading suit nor trumps, they can play any card
    return true
  }

  // Modify the handlePlayCard function to check and set the isPlayingCard state
  const handlePlayCard = async (card: Card) => {
    // If a card play is already in progress, ignore additional clicks
    if (isPlayingCard) {
      return
    }

    if (!safeGameData.allBetsPlaced && !allPlayersHaveBet) {
      return
    }

    // For 7 of spades, show the dialog and play special card sound
    if (card.suit === "spades" && card.value === 7) {
      let availableOptions = ["Poker", "Simple"]

      // If it's the first card, Trumps is also available
      if (cardsOnTable.length === 0) {
        availableOptions = ["Trumps", "Poker", "Simple"]
      }

      setPokerCardOption(null)
      setShowPokerCardDialog(true)
      return
    }

    // Check if 7 of spades with 'Trumps' option is on the table
    const sevenOfSpadesWithTrumps = cardsOnTable.find(
      (c) => c.suit === "spades" && c.value === 7 && c.pokerOption === "Trumps",
    )
    if (sevenOfSpadesWithTrumps) {
      const validCards = getValidCardsAfterTrumps(currentPlayer?.hand || [], sevenOfSpadesWithTrumps.requestedSuit)
      if (!validCards.some((c) => c.suit === card.suit && c.value === card.value)) {
        return
      }
    } else if (!isValidPlay(card)) {
      setErrorMessage(t("mustFollowSuit"))
      return
    }

    // Set the playing card state to true to prevent multiple clicks
    setIsPlayingCard(true)

    // Immediately show the card on the table for the current player
    // Create a temporary local copy of the card with the player's name
    if (currentPlayerName) {
      const localCard: Card = {
        ...card,
        playerName: currentPlayerName,
      }

      // Update the displayed cards immediately for the current player
      setDisplayedCards([...displayedCards, localCard])

      // Remove the card from the player's hand locally
      if (currentPlayer) {
        const updatedPlayer = {
          ...currentPlayer,
          hand: currentPlayer.hand.filter((c) => !(c.suit === card.suit && c.value === card.value)),
        }

        // Create a local update of the game state
        const localPlayers = [...players]
        const playerIndex = localPlayers.findIndex((p) => p.name === currentPlayerName)
        if (playerIndex !== -1) {
          localPlayers[playerIndex] = updatedPlayer
        }
      }
    }

    // Then send the actual request to the server
    await playCard(card)
  }

  // Modify the playCard function to reset the isPlayingCard state
  const playCard = async (card: Card, pokerOption?: "Trumps" | "Poker" | "Simple", requestedSuit?: "spades" | "hearts" | "diamonds" | "clubs") => {
    setErrorMessage(null)

    // For 7 of spades with poker option, show it immediately
    if (card.suit === "spades" && card.value === 7 && pokerOption && currentPlayerName) {
      // Create a temporary local copy of the card with the player's name and poker option
      const localCard: Card = {
        ...card,
        playerName: currentPlayerName,
        pokerOption,
        ...(requestedSuit ? { requestedSuit } : {}),
      }

      // Update the displayed cards immediately for the current player
      setDisplayedCards([...displayedCards, localCard])

      // Remove the card from the player's hand locally
      if (currentPlayer) {
        const updatedPlayer = {
          ...currentPlayer,
          hand: currentPlayer.hand.filter((c) => !(c.suit === card.suit && c.value === card.value)),
        }

        // Create a local update of the game state
        const localPlayers = [...players]
        const playerIndex = localPlayers.findIndex((p) => p.name === currentPlayerName)
        if (playerIndex !== -1) {
          localPlayers[playerIndex] = updatedPlayer
        }
      }
    }

    try {
      const response = await fetch("/api/game/play-card", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ tableId, playerName: currentPlayerName, card, pokerOption, requestedSuit }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || t("failedToPlayCard"))
      }

      const data = await response.json()
      console.log("Card played. Received data:", data)
      // The game state will be updated through the SSE connection

    } catch (error) {
      console.error("Error playing card:", error)
      toast({
        title: t("cannotPlayCard"),
        description: error instanceof Error ? error.message : t("failedToPlayCard"),
        variant: "destructive",
      })

      // If there was an error, revert the local changes
      setDisplayedCards(cardsOnTable)
    } finally {
      // Reset the playing card state regardless of success or failure
      setIsPlayingCard(false)
    }
  }

  const calculateForbiddenBet = (): number | null => {
    if (
      !gameStarted ||
      !safeGameData.scoreTable ||
      currentRound <= 0 ||
      currentRound > safeGameData.scoreTable.length
    ) {
      return null
    }

    // Get the current round's score table
    const currentRoundScores = safeGameData.scoreTable[currentRound - 1]
    if (!currentRoundScores) return null

    // Calculate the sum of all existing bets
    let totalBets = 0
    let playerCount = 0

    for (const playerName in currentRoundScores.scores) {
      const playerScore = currentRoundScores.scores[playerName]
      if (playerScore && playerScore.bet !== null) {
        totalBets += playerScore.bet
        playerCount++
      }
    }

    // If all players except the current one have placed bets
    if (playerCount === players.length - 1) {
      // The forbidden bet is the value that would make the total equal to cardsThisRound
      const forbiddenBet = cardsThisRound - totalBets
      // Only return a forbidden bet if it's within the valid range
      if (forbiddenBet >= 0 && forbiddenBet <= cardsThisRound) {
        return forbiddenBet
      }
    }

    return null
  }

  // Modify the handlePlaceBet function to remove the local sound playing
  const handlePlaceBet = () => {
    if (betAmount === null || betAmount < 0 || betAmount > cardsThisRound) {
      toast({
        title: t("invalidBet"),
        variant: "destructive",
      })
      return
    }

    const forbiddenBet = calculateForbiddenBet()
    if (forbiddenBet !== null && betAmount === forbiddenBet) {
      toast({
        title: t("invalidBet"),
        variant: "destructive",
      })
      return
    }

    // Remove the playSound("placeBet") call here since it will be played for all players in the Game component

    onPlaceBet(betAmount)
  }

  // Add sound to the handlePokerCardOptionSelect function
  const handlePokerCardOptionSelect = (option: "Trumps" | "Poker" | "Simple") => {
    setPokerCardOption(option)
    setShowPokerCardDialog(false)
    // In no-trumps round with Trumps option: ask player to choose a suit first
    if (option === "Trumps" && isCurrentRoundNoTrumps) {
      setShowSuitPickerDialog(true)
      return
    }
    setIsPlayingCard(true)
    playSound("playCard")
    playCard({ suit: "spades", value: 7 }, option)
  }

  const handleSuitSelected = (suit: "spades" | "hearts" | "diamonds" | "clubs") => {
    setShowSuitPickerDialog(false)
    setIsPlayingCard(true)
    playSound("playCard")
    playCard({ suit: "spades", value: 7 }, "Trumps", suit)
  }

  const isValidSimplePlay = () => {
    // Simple option is now always valid for 7 of spades
    return true
  }

  const isValidCardToPlay = (card: Card) => {
    // Check if 7 of spades with 'Trumps' option is on the table
    const sevenOfSpadesWithTrumps = cardsOnTable.find(
      (c) => c.suit === "spades" && c.value === 7 && c.pokerOption === "Trumps",
    )
    if (sevenOfSpadesWithTrumps) {
      const validCards = getValidCardsAfterTrumps(currentPlayer?.hand || [], sevenOfSpadesWithTrumps.requestedSuit)
      return validCards.some((c) => c.suit === card.suit && c.value === card.value)
    }

    // Add this new check: Special case for 7 of spades with 'Poker' option as the first card
    if (
      cardsOnTable.length > 0 &&
      cardsOnTable[0].suit === "spades" &&
      cardsOnTable[0].value === 7 &&
      cardsOnTable[0].pokerOption === "Poker"
    ) {
      return true // Any card can be played in response to 7 of spades with 'Poker' option
    }

    // Special case: 7 of spades can always be played (except when Trumps is active)
    if (card.suit === "spades" && card.value === 7) {
      return true // 7 of spades can now be played anytime
    }

    // For diamond cards when spades is the leading suit
    if (card.suit === "diamonds" && cardsOnTable.length > 0) {
      const leadingSuit = cardsOnTable[0].suit
      if (leadingSuit === "spades") {
        // Check if player has any spades other than 7 of spades
        const hasRegularSpades = currentPlayer?.hand.some(
          (c) => c.suit === "spades" && !(c.suit === "spades" && c.value === 7),
        )
        return !hasRegularSpades // Can play diamonds if player doesn't have regular spades
      }
    }

    return isValidPlay(card)
  }

  // Replace the existing highestScore calculation with:
  const highestScore = useMemo(() => {
    return Math.max(...(players.length > 0 ? players.map((p) => p.score) : [0]))
  }, [players])

  // Replace the existing isBlindRound calculation with:
  const isBlindRound = useMemo(() => {
    return (
      safeGameData.scoreTable &&
      safeGameData.scoreTable.length > 0 &&
      currentRound > 0 &&
      currentRound <= safeGameData.scoreTable.length &&
      safeGameData.scoreTable[currentRound - 1]?.roundName === "B"
    )
  }, [safeGameData.scoreTable, currentRound])

  // Replace the existing shouldShowCardBacks calculation with:
  const shouldShowCardBacks = useMemo(() => {
    return isBlindRound && !safeGameData.allBetsPlaced
  }, [isBlindRound, safeGameData.allBetsPlaced])

  // Calculate the current betting player name
  let currentBettingPlayerName = "Waiting for players..."

  // Only try to access the current betting player if the game has started
  if (
    gameStarted &&
    safeGameData.currentBettingTurn !== undefined &&
    typeof safeGameData.currentBettingTurn === "number" &&
    safeGameData.currentBettingTurn >= 0 &&
    safeGameData.currentBettingTurn < players.length
  ) {
    currentBettingPlayerName = players[safeGameData.currentBettingTurn].name
  }

  // Use the last known betting player if we have one and the current one is the default
  if (currentBettingPlayerName === "Waiting for players..." && lastKnownBettingPlayer !== "Waiting for players...") {
    currentBettingPlayerName = lastKnownBettingPlayer
  }

  // Determine if it's the current player's turn to bet with improved stability
  const isCurrentPlayerBettingTurn = useMemo(() => {
    // If we've already stabilized the UI, maintain that state
    if (stableBettingUI && currentPlayer && currentPlayer.bet === null) {
      console.log("Using stabilized UI state for betting turn")
      return true
    }

    // If the player has already bet, it's definitely not their turn
    if (currentPlayer?.bet !== null) {
      return false
    }

    // Check if it's explicitly this player's turn based on currentBettingTurn
    if (
      currentPlayer &&
      gameStarted &&
      safeGameData.currentBettingTurn !== undefined &&
      typeof safeGameData.currentBettingTurn === "number" &&
      safeGameData.currentBettingTurn >= 0 &&
      safeGameData.currentBettingTurn < players.length
    ) {
      const isTurn = players[safeGameData.currentBettingTurn].name === currentPlayer.name
      console.log(
        `Checking if it's ${currentPlayer.name}'s turn to bet: ${isTurn} (currentBettingTurn: ${safeGameData.currentBettingTurn})`,
      )

      if (isTurn) {
        // Stabilize the UI if it's the player's turn
        if (!stableBettingUI && !bettingUITimeoutRef.current) {
          setStableBettingUI(true)
        }
        return true
      }
    }

    return false
  }, [currentPlayer, gameStarted, safeGameData.currentBettingTurn, players, stableBettingUI])

  // Check if we're in the waiting period after all bets are placed
  const isInBetDisplayPeriod = safeGameData.betsPlacedTimestamp && !safeGameData.allBetsPlaced

  // Function to determine if we should show bet banners
  const shouldShowBetBanners = () => {
    // Show bet banners throughout the round until bets reset for the next round
    return gameStarted && players.some((player) => player.bet !== null)
  }

  // Status line shown in the "Your hand" header: text + whether it's an active (accent) state
  const getGameStatus = (): { text: string; active: boolean } => {
    console.log("Rendering game status with:", {
      allBetsPlaced: safeGameData.allBetsPlaced,
      currentBettingTurn: safeGameData.currentBettingTurn,
      currentPlayerBet: currentPlayer?.bet,
      allPlayersHaveBet,
      isCurrentPlayerBettingTurn,
      currentBettingPlayerName,
    })

    // NEW: If we're in the golden round, show a special message
    if (safeGameData.isGoldenRound) {
      if (isCurrentPlayerTurn) return { text: t("goldenRoundYourTurn"), active: true }
      return { text: `${t("goldenRoundWaiting")} ${players[currentTurn]?.name || "..."} ${t("toPlayCard")}`, active: false }
    }

    // If all bets are placed, we're in the card playing phase
    if (safeGameData.allBetsPlaced) {
      if (isCurrentPlayerTurn) {
        const lead = cardsOnTable[0]
        if (lead && !(lead.suit === "spades" && lead.value === 7 && lead.pokerOption)) {
          return { text: `${t("yourTurnFollow")} ${SUIT_SYMBOLS[lead.suit]}`, active: true }
        }
        return { text: t("yourTurnShort"), active: true }
      }
      return { text: `${t("waitingFor")} ${players[currentTurn]?.name || "..."} ${t("toPlayCard")}`, active: false }
    }

    // If the player has already placed a bet, show a stable message
    if (currentPlayer && currentPlayer.bet !== null) return { text: t("waitingOthersBet"), active: false }

    // If all players have bet but allBetsPlaced is false, we're in the transition period
    if (allPlayersHaveBet && !safeGameData.allBetsPlaced) return { text: t("preparingRound"), active: false }

    // If it's the current player's turn to bet
    if (isCurrentPlayerBettingTurn) return { text: t("placeBetFirst"), active: false }

    // Otherwise, we're waiting for another player to bet
    const waitingName = currentBettingPlayerName.startsWith("Waiting")
      ? players.find((p) => p.name !== currentPlayerName)?.name || "..."
      : currentBettingPlayerName
    return { text: `${t("waitingFor")} ${waitingName} ${t("toPlaceBet")}`, active: false }
  }

  // Add this function to handle saving the game configuration
  const handleSaveGameConfig = (gameLength: GameLength, hasGoldenRound: boolean, hasNoTrumps: boolean) => {
    onConfigureGame(gameLength, hasGoldenRound, hasNoTrumps)
  }

  // Lobby: host picks the configuration inline; it is sent once, right before starting the game
  const serverGameLength: GameLength = safeGameData.gameLength || "basic"
  const [lobbyGameLength, setLobbyGameLength] = useState<GameLength>(serverGameLength)
  const [lobbyGoldenRound, setLobbyGoldenRound] = useState<boolean>(safeGameData.hasGoldenRound || false)
  const [lobbyNoTrumps, setLobbyNoTrumps] = useState<boolean>(safeGameData.hasNoTrumps || false)
  const [isStartingGame, setIsStartingGame] = useState(false)
  useEffect(() => { setLobbyGameLength(serverGameLength) }, [serverGameLength])
  useEffect(() => { setLobbyGoldenRound(safeGameData.hasGoldenRound || false) }, [safeGameData.hasGoldenRound])
  useEffect(() => { setLobbyNoTrumps(safeGameData.hasNoTrumps || false) }, [safeGameData.hasNoTrumps])

  const handleLobbyStart = async () => {
    if (!canStartGame || isStartingGame) return
    setIsStartingGame(true)
    try {
      const configChanged =
        lobbyGameLength !== serverGameLength ||
        lobbyGoldenRound !== (safeGameData.hasGoldenRound || false) ||
        lobbyNoTrumps !== (safeGameData.hasNoTrumps || false)
      if (configChanged) await onConfigureGame(lobbyGameLength, lobbyGoldenRound, lobbyNoTrumps)
      onStartGame()
    } finally {
      setIsStartingGame(false)
    }
  }

  // ─── Shared view helpers ─────────────────────────────────────────────────────
  const totalRounds = getTotalRounds(safeGameData.gameLength || "basic", safeGameData.hasGoldenRound || false, safeGameData.hasNoTrumps || false)
  const isMyPlayTurn = !!isCurrentPlayerTurn && safeGameData.allBetsPlaced
  const showBetControls = gameStarted && !!currentPlayer && currentPlayer.bet === null && isCurrentPlayerBettingTurn
  const forbiddenBet = showBetControls ? calculateForbiddenBet() : null
  const betIsForbidden = forbiddenBet !== null && (betAmount ?? 0) === forbiddenBet
  const seatBgColor = SEAT_SKINS.find((s) => s.id === seatSkin)?.value ?? "#15171C"

  const tableFeltStyle = (): React.CSSProperties => {
    if (tableSkin === "custom_table") { try { const u = localStorage.getItem("customTableSkinUrl"); if (u) return { backgroundImage: `url(${u})`, backgroundSize: "cover", backgroundPosition: "center" } } catch {} }
    const skin = TABLE_SKINS.find((s) => s.id === tableSkin)
    if (!skin) return { backgroundColor: "#121419" }
    if (skin.type === "image") return { backgroundImage: `url(${skin.value})`, backgroundSize: "cover", backgroundPosition: "center" }
    return { backgroundColor: skin.value }
  }

  const roundLabel = (roundName: string) =>
    roundName === "NT" ? (locale === "ru" ? "Б" : "NT") :
    roundName === "B" && locale === "ru" ? "Т" :
    roundName === "G" && locale === "ru" ? "З" :
    roundName

  const renderAvatar = (player: Player, sizeClass: string, textClass: string) => (
    <span className={`${sizeClass} rounded-full flex-shrink-0 overflow-hidden flex items-center justify-center bg-bp-strong text-bp-text font-display font-extrabold ${textClass}`}>
      {player.avatar ? (
        player.avatar.startsWith("data:") || player.avatar.startsWith("http") || player.avatar.startsWith("/")
          // eslint-disable-next-line @next/next/no-img-element
          ? <img src={player.avatar} alt={player.name} className="w-full h-full object-cover" />
          : <span className="font-sans font-normal">{player.avatar}</span>
      ) : player.name.charAt(0).toUpperCase()}
    </span>
  )

  const renderStat = (label: string, value: React.ReactNode, valueClass = "", compact = false) => (
    <span className="flex flex-col items-center gap-0.5 min-w-0">
      <span className={`font-mono uppercase text-bp-dim ${compact ? "text-[9px]" : "text-[10px] tracking-[0.08em]"}`}>{label}</span>
      <span className={`font-display font-bold leading-tight ${compact ? "text-[15px]" : "text-[17px]"} ${valueClass}`}>{value}</span>
    </span>
  )

  const turnBorder = (active: boolean) =>
    active ? `border-2 border-bp-accent ${betBlinkEnabled ? "animate-bet-border" : ""}` : "border border-bp-strong"

  // 7♠ option strip shown on table cards
  const renderPokerStrip = (card: Card, compact: boolean) =>
    card.suit === "spades" && card.value === 7 && card.pokerOption ? (
      <div className={`absolute bottom-0 left-0 right-0 bg-bp-bg/90 text-bp-accent font-mono uppercase text-center tracking-[0.06em] ${compact ? "text-[8px] py-0.5 rounded-b-xl" : "text-[10px] py-1 rounded-b-2xl"}`}>
        {card.pokerOption === "Trumps" ? t("trumps") : card.pokerOption === "Poker" ? t("poker") : t("simple")}
      </div>
    ) : null

  // One slot per player in the middle of the table; played cards fill the slots in play order
  const renderTableSlots = (compact: boolean) => {
    const slotSize = compact ? "w-14 h-[84px] rounded-xl" : "w-24 h-36 rounded-2xl"
    return Array.from({ length: Math.max(players.length, cardsOnTable.length) }).map((_, index) => {
      const card = cardsOnTable[index]
      if (!card) {
        return (
          <div key={index} className="flex flex-col items-center gap-1.5">
            <div className={`${slotSize} border border-dashed border-bp-strong`} />
            <span className={`font-mono ${compact ? "text-[8px]" : "text-[11px]"}`}>&nbsp;</span>
          </div>
        )
      }
      const isHighest =
        !!safeGameData.highestCard &&
        card.suit === safeGameData.highestCard.suit &&
        card.value === safeGameData.highestCard.value
      return (
        <div key={index} className="flex flex-col items-center gap-1.5 min-w-0">
          <div className={`relative ${compact ? "rounded-xl" : "rounded-2xl"} ${isHighest ? "outline outline-[3px] outline-bp-accent outline-offset-[3px]" : ""}`}>
            <PlayingCard
              suit={card.suit}
              value={card.value}
              disabled
              size={compact ? "small" : "normal"}
              className={isNoSuitRound && card.suit === "diamonds" ? "!bg-white" : ""}
            />
            {renderPokerStrip(card, compact)}
          </div>
          <span
            className={`font-mono uppercase truncate text-center ${compact ? "text-[8px] max-w-[56px] tracking-[0.04em]" : "text-[11px] max-w-[96px] tracking-[0.08em]"} ${isHighest ? "text-bp-accent" : "text-bp-muted"}`}
            title={card.playerName}
          >
            {card.playerName ?? " "}
          </span>
        </div>
      )
    })
  }

  // Cards in the player's hand. Highlights live on the wrapper, never inside the card.
  const renderHand = (size: "normal" | "medium" | "small") => {
    if (!currentPlayer?.hand?.length) {
      return <p className="text-sm text-bp-dim">{gameStarted ? t("allCardsPlayed") : t("cardsHereHint")}</p>
    }
    const radius = size === "normal" ? "rounded-2xl" : "rounded-xl"
    return currentPlayer.hand.map((card, index) => {
      const disabled =
        !isCurrentPlayerTurn ||
        isClearing ||
        !isValidCardToPlay(card) ||
        !safeGameData.allBetsPlaced ||
        isPlayingCard
      const playable = !disabled && !shouldShowCardBacks
      const dimmed = safeGameData.allBetsPlaced && disabled
      return (
        <div
          key={index}
          className={`${radius} transition-all duration-150 ${
            playable
              ? "-translate-y-2.5 shadow-[0_0_0_3px_#D7FF3F,0_18px_36px_rgba(0,0,0,0.5)]"
              : dimmed ? "opacity-[0.38]" : ""
          }`}
        >
          <PlayingCard
            suit={card.suit}
            value={card.value}
            size={size}
            onClick={() => handlePlayCard(card)}
            disabled={disabled}
            showBack={shouldShowCardBacks}
            className={isNoSuitRound && card.suit === "diamonds" ? "!bg-white" : ""}
          />
        </div>
      )
    })
  }

  const renderBetControls = (compact: boolean) => (
    <>
      <span className={`font-mono text-[11px] tracking-[0.1em] uppercase text-bp-accent ${compact ? "text-center" : ""}`}>{t("makeYourBet")}</span>
      <div className={`flex items-center ${compact ? "justify-center gap-7" : "justify-between gap-2"}`}>
        <button
          type="button"
          aria-label={t("decreaseBet")}
          onClick={() => setBetAmount((v) => Math.max((v ?? 0) - 1, 0))}
          className={`${compact ? "w-[52px] h-[52px]" : "w-12 h-12"} rounded-full border border-bp-strong bg-bp-surface3 text-bp-text flex items-center justify-center flex-shrink-0 hover:border-bp-muted transition-colors`}
        >
          <Minus size={20} strokeWidth={2.2} />
        </button>
        <span aria-live="polite" className={`font-display font-extrabold leading-[0.9] text-center select-none tabular-nums flex-shrink-0 flex justify-center ${compact ? "text-[72px] w-[80px]" : "text-[88px] w-[96px]"}`}>
          {betAmount ?? 0}
        </span>
        <button
          type="button"
          aria-label={t("increaseBet")}
          onClick={() => setBetAmount((v) => Math.min((v ?? 0) + 1, cardsThisRound))}
          className={`${compact ? "w-[52px] h-[52px]" : "w-12 h-12"} rounded-full border border-bp-strong bg-bp-surface3 text-bp-text flex items-center justify-center flex-shrink-0 hover:border-bp-muted transition-colors`}
        >
          <Plus size={20} strokeWidth={2.2} />
        </button>
      </div>
      {forbiddenBet !== null && (
        <span className="text-[13px] text-bp-warning text-center">{t("youCannotBet")} {forbiddenBet}</span>
      )}
      <button
        type="button"
        onClick={handlePlaceBet}
        disabled={betIsForbidden}
        className={`h-12 rounded-full text-base font-semibold border transition-colors ${
          betIsForbidden
            ? "bg-bp-surface3 border-bp-strong text-bp-dim cursor-not-allowed"
            : "bg-bp-accent border-bp-accent text-bp-bg hover:bg-bp-accentHover"
        }`}
      >
        {t("confirm")}
      </button>
    </>
  )

  const renderStatusLine = (compact: boolean) => {
    if (!gameStarted || currentRound > totalRounds) return null
    const status = getGameStatus()
    return (
      <span className={`flex items-center gap-2 font-semibold min-w-0 ${compact ? "text-[13px]" : "text-sm"} ${status.active ? "text-bp-accent" : "text-bp-muted"}`}>
        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${status.active ? "bg-bp-accent" : "bg-bp-dim"}`} />
        <span className="truncate">{status.text}</span>
      </span>
    )
  }

  // ─── Score table ─────────────────────────────────────────────────────────────
  const stCurrentIdx = players.findIndex((p) => p.name === currentPlayerName)
  const orderedPlayers = stCurrentIdx > 0
    ? [players[stCurrentIdx], ...players.filter((_, i) => i !== stCurrentIdx)]
    : [...players]
  const SCORE_GROUP_W = 132
  const SCORE_LABEL_W = 44
  const scoreShownCount = Math.max(1, Math.min(scoreTablePlayerCount, players.length || 1))
  const scoreWantedWidth = SCORE_LABEL_W + scoreShownCount * SCORE_GROUP_W
  // 360–440px wide; wider only when the player explicitly shows more than 3 players
  const scorePanelWidth = scoreShownCount > 3 ? scoreWantedWidth : Math.min(440, Math.max(360, scoreWantedWidth))
  const scoreTableMinWidth = SCORE_LABEL_W + orderedPlayers.length * SCORE_GROUP_W

  const isBottomPosition = scoreTablePosition === "bottom"

  const renderScoreTable = (compact: boolean) => {
    const cell = compact ? "px-0.5 py-1.5" : "px-[3px] py-[7px]"
    const headTop = compact ? "" : "sticky top-0 z-[1] bg-bp-surface"
    const headSub = compact ? "" : "sticky top-[30px] z-[1] bg-bp-surface"
    return (
      <table
        className={`w-full border-collapse font-mono tabular-nums ${compact ? "text-xs" : "text-[13px]"}`}
        style={{ minWidth: compact ? Math.max(420, 36 + orderedPlayers.length * 104) : scoreTableMinWidth }}
      >
        <thead>
          <tr>
            <th scope="col" className={`${headTop} ${compact ? "pl-3 pr-1.5 pt-2 pb-0.5 text-[10px]" : "pl-3.5 pr-2 pt-2.5 pb-1 text-[11px]"} text-left font-medium text-bp-dim`}>#</th>
            {orderedPlayers.map((player) => (
              <th
                key={player.name}
                scope="colgroup"
                colSpan={4}
                className={`${headTop} ${compact ? "px-1 pt-2 pb-0.5 text-xs" : "px-1.5 pt-2.5 pb-1 text-[13px]"} text-center font-sans font-semibold text-bp-text`}
              >
                <span className="inline-flex items-center justify-center gap-1.5 max-w-full min-w-0">
                  {player.score === highestScore && highestScore > 0 && <StarIcon size={compact ? 12 : 14} />}
                  <span className="truncate" title={player.name}>{player.name}</span>
                </span>
              </th>
            ))}
          </tr>
          <tr>
            <th scope="col" className={`${headSub} border-b border-bp-border ${compact ? "pl-3 pb-1.5" : "pl-3.5 pb-2"}`} />
            {orderedPlayers.map((player) => (
              <React.Fragment key={player.name}>
                {[t("colBet"), t("colWon"), t("colPts"), "±"].map((label, k) => (
                  <th
                    key={k}
                    scope="col"
                    className={`${headSub} border-b border-bp-border font-medium uppercase text-bp-dim ${compact ? "text-[9px] px-0.5 pt-0.5 pb-1.5" : "text-[10px] tracking-[0.06em] px-[3px] pt-1 pb-2"} ${k === 3 ? (compact ? "pr-1.5" : "pr-2") : ""}`}
                  >
                    {label}
                  </th>
                ))}
              </React.Fragment>
            ))}
          </tr>
        </thead>
        <tbody>
          {safeGameData.scoreTable && safeGameData.scoreTable.length > 0 ? (
            safeGameData.scoreTable.map((round: ScoreTableRow) => {
              const isCurrent = round.roundId === currentRound
              const isFuture = round.roundId > currentRound
              const isCompleted = round.roundId < currentRound || (isCurrent && safeGameData.gameOver)
              const roundMaxPoints = Math.max(...orderedPlayers.map(p => round.scores[p.name]?.cumulativePoints ?? -Infinity))
              return (
                <tr key={round.roundId} className={isCurrent ? "bg-bp-surface3" : ""}>
                  <th
                    scope="row"
                    className={`${compact ? "pl-3 pr-1.5 py-1.5" : "pl-3.5 pr-2 py-[7px]"} text-left font-medium border-b border-bp-divider ${isCurrent ? "text-bp-accent" : isFuture ? "text-bp-dim" : "text-bp-text2"}`}
                  >
                    {roundLabel(round.roundName)}
                  </th>
                  {orderedPlayers.map((player) => {
                    const lastPad = compact ? "pr-1.5" : "pr-2"
                    if (isFuture) {
                      return (
                        <React.Fragment key={player.name}>
                          {[0, 1, 2, 3].map((k) => (
                            <td key={k} className={`${cell} ${k === 3 ? lastPad : ""} text-center border-b border-bp-divider text-bp-future`}>–</td>
                          ))}
                        </React.Fragment>
                      )
                    }
                    const scoreData = round.scores[player.name]
                    const playerScore: PlayerScore = scoreData || { cumulativePoints: 0, roundPoints: 0, bet: null }
                    const hasScore = !!scoreData && round.roundId <= currentRound
                    const wins = isCurrent ? player.roundWins || 0 : scoreData?.wins
                    const isRoundLeader = isCompleted && hasScore && playerScore.cumulativePoints === roundMaxPoints && roundMaxPoints > 0
                    const showLive = isCurrent && !safeGameData.gameOver
                    const betText = hasScore ? (playerScore.bet !== null ? playerScore.bet : "-") : "-"
                    const wonText = isCurrent ? wins : hasScore ? (wins !== undefined ? wins : "-") : "-"
                    const rp = playerScore.roundPoints
                    return (
                      <React.Fragment key={player.name}>
                        <td className={`${cell} text-center border-b border-bp-divider ${isCurrent ? "text-bp-text font-medium" : "text-bp-text2"}`}>{betText}</td>
                        <td className={`${cell} text-center border-b border-bp-divider ${isCurrent ? "text-bp-text font-medium" : "text-bp-text2"}`}>{wonText}</td>
                        <td className={`${cell} text-center border-b border-bp-divider ${
                          showLive ? "text-bp-dim" : isRoundLeader ? "bg-bp-accent/[0.16] text-bp-accent font-semibold" : "text-bp-text font-medium"
                        }`}>
                          {showLive ? "·" : hasScore ? playerScore.cumulativePoints : "-"}
                        </td>
                        <td className={`${cell} ${lastPad} text-center border-b border-bp-divider ${
                          showLive ? "text-bp-dim" : hasScore && rp < 0 ? "text-bp-warning" : "text-bp-muted"
                        }`}>
                          {showLive ? "·" : !hasScore ? "-" : rp > 0 ? `+${rp}` : rp === 0 ? "-" : rp}
                        </td>
                      </React.Fragment>
                    )
                  })}
                </tr>
              )
            })
          ) : (
            <tr>
              <td />
              <td colSpan={orderedPlayers.length * 4} className="px-2 py-3 text-bp-dim font-sans text-sm">{t("gameLogPlaceholder")}</td>
            </tr>
          )}
        </tbody>
      </table>
    )
  }

  const collapseIcon = isBottomPosition
    ? (scoreTableExpanded ? <ChevronDown size={15} /> : <ChevronUp size={15} />)
    : scoreTablePosition === "right"
      ? (scoreTableExpanded ? <ChevronRight size={15} /> : <ChevronLeft size={15} />)
      : (scoreTableExpanded ? <ChevronLeft size={15} /> : <ChevronRight size={15} />)

  const smallIconBtn = (active = false) =>
    `w-9 h-9 rounded-full border flex items-center justify-center flex-shrink-0 transition-colors ${
      active ? "bg-bp-accent border-bp-accent text-bp-bg" : "border-bp-strong text-bp-text2 hover:text-bp-text hover:border-bp-muted"
    }`
  const pillClass = (on: boolean) =>
    `h-8 min-w-[36px] px-3 rounded-full font-mono text-xs transition-colors ${on ? "bg-bp-accent text-bp-bg" : "text-bp-text2 hover:text-bp-text"}`

  const scoreTablePanel = (
    <section
      aria-labelledby="score-title"
      className={`bg-bp-surface border border-bp-border rounded-[20px] overflow-hidden flex flex-col min-w-0 ${
        isBottomPosition ? "w-full order-2" : `flex-shrink-0 ${scoreTableExpanded ? "min-h-[420px]" : "self-start"} ${scoreTablePosition === "right" ? "order-2" : "order-0"}`
      }`}
      style={!isBottomPosition && scoreTableExpanded ? { width: scorePanelWidth } : undefined}
    >
      <div className={`flex items-center justify-between gap-3 px-[18px] py-4 ${scoreTableExpanded ? "border-b border-bp-border" : ""}`}>
        <h2 id="score-title" className="m-0 font-display font-bold text-base whitespace-nowrap">{t("scoreTable")}</h2>
        <span className="flex items-center gap-1.5">
          {scoreTableExpanded && (
            <button
              type="button"
              onClick={() => setShowScoreSettings((v) => !v)}
              className={smallIconBtn(showScoreSettings)}
              aria-label={t("scoreTableSettings")}
              aria-expanded={showScoreSettings}
              title={t("scoreTableSettings")}
            >
              <SlidersHorizontal size={15} />
            </button>
          )}
          <button
            type="button"
            onClick={() => setScoreTableExpanded((v) => !v)}
            className={smallIconBtn()}
            aria-label={scoreTableExpanded ? t("collapse") : t("expand")}
            title={scoreTableExpanded ? t("collapse") : t("expand")}
          >
            {collapseIcon}
          </button>
        </span>
      </div>

      {/* Settings: players shown + position */}
      {scoreTableExpanded && showScoreSettings && (
        <div className="px-[18px] py-3 flex flex-col gap-2.5 border-b border-bp-border">
          {players.length > 2 && (
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm text-bp-text2">{t("playersShown")}</span>
              <div className="flex gap-1 p-[3px] rounded-full bg-bp-band border border-bp-border">
                {Array.from({ length: Math.max(0, players.length - 1) }, (_, i) => i + 2).map((n) => (
                  <button key={n} type="button" aria-pressed={scoreShownCount === n} onClick={() => setScoreTablePlayerCount(n)} className={pillClass(scoreShownCount === n)}>
                    {n}
                  </button>
                ))}
              </div>
            </div>
          )}
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm text-bp-text2">{t("position")}</span>
            <div className="flex gap-1 p-[3px] rounded-full bg-bp-band border border-bp-border">
              {(["left", "right", "bottom"] as const).map((pos) => (
                <button key={pos} type="button" aria-pressed={scoreTablePosition === pos} onClick={() => setScoreTablePosition(pos)} className={pillClass(scoreTablePosition === pos)}>
                  {pos === "left" ? t("posLeft") : pos === "right" ? t("posRight") : t("posBottom")}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {scoreTableExpanded && (
        isBottomPosition ? (
          <div className="overflow-auto max-h-64">{renderScoreTable(false)}</div>
        ) : (
          // Rows scroll inside; the panel itself is as tall as the play column
          <div className="flex-1 min-h-0 relative">
            <div className="absolute inset-0 overflow-auto">{renderScoreTable(false)}</div>
          </div>
        )
      )}
    </section>
  )

  // ─── Shared dialogs (all layouts) ────────────────────────────────────────────
  const myAvatar = players.find((p) => p.name === currentPlayerName)?.avatar
  const sharedDialogs = (
    <>
      <GameResultsDialog isOpen={showResultsDialog} onClose={() => setShowResultsDialog(false)} players={players} />
      <PokerCardDialog
        isOpen={showPokerCardDialog}
        onClose={() => setShowPokerCardDialog(false)}
        onOptionSelect={handlePokerCardOptionSelect}
        isFirstCard={cardsOnTable.length === 0}
        isValidSimple={isValidSimplePlay()}
        availableOptions={cardsOnTable.length === 0 ? ["Trumps", "Poker", "Simple"] : ["Poker", "Simple"]}
      />
      <ConfigureGameDialog
        isOpen={showConfigureDialog}
        onClose={() => setShowConfigureDialog(false)}
        onSave={handleSaveGameConfig}
        currentGameLength={safeGameData.gameLength || "short"}
        currentHasGoldenRound={safeGameData.hasGoldenRound || false}
        currentHasNoTrumps={safeGameData.hasNoTrumps || false}
      />
      {showSuitPickerDialog && (
        <Dialog open={showSuitPickerDialog} onOpenChange={() => setShowSuitPickerDialog(false)}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>{t("selectSuitTitle")}</DialogTitle>
            </DialogHeader>
            <div className="py-2 grid grid-cols-2 gap-2">
              {(["spades", "clubs", "hearts", "diamonds"] as const).map(suit => {
                const isRed = suit === "hearts" || suit === "diamonds"
                return (
                  <Button
                    key={suit}
                    onClick={() => handleSuitSelected(suit)}
                    variant="outline"
                    className={`h-14 justify-start text-left text-[15px] bg-bp-surface hover:bg-bp-surface hover:border-bp-accent ${isRed ? "text-[#FF6B7F]" : "text-bp-text"}`}
                  >
                    {t(`suit${suit.charAt(0).toUpperCase() + suit.slice(1)}` as "suitSpades" | "suitHearts" | "suitDiamonds" | "suitClubs")}
                  </Button>
                )
              })}
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Avatar / Reaction Picker Modal */}
      {showAvatarPicker && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 px-4" onClick={() => setShowAvatarPicker(false)}>
          <div
            className="bg-bp-surface2 border border-bp-strong rounded-[20px] p-5 w-[340px] max-w-full shadow-[0_24px_60px_rgba(0,0,0,0.6)] text-bp-text"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="m-0 font-display font-bold text-base">{t("emojiAvatar")}</h3>
              <button type="button" onClick={() => setShowAvatarPicker(false)} aria-label={t("close")} className={smallIconBtn()}>
                <X size={14} />
              </button>
            </div>
            {/* Tabs */}
            <div className="flex gap-1 p-[3px] mb-4 rounded-full bg-bp-band border border-bp-border">
              <button type="button" className={`flex-1 ${pillClass(avatarPickerTab === "emoji")}`} onClick={() => setAvatarPickerTab("emoji")}>{t("emojiTab")}</button>
              <button type="button" className={`flex-1 ${pillClass(avatarPickerTab === "image")}`} onClick={() => setAvatarPickerTab("image")}>{t("avatarTab")}</button>
            </div>

            <div className="h-[220px] overflow-y-auto [&::-webkit-scrollbar]:hidden" style={{ scrollbarWidth: "none" }}>
              {avatarPickerTab === "emoji" && (
                <div className="grid grid-cols-6 gap-1">
                  {EMOJI_LIST.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      className="text-2xl hover:bg-bp-surface3 rounded-lg p-1 transition-colors"
                      onClick={() => { onSendReaction(emoji); setShowAvatarPicker(false) }}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              )}

              {avatarPickerTab === "image" && (
                <div className="flex flex-col items-center justify-between h-full py-2">
                  <div className="flex-1 flex items-center justify-center">
                    {myAvatar ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={myAvatar} alt="avatar" className="w-[120px] h-[120px] rounded-full object-cover" />
                    ) : (
                      <div className="w-[120px] h-[120px] rounded-full bg-bp-strong flex items-center justify-center font-display font-extrabold text-4xl">
                        {currentPlayerName?.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2 mt-3">
                    {myAvatar && (
                      <Button size="sm" variant="outline" onClick={() => { onSetAvatar(""); setShowAvatarPicker(false) }}>
                        {t("removePhoto")}
                      </Button>
                    )}
                    <Button size="sm" onClick={() => fileInputRef.current?.click()}>
                      {t("choosePhoto")}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileSelect} />

      <style jsx global>{`
        @keyframes betBorder {
          0%, 100% { border-color: #D7FF3F; box-shadow: 0 0 10px rgba(215, 255, 63, 0.45); }
          50% { border-color: transparent; box-shadow: none; }
        }
        .animate-bet-border { animation: betBorder 1s ease-in-out infinite; }
        @keyframes reactionFloat {
          0%   { opacity: 1; transform: translateX(-50%) translateY(0)     scale(1); }
          40%  { opacity: 1; transform: translateX(-50%) translateY(-50px) scale(1.4); }
          100% { opacity: 0; transform: translateX(-50%) translateY(-90px) scale(0.8); }
        }
        .reaction-float { animation: reactionFloat 3s ease-out forwards; }
        @keyframes reactionFloatDown {
          0%   { opacity: 1; transform: translateX(-50%) translateY(0)    scale(1); }
          40%  { opacity: 1; transform: translateX(-50%) translateY(50px) scale(1.4); }
          100% { opacity: 0; transform: translateX(-50%) translateY(90px) scale(0.8); }
        }
        .reaction-float-down { animation: reactionFloatDown 3s ease-out forwards; }
      `}</style>
    </>
  )

  const renderReaction = (playerName: string, down = false, sizeClass = "text-3xl") => {
    const reaction = activeReactions.get(playerName)
    if (!reaction) return null
    return (
      <div
        key={reaction.key}
        className={`absolute left-1/2 pointer-events-none z-20 ${sizeClass} ${down ? "reaction-float-down" : "reaction-float"}`}
        style={down ? { bottom: "-10px" } : { top: "-10px" }}
      >
        {reaction.emoji}
      </div>
    )
  }

  // ─── Lobby (pre-game) — desktop and mobile ───────────────────────────────────
  if (!gameStarted) {
    return (
      <div className="w-full max-w-[1280px] mx-auto px-4 pt-6 pb-8 md:px-8 md:py-12 grid gap-4 md:gap-6 md:grid-cols-[minmax(0,380fr)_minmax(0,460fr)] md:grid-rows-[auto_1fr] items-start text-bp-text">
        {/* Table ID + share */}
        <section className="flex flex-col gap-3 md:col-start-1 md:row-start-1 min-w-0">
          <span className="bp-label tracking-[0.12em]">{t("tableId")}</span>
          <h1 className="m-0 font-mono font-medium text-[clamp(36px,11vw,56px)] md:text-[clamp(48px,6vw,72px)] tracking-[0.14em] leading-none text-bp-accent break-all">
            {tableId}
          </h1>
          <div className="flex gap-2 flex-wrap pt-1.5">
            <Button onClick={onShare} className="h-12 px-5 text-[15px]">
              <Link2 size={16} />
              {t("shareGameLink")}
            </Button>
          </div>
        </section>

        {/* Configure game (host) / waiting (others) */}
        {isOwner ? (
          <section
            aria-labelledby="cfg-title"
            className="bg-bp-surface border border-bp-border rounded-3xl p-5 md:p-7 flex flex-col gap-6 md:col-start-2 md:row-start-1 md:row-span-2 min-w-0"
          >
            <div className="flex justify-between items-baseline gap-3 flex-wrap">
              <h2 id="cfg-title" className="m-0 font-display font-bold text-xl md:text-2xl">{t("configureGame")}</h2>
              <span className="bp-label">{t("hostOnly")}</span>
            </div>
            <GameConfigFields
              gameLength={lobbyGameLength}
              hasGoldenRound={lobbyGoldenRound}
              hasNoTrumps={lobbyNoTrumps}
              onGameLengthChange={setLobbyGameLength}
              onGoldenRoundChange={setLobbyGoldenRound}
              onNoTrumpsChange={setLobbyNoTrumps}
            />
            <Button size="lg" className="w-full" onClick={handleLobbyStart} disabled={!canStartGame || isStartingGame}>
              {t("startGame")}
              <ArrowRight size={20} />
            </Button>
            {players.length < 2 && <p className="m-0 -mt-2 text-sm text-bp-muted text-center">{t("waitingMorePlayers")}</p>}
          </section>
        ) : (
          <section className="bg-bp-surface border border-bp-border rounded-3xl p-5 md:p-7 flex items-center gap-3 md:col-start-2 md:row-start-1 min-w-0">
            <span className="w-2 h-2 rounded-full bg-bp-accent animate-pulse flex-shrink-0" />
            <span className="text-[15px] text-bp-text2">{players.length < 2 ? t("waitingMorePlayers") : t("waitingForHost")}</span>
          </section>
        )}

        {/* At the table */}
        <section aria-labelledby="players-title" className="bg-bp-surface border border-bp-border rounded-3xl py-2 md:col-start-1 md:row-start-2 self-start min-w-0">
          <div className="flex justify-between items-baseline gap-3 px-5 pt-4 pb-3 md:pt-5 md:pb-3.5">
            <h2 id="players-title" className="m-0 font-display font-bold text-xl md:text-2xl">{t("atTheTable")}</h2>
            <span className="font-mono text-[11px] tracking-[0.1em] uppercase text-bp-muted">{players.length} / 6</span>
          </div>
          {players.map((p) => {
            const isMe = p.name === currentPlayerName
            const role = p.isOwner && isMe ? t("hostYou") : p.isOwner ? t("host") : isMe ? t("you") : ""
            return (
              <div key={p.name} className="flex items-center gap-3 px-5 py-3 border-t border-bp-divider">
                <button
                  type="button"
                  className={`relative rounded-full ${isMe ? "cursor-pointer hover:ring-2 hover:ring-bp-accent" : "cursor-default"}`}
                  onClick={isMe ? () => { setShowAvatarPicker(true); setAvatarPickerTab("emoji") } : undefined}
                  tabIndex={isMe ? 0 : -1}
                  aria-label={isMe ? t("emojiAvatar") : p.name}
                >
                  {renderAvatar(p, "w-9 h-9", "text-[15px]")}
                  {renderReaction(p.name, false, "text-2xl")}
                </button>
                <span className="font-semibold text-base truncate min-w-0">{p.name}</span>
                {role && (
                  <span className="ml-auto font-mono text-[11px] tracking-[0.08em] uppercase px-2.5 py-1 rounded-full bg-bp-surface3 text-bp-text2 whitespace-nowrap">
                    {role}
                  </span>
                )}
              </div>
            )
          })}
        </section>

        {sharedDialogs}
      </div>
    )
  }

  // ─── Mobile layout ───────────────────────────────────────────────────────────
  const mobileOpponents = players.filter((p) => p.name !== currentPlayerName)

  const renderMobileSeat = (player: Player, i: number) => {
    const isCardTurnM = safeGameData.allBetsPlaced && players[currentTurn]?.name === player.name
    const isBettingTurnM = !safeGameData.allBetsPlaced && typeof safeGameData.currentBettingTurn === "number" && players[safeGameData.currentBettingTurn]?.name === player.name
    const isActiveTurnM = isCardTurnM || isBettingTurnM
    const betValueM = shouldShowBetBanners() && player.bet !== null ? player.bet : "—"
    const isLeaderM = player.score === highestScore && highestScore > 0
    const hitM = player.bet !== null && betValueM !== "—" && player.roundWins === player.bet
    return (
      <div
        key={i}
        className={`relative rounded-2xl min-w-0 ${turnBorder(isActiveTurnM)}`}
        style={{ backgroundColor: seatBgColor }}
        onClick={() => { if (player.name.length > 8) { setMobileNamePopup(player.name); setTimeout(() => setMobileNamePopup(null), 2000) } }}
      >
        {isLeaderM && <LeaderBadge size={22} />}
        <div className="flex items-center gap-2 px-2.5 pt-2.5 pb-1.5 min-w-0">
          {renderAvatar(player, "w-7 h-7", "text-xs")}
          <span className="text-sm font-semibold truncate min-w-0">{player.name}</span>
          {mobileNamePopup === player.name && (
            <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 z-50 bg-bp-surface2 border border-bp-strong rounded-xl px-3 py-2 text-bp-text text-xs font-semibold shadow-xl whitespace-nowrap" onClick={() => setMobileNamePopup(null)}>
              {player.name}
            </div>
          )}
        </div>
        <div className="grid grid-cols-3 border-t border-bp-border px-0.5 pt-1.5 pb-2">
          {renderStat(t("colPts"), player.score, "", true)}
          {renderStat(t("colBet"), betValueM, "", true)}
          {renderStat(t("colWon"), player.roundWins, hitM ? "text-bp-accent" : "", true)}
        </div>
        {renderReaction(player.name, true, "text-2xl")}
      </div>
    )
  }

  if (isMobile) {
    // Fit one slot per player into the table width
    const mobileTableWidth = Math.max(0, viewportWidth - 32)
    const slotsWidth = players.length * 56 + Math.max(0, players.length - 1) * 8
    const slotsZoom = Math.min(1, (mobileTableWidth - 32) / Math.max(1, slotsWidth))
    const myActiveTurn = !!currentPlayer && (isMyPlayTurn || (!safeGameData.allBetsPlaced && isCurrentPlayerBettingTurn))
    const myBetM = currentPlayer && shouldShowBetBanners() && currentPlayer.bet !== null ? currentPlayer.bet : "—"
    const myHitM = !!currentPlayer && currentPlayer.bet !== null && myBetM !== "—" && currentPlayer.roundWins === currentPlayer.bet

    return (
      <div className="flex flex-col gap-3.5 px-4 pt-3.5 pb-6 text-bp-text">
        {/* Info strip */}
        <dl className="m-0 grid grid-cols-4 gap-1 px-1.5 py-2 rounded-[14px] bg-bp-surface border border-bp-border">
          {[
            { label: t("tableChip"), value: tableId, accent: true },
            { label: t("round"), value: `${currentRound}/${totalRounds}` },
            { label: t("playLabel"), value: `${currentPlay}/${cardsThisRound}` },
            { label: t("timeLabel"), value: elapsedTime },
          ].map((item) => (
            <div key={item.label} className="flex flex-col items-center gap-0.5 min-w-0">
              <dt className="font-mono text-[9px] tracking-[0.08em] uppercase text-bp-dim truncate max-w-full">{item.label}</dt>
              <dd className={`m-0 font-mono text-[13px] tabular-nums truncate max-w-full ${item.accent ? "tracking-[0.08em] text-bp-accent" : ""}`}>{item.value}</dd>
            </div>
          ))}
        </dl>

        {/* Opponents */}
        {mobileOpponents.length > 0 && (
          <div className="grid grid-cols-2 gap-2">
            {mobileOpponents.map((player, i) => renderMobileSeat(player, i))}
          </div>
        )}

        {/* Table with one slot per player */}
        <section aria-label={t("tableChip")} className="relative w-full aspect-[2/1]">
          <div className="absolute inset-0 rounded-[25%/25%] bg-bp-surface3 border border-bp-strong" />
          <div className="absolute inset-[10px] rounded-[23%/22%] border border-bp-border" style={tableFeltStyle()} />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="flex gap-2 items-start" style={slotsZoom < 1 ? { zoom: slotsZoom } : undefined}>
              {renderTableSlots(true)}
            </div>
          </div>
        </section>

        {/* Your seat */}
        {currentPlayer && (
          <div
            className={`relative flex items-center gap-3 px-3.5 py-3 rounded-2xl ${turnBorder(myActiveTurn)}`}
            style={{ backgroundColor: seatBgColor }}
          >
            {highestScore > 0 && currentPlayer.score === highestScore && <LeaderBadge size={22} />}
            {renderAvatar(currentPlayer, "w-8 h-8", "text-[13px]")}
            <span className="font-semibold text-[15px] flex-1 min-w-0 truncate">{t("you")} · {currentPlayer.name}</span>
            <span className="flex gap-3.5 flex-shrink-0">
              {renderStat(t("colPts"), currentPlayer.score, "", true)}
              {renderStat(t("colBet"), myBetM, "", true)}
              {renderStat(t("colWon"), currentPlayer.roundWins, myHitM ? "text-bp-accent" : "", true)}
            </span>
            <div className="relative flex-shrink-0">
              <button
                type="button"
                onClick={() => setShowMobileEmojiPanel(v => !v)}
                className="w-9 h-9 rounded-full border border-bp-strong flex items-center justify-center text-lg active:scale-110 transition-transform"
                aria-label={t("emojiTab")}
              >😊</button>
              {showMobileEmojiPanel && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowMobileEmojiPanel(false)} />
                  <div className="absolute bottom-full right-0 mb-2 z-20 bg-bp-surface2 border border-bp-strong rounded-2xl p-2 shadow-[0_24px_60px_rgba(0,0,0,0.6)] w-56">
                    <div className="grid grid-cols-6 gap-1">
                      {EMOJI_LIST.map(emoji => (
                        <button key={emoji} type="button" onClick={() => { onSendReaction(emoji); setShowMobileEmojiPanel(false) }} className="text-xl hover:scale-125 active:scale-125 transition-transform text-center">{emoji}</button>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
            {renderReaction(currentPlayer.name, false, "text-2xl")}
          </div>
        )}

        {/* Bet block — only while it's your turn to bet */}
        {showBetControls && (
          <section aria-label={t("makeYourBet")} className={`bg-bp-surface rounded-[20px] p-4 flex flex-col gap-3 border-2 border-bp-accent ${betBlinkEnabled ? "animate-bet-border" : ""}`}>
            {renderBetControls(true)}
          </section>
        )}

        {/* Your hand */}
        <section aria-label={t("yourHand")} className="flex flex-col gap-2">
          <div className="flex justify-between items-center gap-3 min-w-0">
            <span className="font-mono text-[11px] tracking-[0.1em] uppercase text-bp-muted flex-shrink-0">{t("yourHand")}</span>
            {renderStatusLine(true)}
          </div>
          <div className={`flex justify-center items-end pt-3 min-h-[105px] ${(currentPlayer?.hand.length ?? 0) >= 6 ? "gap-1" : "gap-1.5"}`}>
            {renderHand((currentPlayer?.hand.length ?? 0) >= 6 ? "small" : "medium")}
          </div>
          {errorMessage && <p className="m-0 text-bp-warning text-sm text-center">{errorMessage}</p>}
        </section>

        {/* Score table (mobile) */}
        {safeGameData.scoreTable && safeGameData.scoreTable.length > 0 && (
          <section aria-labelledby="mscore-title" className="bg-bp-surface border border-bp-border rounded-[20px] overflow-hidden">
            <div className={`flex justify-between items-center px-3.5 py-3 ${scoreTableExpanded ? "border-b border-bp-border" : ""}`}>
              <h2 id="mscore-title" className="m-0 font-display font-bold text-[15px]">{t("scoreTable")}</h2>
              <button
                type="button"
                onClick={() => setScoreTableExpanded(v => !v)}
                className={smallIconBtn()}
                aria-label={scoreTableExpanded ? t("collapse") : t("expand")}
              >
                {scoreTableExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>
            </div>
            {scoreTableExpanded && <div className="overflow-x-auto">{renderScoreTable(true)}</div>}
          </section>
        )}

        {sharedDialogs}
      </div>
    )
  }
  // ─── End mobile layout ────────────────────────────────────────────────────────

  // ─── Desktop / tablet ────────────────────────────────────────────────────────
  // Scale the whole layout down when the viewport is narrower than its natural width
  const PLAY_MIN_WIDTH = 920 // 800px table + room for seats that overhang the rail
  const layoutNaturalWidth =
    48 + PLAY_MIN_WIDTH + (!isBottomPosition && scoreTableExpanded ? scorePanelWidth + 24 : !isBottomPosition ? 200 : 0)
  const layoutZoom = Math.min(1, viewportWidth / layoutNaturalWidth)
  const seatsHaveCards = cardsOnSeats && gameStarted

  return (
    <>
      {/* Game info — chips in the center of the header */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 h-[var(--header-h)] flex items-center z-20 pointer-events-none">
        <dl className="m-0 flex gap-1.5">
          {[
            { label: t("tableChip"), value: tableId, accent: true },
            { label: t("round"), value: `${currentRound} / ${totalRounds}` },
            { label: t("playLabel"), value: `${currentPlay} / ${cardsThisRound}` },
            { label: t("timeLabel"), value: elapsedTime },
          ].map((item) => (
            <div key={item.label} className="flex items-baseline gap-2 px-3.5 py-2 rounded-full bg-bp-surface border border-bp-border whitespace-nowrap">
              <dt className="font-mono text-[11px] tracking-[0.1em] uppercase text-bp-muted">{item.label}</dt>
              <dd className={`m-0 font-mono text-sm tabular-nums ${item.accent ? "tracking-[0.14em] text-bp-accent" : "text-bp-text"} ${item.label === t("timeLabel") ? "min-w-[4ch]" : ""}`}>{item.value}</dd>
            </div>
          ))}
        </dl>
      </div>

      <div
        style={layoutZoom < 1 ? { zoom: layoutZoom } : undefined}
        className={`w-full max-w-[1440px] mx-auto px-6 pt-12 pb-6 flex gap-6 text-bp-text ${isBottomPosition ? "flex-col" : "flex-row items-stretch"}`}
      >
        {scoreTablePanel}

        {/* Play column */}
        <div className={`order-1 min-w-0 flex flex-col gap-7 ${isBottomPosition ? "w-full" : "flex-1"}`} style={{ minWidth: PLAY_MIN_WIDTH }}>
          {/* Table with seats */}
          <section
            aria-label={t("tableChip")}
            className="relative w-[800px] h-[400px] mx-auto overflow-visible flex-shrink-0"
            style={{ marginTop: seatsHaveCards ? 56 : 0, marginBottom: seatsHaveCards ? 76 : 28 }}
          >
            {/* Rail */}
            <div className="absolute inset-0 rounded-[25%/25%] bg-bp-surface3 border border-bp-strong shadow-[0_30px_80px_rgba(0,0,0,0.55)]" />
            {/* Felt */}
            <div className="absolute inset-[18px] rounded-[23%/22%] border border-bp-border" style={tableFeltStyle()} />
            {/* Inner dashed line */}
            <div className="absolute inset-[44px] rounded-[19%/16%] border border-dashed border-bp-strong opacity-60" />

            {/* Cards on table — one slot per player */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="flex gap-3.5 items-start">{renderTableSlots(false)}</div>
            </div>

            {/* Player seats — current player always at index 0 (bottom center) */}
            {[...players.filter(p => p.name === currentPlayerName), ...players.filter(p => p.name !== currentPlayerName)].map((player, index) => {
              // Seat positions centered on each border segment of the rounded-rect table.
              // Flat edge centers: bottom (400,400), top (400,0), left (0,200), right (800,200)
              // Corner arc midpoints (border-radius 200px/100px): TL(59,29) TR(741,29) BL(59,371) BR(741,371)
              const seatPositions: Record<number, [number, number][]> = {
                1: [[400, 400]],
                2: [[400, 400], [400, 0]],
                3: [[400, 400], [59, 29], [741, 29]],
                4: [[400, 400], [0, 200], [400, 0], [800, 200]],
                5: [[400, 400], [59, 371], [59, 29], [741, 29], [741, 371]],
                6: [[400, 400], [59, 371], [59, 29], [400, 0], [741, 29], [741, 371]],
              }
              const [left, top] = seatPositions[players.length]?.[index] ?? [400, 200]
              // Top seats: top edge level with the top of the table (and the score table)
              const isTopSeat = top < 200

              const isCurrentTurn = safeGameData.allBetsPlaced && players[currentTurn]?.name === player.name
              const isBettingTurn =
                !safeGameData.allBetsPlaced &&
                typeof safeGameData.currentBettingTurn === "number" &&
                players[safeGameData.currentBettingTurn]?.name === player.name
              const isActiveTurn = isCurrentTurn || isBettingTurn
              const isLeader = player.score === highestScore && highestScore > 0
              const betValue = shouldShowBetBanners() && player.bet !== null ? player.bet : "—"
              const hit = player.bet !== null && betValue !== "—" && player.roundWins === player.bet
              const isCurrentPlayerSeat = player.name === currentPlayerName

              const seatCards = cardsOnSeats && gameStarted && player.hand.length > 0 && (() => {
                const cardCount = player.hand.length
                const gap = 2
                const cardW = Math.min(Math.floor((200 - gap * (cardCount - 1)) / cardCount), 32)
                const cardH = Math.round(cardW * 1.5)
                const skin = CARD_BACK_SKINS.find(s => s.id === cardBackSkin) ?? CARD_BACK_SKINS[0]
                return (
                  <div
                    className="pointer-events-none absolute left-0 right-0 flex justify-center"
                    style={isTopSeat ? { gap: `${gap}px`, bottom: "calc(100% + 4px)" } : { gap: `${gap}px`, top: "calc(100% + 4px)" }}
                  >
                    {Array.from({ length: cardCount }).map((_, i) => (
                      <div key={i} className="rounded overflow-hidden border border-white/20 flex-shrink-0" style={{ width: `${cardW}px`, height: `${cardH}px` }}>
                        {skin.type === "image"
                          // eslint-disable-next-line @next/next/no-img-element
                          ? <img src={skin.value} alt="" className="w-full h-full object-cover" />
                          : <div className="w-full h-full" style={{ backgroundColor: skin.value }} />}
                      </div>
                    ))}
                  </div>
                )
              })()

              return (
                <div
                  key={index}
                  className="absolute w-[200px] z-[2]"
                  style={{ left: `${left}px`, top: isTopSeat ? 0 : `${top}px`, transform: isTopSeat ? "translate(-50%, 0)" : "translate(-50%, -50%)" }}
                >
                  {renderReaction(player.name)}
                  {seatCards}

                  {/* Bet placed notification */}
                  {betNotifications.has(player.name) && (
                    <div className="absolute left-1/2 -translate-x-1/2 pointer-events-none z-20 -top-9">
                      <div className="bg-bp-accent text-bp-bg text-xs font-semibold px-2.5 py-1 rounded-full whitespace-nowrap shadow-lg">
                        ✓ {t("betPlaced")}
                      </div>
                    </div>
                  )}

                  <div
                    className={`relative rounded-2xl shadow-[0_14px_34px_rgba(0,0,0,0.5)] ${turnBorder(isActiveTurn)}`}
                    style={{ backgroundColor: seatBgColor }}
                  >
                    {isLeader && <LeaderBadge />}
                    {/* Top row: avatar + name */}
                    <div className="flex items-center gap-2.5 px-3 pt-2.5 pb-2 min-w-0">
                      <div
                        className={`relative rounded-full flex-shrink-0 ${isCurrentPlayerSeat ? "cursor-pointer group" : ""}`}
                        onClick={isCurrentPlayerSeat ? () => { setShowAvatarPicker(true); setAvatarPickerTab("emoji") } : undefined}
                      >
                        {renderAvatar(player, "w-8 h-8", "text-sm")}
                        {isCurrentPlayerSeat && (
                          <div className="absolute inset-0 bg-black/50 hidden group-hover:flex items-center justify-center rounded-full">
                            <span className="text-white text-[9px]">✏️</span>
                          </div>
                        )}
                      </div>
                      <span className="font-semibold text-[15px] truncate min-w-0" title={player.name}>{player.name}</span>
                      {isActiveTurn && (
                        <span className="ml-auto font-mono text-[10px] tracking-[0.1em] uppercase px-2 py-[3px] rounded-full bg-bp-accent text-bp-bg flex-shrink-0">
                          {t("turnChip")}
                        </span>
                      )}
                    </div>
                    {/* Stats row: pts | bet | won */}
                    <div className="grid grid-cols-3 border-t border-bp-border px-1 pt-2 pb-2.5">
                      {renderStat(t("colPts"), player.score)}
                      {renderStat(t("colBet"), betValue)}
                      {renderStat(t("colWon"), player.roundWins, hit ? "text-bp-accent" : "")}
                    </div>
                  </div>
                </div>
              )
            })}
          </section>

          {/* Bet block + your hand */}
          <section aria-label={t("yourHand")} className="flex flex-wrap gap-4 items-stretch">
            {/* Bet block — keeps its width when empty so the hand does not move */}
            <div
              className={`flex-[1_1_220px] max-w-[280px] rounded-[20px] px-5 py-[18px] flex flex-col gap-3.5 ${
                showBetControls ? `bg-bp-surface border-2 border-bp-accent ${betBlinkEnabled ? "animate-bet-border" : ""}` : "border-2 border-transparent"
              }`}
            >
              {showBetControls && renderBetControls(false)}
            </div>

            <div
              className={`flex-[999_1_420px] min-w-0 bg-bp-surface rounded-[20px] px-5 py-[18px] flex flex-col gap-3.5 ${
                isMyPlayTurn ? "border-2 border-bp-accent" : "border border-bp-border"
              }`}
            >
              <div className="flex justify-between items-center gap-3 flex-wrap min-w-0">
                <span className="font-mono text-[11px] tracking-[0.1em] uppercase text-bp-muted">{t("yourHand")}</span>
                {renderStatusLine(false)}
              </div>
              <div className="flex gap-3 flex-wrap justify-center items-center pt-3 pb-1 min-h-[160px]">
                {renderHand("normal")}
              </div>
              {errorMessage && <p className="m-0 text-bp-warning text-sm text-center">{errorMessage}</p>}
            </div>
          </section>
        </div>

        {sharedDialogs}
      </div>
    </>
  )
}
