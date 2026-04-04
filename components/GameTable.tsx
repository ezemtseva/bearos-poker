"use client"

import React from "react"
import { useState, useEffect, useRef } from "react"
import type { Player, Card, GameData, ScoreTableRow, PlayerScore } from "../types/game"
import { TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import PlayingCard from "./PlayingCard"
import { useToast } from "@/hooks/use-toast"
import GameResultsDialog from "./GameResultsDialog"
import PokerCardDialog from "./PokerCardDialog"
// Add this at the top of the file, after the imports
import { useMemo } from "react"
// Add the import for ConfigureGameDialog near the top with other imports
import ConfigureGameDialog, { type GameLength } from "./ConfigureGameDialog"
// Add this import at the top with other imports
import { useSound } from "@/hooks/use-sound"
import { Settings, ChevronLeft, ChevronRight } from "lucide-react"
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
  onConfigureGame: (gameLength: GameLength, hasGoldenRound: boolean, hasNoTrumps: boolean) => void
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

function StarIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" fill="#FFE066" stroke="#FFD700" strokeWidth="1" strokeLinejoin="round"/>
    </svg>
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
  const [tableSkin, setTableSkin] = useState("blue")
  const [seatSkin, setSeatSkin] = useState("gray")
  const [cardBackSkin, setCardBackSkin] = useState("black")
  const [cardsOnSeats, setCardsOnSeats] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const lastReactionTimestampRef = useRef<Map<string, number>>(new Map())
  const [betNotifications, setBetNotifications] = useState<Set<string>>(new Set())
  const prevBetsRef = useRef<Map<string, number | null>>(new Map())
  const betNotifFirstRender = useRef(true)
  const { toast } = useToast()
  // Add this inside the GameTable component, near the top with other hooks
  const { playSound, stopSound } = useSound()

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

  // Add this function inside the GameTable component
  const renderGameStatusMessage = () => {
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
      if (isCurrentPlayerTurn) {
        return <span className="text-amber-500 italic">{t("goldenRoundYourTurn")}</span>
      } else {
        return (
          <span className="text-amber-500 italic">
            {t("goldenRoundWaiting")} {players[currentTurn]?.name || "..."} {t("toPlayCard")}
          </span>
        )
      }
    }

    // If all bets are placed, we're in the card playing phase
    if (safeGameData.allBetsPlaced) {
      if (isCurrentPlayerTurn) {
        return <span className="text-green-600 italic">{t("yourTurnCard")}</span>
      } else {
        return (
          <span className="text-yellow-600 italic">
            {t("waitingFor")} {players[currentTurn]?.name || "..."} {t("toPlayCard")}
          </span>
        )
      }
    }

    // If the player has already placed a bet, show a stable message
    if (currentPlayer && currentPlayer.bet !== null) {
      return <span className="text-yellow-600 italic">{t("waitingOthersBet")}</span>
    }

    // If all players have bet but allBetsPlaced is false, we're in the transition period
    if (allPlayersHaveBet && !safeGameData.allBetsPlaced) {
      return <span className="text-yellow-600 italic">{t("preparingRound")}</span>
    }

    // If it's the current player's turn to bet, show that message
    if (isCurrentPlayerBettingTurn) {
      return <span className="text-green-600 italic">{t("yourTurnBet")}</span>
    }

    // Otherwise, we're waiting for another player to bet
    return (
      <span className="text-yellow-600 italic">
        {t("waitingFor")}{" "}
        {currentBettingPlayerName.startsWith("Waiting")
          ? players.find((p) => p.name !== currentPlayerName)?.name || "..."
          : currentBettingPlayerName}{" "}
        {t("toPlaceBet")}
      </span>
    )
  }

  // Add this function to handle saving the game configuration
  const handleSaveGameConfig = (gameLength: GameLength, hasGoldenRound: boolean, hasNoTrumps: boolean) => {
    onConfigureGame(gameLength, hasGoldenRound, hasNoTrumps)
  }

  // Score table helpers (used in both panel and layout)
  const stCurrentIdx = players.findIndex((p) => p.name === currentPlayerName)
  const orderedPlayers = stCurrentIdx > 0
    ? [players[stCurrentIdx], ...players.filter((_, i) => i !== stCurrentIdx)]
    : [...players]
  const visibleWidth = 70 + Math.max(1, Math.min(scoreTablePlayerCount, players.length || 1)) * 200

  const isBottomPosition = scoreTablePosition === "bottom"

  // Chevron direction depends on position
  const collapseIcon = isBottomPosition
    ? (scoreTableExpanded ? "▼" : "▲")
    : (scoreTablePosition === "right" ? (scoreTableExpanded ? "▶" : "◀") : (scoreTableExpanded ? "◀" : "▶"))

  const scoreTablePanel = (
    <div
      className={`flex-shrink-0 transition-all duration-300 mx-auto bg-gray-800/60 rounded-xl overflow-hidden flex flex-col min-h-0 ${
        isBottomPosition
          ? scoreTableExpanded ? "max-h-64" : "h-10"
          : scoreTableExpanded ? "" : "w-auto"
      }`}
      style={scoreTableExpanded
        ? isBottomPosition
          ? { width: visibleWidth }
          : { width: visibleWidth, maxHeight: "calc(100vh - 32px)" }
        : undefined}
    >
      {/* Header row: toggle + title + gear */}
      <div className="flex items-center justify-between px-4 py-2.5 gap-2">
        <span className="text-[16px] font-semibold text-gray-300 flex-1 whitespace-nowrap">{t("scoreTable")}</span>
        {scoreTableExpanded && (
          <button
            onClick={() => setShowScoreSettings((v) => !v)}
            className="text-gray-400 hover:text-white"
            title="Score table settings"
          >
            <Settings size={15} />
          </button>
        )}
        <button
          onClick={() => setScoreTableExpanded((v) => !v)}
          className="text-xs text-gray-300 hover:text-white"
        >
          {collapseIcon}
        </button>
      </div>

      {/* Settings panel */}
      {scoreTableExpanded && showScoreSettings && (
        <div className="px-4 pb-3 flex flex-wrap items-center gap-3">
          <span className="text-sm text-white whitespace-nowrap">{t("playersShown")}</span>
          <select
            value={scoreTablePlayerCount}
            onChange={(e) => setScoreTablePlayerCount(Number(e.target.value))}
            className="text-sm bg-gray-700 text-white border border-gray-600 rounded px-2 py-1"
          >
            {Array.from({ length: Math.max(0, players.length - 1) }, (_, i) => i + 2).map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
          <span className="text-sm text-white whitespace-nowrap">{t("position")}</span>
          <select
            value={scoreTablePosition}
            onChange={(e) => setScoreTablePosition(e.target.value as "left" | "right" | "bottom")}
            className="text-sm bg-gray-700 text-white border border-gray-600 rounded px-2 py-1"
          >
            <option value="left">{t("posLeft")}</option>
            <option value="right">{t("posRight")}</option>
            <option value="bottom">{t("posBottom")}</option>
          </select>
        </div>
      )}

      {scoreTableExpanded && (
        <div style={{ maxWidth: visibleWidth, overflowX: "auto" }}>
          <div
            style={{ maxHeight: "748px", overflowY: "auto", scrollbarWidth: "none", msOverflowStyle: "none" } as React.CSSProperties}
            className="[&::-webkit-scrollbar]:hidden"
          >
          <table className="w-full caption-bottom text-sm">
            <TableHeader>
              <TableRow>
                <TableHead className="text-white font-bold text-left border-r border-gray-600 border-b-0"></TableHead>
                {orderedPlayers.map((player, pi) => (
                  <TableHead key={player.name} colSpan={4} className={`text-center text-white font-bold max-w-[200px] ${pi < orderedPlayers.length - 1 ? "border-r border-gray-600" : ""}`}>
                    <div className="flex items-center justify-center gap-1 min-w-0">
                      {player.score === highestScore && highestScore > 0 && <span className="flex-shrink-0"><StarIcon size={16} /></span>}
                      <span className="truncate min-w-0" title={player.name}>{player.name}</span>
                    </div>
                  </TableHead>
                ))}
              </TableRow>
              <TableRow>
                <TableHead className="border-r border-gray-600">{t("roundLabel")}</TableHead>
                {orderedPlayers.map((player, pi) => (
                  <React.Fragment key={player.name}>
                    <TableHead className="text-center">{t("betLabel")}</TableHead>
                    <TableHead className="text-center">{t("winsLabel")}</TableHead>
                    <TableHead className="text-center">{t("pointsLabel")}</TableHead>
                    <TableHead className={`text-center ${pi < orderedPlayers.length - 1 ? "border-r border-gray-600" : ""}`}>{t("roundIncrLabel")}</TableHead>
                  </React.Fragment>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {safeGameData.scoreTable && safeGameData.scoreTable.length > 0 ? (
                safeGameData.scoreTable.map((round: ScoreTableRow) => (
                  <TableRow
                    key={round.roundId}
                    className={`
                    ${round.roundId === currentRound ? "bg-blue-400/70" : ""}
                    ${round.roundId < currentRound ? "bg-gray-600/70" : ""}
                  `}
                  >
                    <TableCell className="border-r border-gray-600">{
                      round.roundName === "NT" ? (locale === "ru" ? "Б" : "NT") :
                      round.roundName === "B" && locale === "ru" ? "Т" :
                      round.roundName === "G" && locale === "ru" ? "З" :
                      round.roundName
                    }</TableCell>
                    {(() => {
                      const roundMaxPoints = Math.max(...orderedPlayers.map(p => round.scores[p.name]?.cumulativePoints ?? -Infinity))
                      return orderedPlayers.map((player, pi) => {
                      const scoreData = round.scores[player.name]
                      const playerScore: PlayerScore = scoreData || {
                        cumulativePoints: 0,
                        roundPoints: 0,
                        bet: null,
                      }
                      const hasScore = !!scoreData && round.roundId <= currentRound
                      const wins =
                        round.roundId === currentRound ? player.roundWins || 0 : round.scores[player.name]?.wins || 0
                      const isRoundLeader = hasScore && playerScore.cumulativePoints === roundMaxPoints && roundMaxPoints > 0
                      return (
                        <React.Fragment key={player.name}>
                          <TableCell className="text-center">
                            {hasScore ? (playerScore.bet !== null ? playerScore.bet : "-") : "-"}
                          </TableCell>
                          <TableCell className="text-center">
                            {round.roundId === currentRound
                              ? wins
                              : hasScore
                                ? (playerScore.wins !== undefined ? playerScore.wins : "-")
                                : "-"}
                          </TableCell>
                          <TableCell className={`text-center font-bold ${isRoundLeader ? "bg-gray-200/20" : ""} ${hasScore && playerScore.cumulativePoints > 0 ? "text-green-400" : hasScore && playerScore.cumulativePoints < 0 ? "text-red-400" : ""}`}>
                            {!hasScore ? "-" : playerScore.cumulativePoints}
                          </TableCell>
                          <TableCell
                            className={`text-center italic ${pi < orderedPlayers.length - 1 ? "border-r border-gray-600" : ""} ${
                              hasScore && playerScore.roundPoints < 0
                                ? "text-red-400/50"
                                : hasScore && playerScore.roundPoints > 0
                                  ? "text-green-400/50"
                                  : ""
                            }`}
                          >
                            {!hasScore ? "-" : playerScore.roundPoints > 0
                              ? `+${playerScore.roundPoints}`
                              : playerScore.roundPoints === 0
                                ? "-"
                                : playerScore.roundPoints}
                          </TableCell>
                        </React.Fragment>
                      )
                    })})()}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell className="border-r border-gray-600"></TableCell>
                  <TableCell colSpan={orderedPlayers.length * 4} className="italic text-gray-400">{t("gameLogPlaceholder")}</TableCell>
                </TableRow>
              )}
            </TableBody>
          </table>
          </div>
        </div>
      )}
    </div>
  )

  // ─── Mobile layout ───────────────────────────────────────────────────────────
  const mobileTopOpponents = players.slice(0, 3)
  const mobileBottomOpponents = players.slice(3)
  const mobileSeatBgColor = SEAT_SKINS.find(s => s.id === seatSkin)?.value ?? "#374151"

  const renderMobileSeat = (player: typeof players[0], i: number, rowSize?: number, emojiDown = false) => {
    const isCardTurnM = safeGameData.allBetsPlaced && players[currentTurn]?.name === player.name
    const isBettingTurnM = !safeGameData.allBetsPlaced && typeof safeGameData.currentBettingTurn === "number" && players[safeGameData.currentBettingTurn]?.name === player.name
    const isActiveTurnM = isCardTurnM || isBettingTurnM
    const betValueM = shouldShowBetBanners() && player.bet !== null ? player.bet : "—"
    const isLeaderM = player.score === highestScore && highestScore > 0
    const seatWidth = "flex-1 min-w-0"
    return (
      <div
        key={i}
        className={`relative rounded-xl border-2 p-2 ${seatWidth} ${isActiveTurnM ? "border-green-400 animate-bet-border" : "border-gray-600/30"}`}
        style={{ backgroundColor: mobileSeatBgColor }}
        onClick={() => { if (player.name.length > 8) { setMobileNamePopup(player.name); setTimeout(() => setMobileNamePopup(null), 2000) } }}
      >
        {isLeaderM && (
          <span className="absolute top-0 right-0 translate-x-1/2 -translate-y-1/2 leading-none"><StarIcon size={16} /></span>
        )}
        <div className="flex items-center gap-1 mb-1 min-w-0">
          <div className="w-5 h-5 rounded-full bg-gray-500 flex items-center justify-center text-[10px] overflow-hidden flex-shrink-0">
            {player.avatar ? (player.avatar.startsWith("data:") || player.avatar.startsWith("http") ? <img src={player.avatar} alt="" className="w-full h-full object-cover" /> : <span>{player.avatar}</span>) : player.name[0]}
          </div>
          <span className="text-[11px] font-medium truncate text-gray-100 min-w-0">{player.name}</span>
          {mobileNamePopup === player.name && (
            <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 z-50 bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white text-xs font-semibold shadow-xl whitespace-nowrap" onClick={() => setMobileNamePopup(null)}>
              {player.name}
            </div>
          )}
        </div>
        <div className="grid grid-cols-3 text-[11px] text-center">
          <div><div className="text-gray-400">{t("pts")}</div><div className={`font-bold ${player.score > 0 ? "text-green-400" : player.score < 0 ? "text-red-400" : ""}`}>{player.score}</div></div>
          <div><div className="text-gray-400">{t("seatBetLabel")}</div><div className="font-bold text-purple-400">{betValueM}</div></div>
          <div><div className="text-gray-400">{t("seatWinsLabel")}</div><div className="font-bold text-blue-400">{player.roundWins}</div></div>
        </div>
        {activeReactions.get(player.name) && (
          <div
            key={activeReactions.get(player.name)!.key}
            className={`absolute left-1/2 pointer-events-none text-2xl z-20 ${emojiDown ? "reaction-float-down" : "reaction-float"}`}
            style={emojiDown ? { bottom: "-10px" } : { top: "-10px" }}
          >
            {activeReactions.get(player.name)!.emoji}
          </div>
        )}
      </div>
    )
  }

  if (isMobile) return (
    <div className="flex flex-col text-white pb-6">
      {/* Header */}
      {gameStarted ? (
        <div className="flex justify-between items-center px-4 py-2 text-sm bg-black/20 rounded-lg mx-4 mt-1">
          <span className="text-gray-400">{t("tableIdLabel")} <strong className="text-white">{tableId}</strong></span>
          <span className="text-gray-400">{t("round")} <strong className="text-white">{currentRound}</strong></span>
          <span className="text-gray-400">{t("playLabel")} <strong className="text-white">{currentPlay}</strong></span>
        </div>
      ) : (
        <div className="px-4 py-2 text-sm text-center text-gray-400 mt-1">
          <div>{t("tableIdLabel")} {tableId}</div>
          {players.length < 2 && <p className="text-yellow-600 italic mt-1">{t("waitingMorePlayers")}</p>}
        </div>
      )}

      {/* Pre-game */}
      {!gameStarted && (
        <div className="px-4 py-3">
          <div className="flex flex-col gap-2 mb-3">
            {players.map((p, i) => (
              <div key={i} className="flex items-center gap-2 bg-black/20 rounded-lg px-3 py-2">
                <div className="w-6 h-6 rounded-full bg-gray-600 flex items-center justify-center text-xs overflow-hidden">
                  {p.avatar ? (p.avatar.startsWith("data:") || p.avatar.startsWith("http") ? <img src={p.avatar} alt="" className="w-full h-full object-cover" /> : <span>{p.avatar}</span>) : p.name[0]}
                </div>
                <span className="text-sm">{p.name}</span>
              </div>
            ))}
          </div>

          {/* Table preview — same style as community cards area */}
          <div
            className="flex justify-center items-center min-h-[150px] rounded-xl p-3 my-3"
            style={(() => {
              if (tableSkin === "custom_table") { try { const u = localStorage.getItem("customTableSkinUrl"); if (u) return { backgroundImage: `url(${u})`, backgroundSize: "cover", backgroundPosition: "center" } } catch {} }
              const skin = TABLE_SKINS.find(s => s.id === tableSkin)
              if (!skin) return { backgroundColor: "#0f4c81" }
              if (skin.type === "image") return { backgroundImage: `url(${skin.value})`, backgroundSize: "cover", backgroundPosition: "center" }
              return { backgroundColor: skin.value }
            })()}
          />

          <div className="flex gap-2 flex-wrap">
            <Button size="sm" onClick={onShare}>{t("shareLink")}</Button>
            {isOwner && players.length >= 2 && <Button size="sm" onClick={() => setShowConfigureDialog(true)}>{t("configure")}</Button>}
            {canStartGame && <Button size="sm" onClick={onStartGame}>{ t("startGame") }</Button>}
          </div>
        </div>
      )}

      {gameStarted && <>
        {/* Top opponents (max 3) */}
        <div className="px-4 pt-3">
          <div className={`flex gap-2 ${mobileTopOpponents.length < 3 ? "justify-center" : ""}`}>
            {mobileTopOpponents.map((player, i) => renderMobileSeat(player, i, mobileTopOpponents.length, true))}
          </div>
        </div>

        {/* Community cards + betting overlay */}
        <div className="px-4 py-3">
          <div
            className="relative flex justify-center gap-2 min-h-[150px] items-center rounded-xl p-3"
            style={(() => {
              if (tableSkin === "custom_table") { try { const u = localStorage.getItem("customTableSkinUrl"); if (u) return { backgroundImage: `url(${u})`, backgroundSize: "cover", backgroundPosition: "center" } } catch {} }
              const skin = TABLE_SKINS.find(s => s.id === tableSkin)
              if (!skin) return { backgroundColor: "#0f4c81" }
              if (skin.type === "image") return { backgroundImage: `url(${skin.value})`, backgroundSize: "cover", backgroundPosition: "center" }
              return { backgroundColor: skin.value }
            })()}
          >
            {cardsOnTable.length === 0
              ? null
              : cardsOnTable.map((card, index) => (
                <div key={index} className="relative">
                  <PlayingCard
                    suit={card.suit} value={card.value} disabled size="small"
                    className={safeGameData.highestCard?.suit === card.suit && safeGameData.highestCard?.value === card.value ? "bg-yellow-100" : (isNoSuitRound && card.suit === "diamonds") ? "bg-white" : ""}
                  />
                  {card.suit === "spades" && card.value === 7 && card.pokerOption && (
                    <div className={`absolute bottom-0 left-0 right-0 text-white text-[9px] py-0.5 text-center ${card.pokerOption === "Trumps" ? "bg-red-300" : card.pokerOption === "Poker" ? "bg-yellow-300" : "bg-blue-300"}`}>
                      {card.pokerOption}
                    </div>
                  )}
                </div>
              ))
            }

            {/* Betting overlay — shown only when it's player's turn to bet */}
            {currentPlayer?.bet === null && isCurrentPlayerBettingTurn && (
              <div className={`absolute inset-0 rounded-xl flex flex-col items-center justify-center gap-2 bg-black/70 ${betBlinkEnabled ? "animate-bet-border" : ""}`}>
                <h2 className="text-sm font-bold text-white">{t("makeYourBet")}</h2>
                <div className="flex items-center gap-4">
                  <button onClick={() => setBetAmount(v => Math.max(0, (v ?? 0) - 1))} className="w-10 h-10 rounded-xl bg-gray-700 hover:bg-gray-600 text-white border border-gray-500 text-2xl font-bold">−</button>
                  <span className="text-4xl font-bold w-10 text-center select-none text-white">{betAmount ?? 0}</span>
                  <button onClick={() => setBetAmount(v => Math.min(cardsThisRound, (v ?? 0) + 1))} className="w-10 h-10 rounded-xl bg-gray-700 hover:bg-gray-600 text-white border border-gray-500 text-2xl font-bold">+</button>
                </div>
                {(() => { const fb = calculateForbiddenBet(); return fb !== null ? <p className="text-red-400 text-xs italic text-center">{t("youCannotBet")} {fb}</p> : null })()}
                <Button onClick={handlePlaceBet}>{t("confirm")}</Button>
              </div>
            )}
          </div>
        </div>

        {/* Bottom opponents (4th–6th), centered under table */}
        {mobileBottomOpponents.length > 0 && (
          <div className="px-4 pb-2">
            <div className={`flex gap-2 ${mobileBottomOpponents.length < 3 ? "justify-center" : ""}`}>
              {mobileBottomOpponents.map((player, i) => renderMobileSeat(player, i + 3, mobileBottomOpponents.length))}
            </div>
          </div>
        )}

        {/* Your hand + emoji button */}
        <div className="px-4 mt-1">
          <div className="bg-black/20 rounded-lg px-3 pt-2 pb-3">
          <div className="relative flex items-center justify-center mb-2">
            <h2 className="text-sm font-bold">{t("yourHand")}</h2>
            <div className="absolute right-0">
              <button
                onClick={() => setShowMobileEmojiPanel(v => !v)}
                className="text-xl active:scale-110 transition-transform"
              >😊</button>
              {showMobileEmojiPanel && (
                <>
                <div className="fixed inset-0 z-10" onClick={() => setShowMobileEmojiPanel(false)} />
                <div className="absolute bottom-full right-0 mb-2 z-20 bg-gray-900 border border-white/10 rounded-xl p-2 shadow-xl w-52">
                  <div className="grid grid-cols-6 gap-1">
                    {EMOJI_LIST.map(emoji => (
                      <button key={emoji} onClick={() => { onSendReaction(emoji); setShowMobileEmojiPanel(false) }} className="text-xl hover:scale-125 active:scale-125 transition-transform text-center">{emoji}</button>
                    ))}
                  </div>
                </div>
                </>
              )}
            </div>
          </div>
          <div className="flex gap-1 pb-2 justify-center min-h-[84px] items-center">
            {currentPlayer?.hand?.length
              ? currentPlayer.hand.map((card, index) => (
                <PlayingCard
                  key={index} suit={card.suit} value={card.value} size={(currentPlayer.hand.length >= 6) ? "small" : "medium"}
                  onClick={() => handlePlayCard(card)}
                  disabled={!isCurrentPlayerTurn || isClearing || !isValidCardToPlay(card) || !safeGameData.allBetsPlaced || isPlayingCard}
                  showBack={shouldShowCardBacks}
                  className={`${isNoSuitRound && card.suit === "diamonds" ? "bg-white" : ""} ${!isCurrentPlayerTurn || !isValidCardToPlay(card) || !safeGameData.allBetsPlaced || isPlayingCard ? "opacity-50" : ""}`}
                />
              ))
              : <p className="italic text-gray-400 text-sm">{gameStarted ? t("allCardsPlayed") : t("cardsHereHint")}</p>
            }
          </div>
          </div>
        </div>

        {/* Status */}
        <div className="px-4 pt-1 text-center text-sm">
          {currentRound <= getTotalRounds(safeGameData.gameLength || "basic", safeGameData.hasGoldenRound || false, safeGameData.hasNoTrumps || false) && renderGameStatusMessage()}
          {errorMessage && <p className="text-red-500 mt-1">{errorMessage}</p>}
        </div>

        {/* Score table (mobile) */}
        {safeGameData.scoreTable && safeGameData.scoreTable.length > 0 && (
          <div className="mx-4 mt-4 mb-4 bg-gray-800/60 rounded-xl overflow-hidden">
            <button
              onClick={() => setScoreTableExpanded(v => !v)}
              className="w-full flex items-center justify-between px-4 py-2.5 text-sm font-semibold text-gray-300 hover:text-white"
            >
              <span>{t("scoreTable")}</span>
              <span className="text-xs">{scoreTableExpanded ? "▲" : "▼"}</span>
            </button>
            {scoreTableExpanded && (
              <div className="overflow-x-auto">
                <table className="text-[11px] w-full">
                  <thead>
                    <tr className="border-t border-white/10">
                      <th className="px-2 py-1 border-r border-white/10 min-w-[28px]" />
                      {orderedPlayers.map(p => (
                        <th key={p.name} colSpan={4} className="px-2 py-1 text-center text-gray-200 font-semibold border-r border-white/10 whitespace-nowrap min-w-[104px]"><span className="inline-flex items-center gap-1">{p.score === highestScore && highestScore > 0 && <StarIcon size={13} />}{p.name.length > 8 ? p.name.slice(0, 8) + "…" : p.name}</span></th>
                      ))}
                    </tr>
                    <tr className="border-t border-white/5">
                      <th className="px-2 py-1 text-center text-gray-500 font-normal border-r border-white/10 min-w-[28px]">Rnd</th>
                      {orderedPlayers.map(p => (
                        <React.Fragment key={p.name}>
                          <th className="px-1 py-1 text-center text-gray-500 font-normal min-w-[26px]">{t("betLabel")}</th>
                          <th className="px-1 py-1 text-center text-gray-500 font-normal min-w-[26px]">{t("winsLabel")}</th>
                          <th className="px-1 py-1 text-center text-gray-500 font-normal min-w-[26px]">Pnts</th>
                          <th className="px-1 py-1 text-center text-gray-500 font-normal border-r border-white/10 min-w-[26px]">{t("roundIncrLabel")}</th>
                        </React.Fragment>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {safeGameData.scoreTable.map((round: ScoreTableRow) => (
                      <tr key={round.roundId} className={`border-t border-white/5 ${round.roundId === currentRound ? "bg-blue-400/20" : round.roundId < currentRound ? "bg-gray-600/20" : ""}`}>
                        <td className="px-2 py-1 text-center text-gray-400 border-r border-white/10">{
                          round.roundName === "NT" ? (locale === "ru" ? "Б" : "NT") :
                          round.roundName === "B" && locale === "ru" ? "Т" :
                          round.roundName === "G" && locale === "ru" ? "З" :
                          round.roundName
                        }</td>
                        {(() => {
                          const roundMaxPoints = Math.max(...orderedPlayers.map(p => round.scores[p.name]?.cumulativePoints ?? -Infinity))
                          return orderedPlayers.map(player => {
                          const s: PlayerScore = round.scores[player.name] || { bet: null, wins: 0, cumulativePoints: 0, roundPoints: 0 }
                          const hasScore = !!round.scores[player.name] && round.roundId <= currentRound
                          const isRoundLeader = hasScore && s.cumulativePoints === roundMaxPoints && roundMaxPoints > 0
                          return (
                            <React.Fragment key={player.name}>
                              <td className="px-1 py-1 text-center text-gray-300">{hasScore ? (s.bet !== null ? s.bet : "-") : "-"}</td>
                              <td className="px-1 py-1 text-center text-gray-300">{hasScore ? (s.wins !== undefined ? s.wins : "-") : "-"}</td>
                              <td className={`px-1 py-1 text-center font-bold ${isRoundLeader ? "bg-gray-200/20" : ""} ${hasScore && s.cumulativePoints > 0 ? "text-green-400" : hasScore && s.cumulativePoints < 0 ? "text-red-400" : ""}`}>{hasScore ? s.cumulativePoints : "-"}</td>
                              <td className="px-1 py-1 text-center italic border-r border-white/10">
                                {!hasScore ? "-" : s.roundPoints === 0 ? "-" : <span className={s.roundPoints > 0 ? "text-green-400/50" : "text-red-400/50"}>{s.roundPoints > 0 ? `+${s.roundPoints}` : s.roundPoints}</span>}
                              </td>
                            </React.Fragment>
                          )
                        })})()}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </>}

      {/* Shared dialogs */}
      <GameResultsDialog isOpen={showResultsDialog} onClose={() => { setShowResultsDialog(false); stopSound("gameOver") }} players={players} />
      <PokerCardDialog isOpen={showPokerCardDialog} onClose={() => setShowPokerCardDialog(false)} onOptionSelect={handlePokerCardOptionSelect} isFirstCard={cardsOnTable.length === 0} isValidSimple={isValidSimplePlay()} availableOptions={cardsOnTable.length === 0 ? ["Trumps", "Poker", "Simple"] : ["Poker", "Simple"]} />
      <ConfigureGameDialog isOpen={showConfigureDialog} onClose={() => setShowConfigureDialog(false)} onSave={handleSaveGameConfig} currentGameLength={safeGameData.gameLength || "short"} currentHasGoldenRound={safeGameData.hasGoldenRound || false} currentHasNoTrumps={safeGameData.hasNoTrumps || false} />
      {showSuitPickerDialog && (
        <Dialog open={showSuitPickerDialog} onOpenChange={() => setShowSuitPickerDialog(false)}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>{t("selectSuitTitle")}</DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <div className="space-y-2">
                {(["spades", "clubs", "hearts", "diamonds"] as const).map(suit => {
                  const isRed = suit === "hearts" || suit === "diamonds"
                  return (
                    <Button key={suit} onClick={() => handleSuitSelected(suit)}
                      className={`w-full justify-start text-left font-medium ${isRed ? "bg-red-900/50 hover:bg-red-800/70 border-red-700/50" : "bg-gray-800/80 hover:bg-gray-700/80 border-gray-600/50"} text-white`}
                      variant="outline">
                      {t(`suit${suit.charAt(0).toUpperCase() + suit.slice(1)}` as "suitSpades" | "suitHearts" | "suitDiamonds" | "suitClubs")}
                    </Button>
                  )
                })}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
      {showAvatarPicker && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => setShowAvatarPicker(false)}>
          <div className="bg-gray-800 rounded-xl p-4 w-80 shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-white font-semibold text-sm">{t("emojiAvatar")}</h3>
              <button onClick={() => setShowAvatarPicker(false)} className="text-gray-400 hover:text-white text-lg">✕</button>
            </div>
            <div className="flex gap-2 mb-4">
              <button className={`flex-1 py-1.5 rounded text-xs ${avatarPickerTab === "emoji" ? "bg-blue-600 text-white" : "bg-gray-700 text-gray-300"}`} onClick={() => setAvatarPickerTab("emoji")}>{t("emojiTab")}</button>
              <button className={`flex-1 py-1.5 rounded text-xs ${avatarPickerTab === "image" ? "bg-blue-600 text-white" : "bg-gray-700 text-gray-300"}`} onClick={() => setAvatarPickerTab("image")}>{t("avatarTab")}</button>
            </div>
            <div className="h-[220px] overflow-y-auto [&::-webkit-scrollbar]:hidden" style={{ scrollbarWidth: "none" }}>
              {avatarPickerTab === "emoji" && (
                <div className="grid grid-cols-6 gap-1">
                  {EMOJI_LIST.map(emoji => <button key={emoji} onClick={() => { onSendReaction(emoji); setShowAvatarPicker(false) }} className="text-2xl hover:scale-125 transition-transform text-center">{emoji}</button>)}
                </div>
              )}
              {avatarPickerTab === "image" && (
                <div className="flex flex-col items-center gap-2 py-2">
                  {players.find(p => p.name === currentPlayerName)?.avatar && <img src={players.find(p => p.name === currentPlayerName)!.avatar!} alt="Avatar" className="w-16 h-16 rounded-full object-cover" />}
                  <Button size="sm" onClick={() => fileInputRef.current?.click()}>{t("choosePhoto")}</Button>
                  {players.find(p => p.name === currentPlayerName)?.avatar && <Button size="sm" className="bg-white hover:bg-gray-100 text-gray-900" onClick={() => { onSetAvatar(""); setShowAvatarPicker(false) }}>{t("removePhoto")}</Button>}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileSelect} />
      <style jsx global>{`
        @keyframes betBorder { 0%,100%{border-color:rgb(74 222 128);box-shadow:0 0 8px rgb(74 222 128/.6);}50%{border-color:transparent;box-shadow:none;} }
        .animate-bet-border{animation:betBorder 1s ease-in-out infinite;}
        @keyframes reactionFloat{0%{opacity:1;transform:translateX(-50%) translateY(0) scale(1);}40%{opacity:1;transform:translateX(-50%) translateY(-50px) scale(1.4);}100%{opacity:0;transform:translateX(-50%) translateY(-90px) scale(0.8);}}
        .reaction-float{animation:reactionFloat 3s ease-out forwards;}
        @keyframes reactionFloatDown{0%{opacity:1;transform:translateX(-50%) translateY(0) scale(1);}40%{opacity:1;transform:translateX(-50%) translateY(50px) scale(1.4);}100%{opacity:0;transform:translateX(-50%) translateY(90px) scale(0.8);}}
        .reaction-float-down{animation:reactionFloatDown 3s ease-out forwards;}
      `}</style>

    </div>
  )
  // ─── End mobile layout ────────────────────────────────────────────────────────

  // ─── Tablet: scale the desktop layout to fit viewport ────────────────────────
  const tabletScale = isTablet ? Math.min(1, (viewportWidth - 32) / 900) : 1

  return (
    <div style={isTablet ? { zoom: tabletScale } : undefined}
      className={`flex gap-4 ${isBottomPosition ? "flex-col" : "flex-row items-start"}`}>

      {/* Score table: left or right position */}
      {scoreTablePosition === "left" && scoreTablePanel}

      {/* Main content */}
      <div className="flex-1 space-y-8">

      {/* Game Info — fixed in center of nav bar */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 h-[64px] flex items-center z-20 pointer-events-none">
        {gameStarted ? (
          <div className="inline-flex justify-center items-center space-x-6 px-4 py-2 bg-black/40 rounded-lg backdrop-blur-sm">
            <span className="text-gray-400">{t("tableIdLabel")} <strong className="text-white">{tableId}</strong></span>
            <span className="text-gray-400">{t("round")}: <strong className="text-white">{currentRound}</strong></span>
            <span className="text-gray-400">{t("playLabel")}: <strong className="text-white">{currentPlay}</strong></span>
            <span className="text-gray-400">{t("currentTurnLabel")}: <strong className="text-white">{players[currentTurn]?.name || "..."}</strong></span>
          </div>
        ) : (
          <div className="inline-flex justify-center items-center space-x-4 px-4 py-2">
            <span className="text-gray-300">{t("tableIdLabel")} <strong className="text-white">{tableId}</strong></span>
            {players.length < 2 ? (
              <span className="text-yellow-500 italic">{t("waitingMorePlayers")}</span>
            ) : (
              <span className="text-yellow-500 italic">{t("waitingStart")}</span>
            )}
          </div>
        )}
      </div>

      {/* Table with seats */}
      <div className="relative w-[800px] h-[400px] mx-auto overflow-visible" style={{ marginTop: cardsOnSeats && gameStarted ? "104px" : "80px" }}>
        {/* Table shadow */}
        <div className="absolute inset-0 rounded-[200px/100px] bg-black/20 transform translate-y-2 blur-md"></div>

        {/* Table rail (border) */}
        <div className="absolute inset-0 rounded-[200px/100px] bg-[#e6e0d4] shadow-lg"></div>

        {/* Table felt */}
        <div
          className="absolute inset-[20px] rounded-[180px/90px]"
          style={(() => {
            if (tableSkin === "custom_table") { try { const u = localStorage.getItem("customTableSkinUrl"); if (u) return { backgroundImage: `url(${u})`, backgroundSize: "cover", backgroundPosition: "center" } } catch {} }
            const skin = TABLE_SKINS.find((s) => s.id === tableSkin)
            if (!skin) return { backgroundColor: "#0f4c81" }
            if (skin.type === "image") return { backgroundImage: `url(${skin.value})`, backgroundSize: "cover", backgroundPosition: "center" }
            return { backgroundColor: skin.value }
          })()}
        >
          {/* Inner felt line */}
          <div className="absolute inset-[30px] rounded-[150px/75px] border-2 border-[#0a3d6a] opacity-50"></div>
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

          // Score color: positive = green, negative = red, zero = gray
          let scoreColor = "text-green-400"
          if (player.score === 0) {
            scoreColor = "text-gray-400"
          } else if (player.score < 0) {
            scoreColor = "text-red-400"
          }

          const isCurrentTurn = safeGameData.allBetsPlaced && players[currentTurn]?.name === player.name
          const isBettingTurn =
            !safeGameData.allBetsPlaced &&
            typeof safeGameData.currentBettingTurn === "number" &&
            players[safeGameData.currentBettingTurn]?.name === player.name
          const isActiveTurn = isCurrentTurn || isBettingTurn
          const isLeader = player.score === highestScore && highestScore > 0
          const betValue = shouldShowBetBanners() && player.bet !== null ? player.bet : "—"

          // ─── Seat appearance — edit these to restyle seats ───────────────
          const seatBgColor    = SEAT_SKINS.find((s) => s.id === seatSkin)?.value ?? "#374151"
          const seatBg         = ""                      // color applied via inline style

          const seatText       = "text-gray-100"         // default text color
          const seatBorder     = "border-gray-500"       // default border
          const seatBorderTurn = "border-green-400 animate-bet-border"  // border when it's this player's turn
          const seatBorderLead = "border-yellow-400 ring-1 ring-yellow-400"              // leader highlight
          const dividerColor   = "border-gray-600"       // divider between name and stats rows
          const labelColor     = "text-gray-400"         // stat labels (pts / bet / wins)
          // ─────────────────────────────────────────────────────────────────

          const borderClass = isActiveTurn ? seatBorderTurn : seatBorder

          const isCurrentPlayerSeat = player.name === currentPlayerName
          const reaction = activeReactions.get(player.name)

          return (
            <div
              key={index}
              className="absolute -translate-x-1/2 -translate-y-1/2"
              style={{ left: `${left}px`, top: `${top}px` }}
            >
              {/* Reaction animation */}
              {reaction && (
                <div
                  key={reaction.key}
                  className="absolute left-1/2 pointer-events-none text-3xl reaction-float z-20"
                  style={{ top: "-10px" }}
                >
                  {reaction.emoji}
                </div>
              )}
              {/* Cards on seat — top seats: above the seat card */}
              {cardsOnSeats && gameStarted && player.hand.length > 0 && top < 200 && (() => {
                const cardCount = player.hand.length
                const gap = 2
                const cardW = Math.min(Math.floor((150 - gap * (cardCount - 1)) / cardCount), 32)
                const cardH = Math.round(cardW * 1.5)
                const skin = CARD_BACK_SKINS.find(s => s.id === cardBackSkin) ?? CARD_BACK_SKINS[0]
                return (
                  <div className="pointer-events-none absolute left-0 right-0 flex justify-center" style={{ gap: `${gap}px`, bottom: `calc(100% + 4px)` }}>
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
              })()}

              {/* Bet placed notification */}
              {betNotifications.has(player.name) && (
                <div className="absolute left-1/2 -translate-x-1/2 pointer-events-none z-20 -top-8">
                  <div className="bg-green-500 text-white text-xs font-bold px-2 py-1 rounded-full whitespace-nowrap">
                    ✓ {t("betPlaced")}
                  </div>
                </div>
              )}
              <div
                className={`relative w-[150px] rounded-xl shadow-lg border-2 ${seatBg} ${seatText} ${borderClass}`}
                style={{ backgroundColor: seatBgColor }}
              >
                {isLeader && (
                  <span className="absolute top-0 right-0 translate-x-1/2 -translate-y-1/2 leading-none"><StarIcon size={22} /></span>
                )}
                {/* Top row: avatar + name */}
                <div className="flex items-center gap-2 px-3 py-2">
                  <div
                    className={`relative w-7 h-7 rounded-full flex-shrink-0 overflow-hidden outline-none ${isCurrentPlayerSeat ? "cursor-pointer group" : ""}`}
                    onClick={isCurrentPlayerSeat ? () => { setShowAvatarPicker(true); setAvatarPickerTab("emoji") } : undefined}
                  >
                    {player.avatar ? (
                      <img src={player.avatar} alt={player.name} className="w-full h-full object-cover border-0 outline-none ring-0" />
                    ) : (
                      <div className="w-full h-full bg-gray-500 flex items-center justify-center text-white text-xs font-bold">
                        {player.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    {isCurrentPlayerSeat && (
                      <div className="absolute inset-0 bg-black/50 hidden group-hover:flex items-center justify-center rounded-full">
                        <span className="text-white text-[8px]">✏️</span>
                      </div>
                    )}
                  </div>
                  <span className="text-sm font-bold line-clamp-2 text-center break-words" title={player.name}>{player.name}</span>
                </div>
                {/* Stats row: pts | bet | wins */}
                <div className={`grid grid-cols-3 border-t ${dividerColor} px-1 py-1.5`}>
                  <div className="flex flex-col items-center">
                    <span className={`text-[10px] uppercase tracking-wide ${labelColor}`}>{t("pts")}</span>
                    <span className={`text-sm font-bold ${scoreColor}`}>{player.score}</span>
                  </div>
                  <div className="flex flex-col items-center">
                    <span className={`text-[10px] uppercase tracking-wide ${labelColor}`}>{t("seatBetLabel")}</span>
                    <span className="text-sm font-bold text-purple-300">{betValue}</span>
                  </div>
                  <div className="flex flex-col items-center">
                    <span className={`text-[10px] uppercase tracking-wide ${labelColor}`}>{t("seatWinsLabel")}</span>
                    <span className="text-sm font-bold text-blue-300">{player.roundWins}</span>
                  </div>
                </div>
              </div>

              {/* Cards on seat — bottom seats: below the seat card */}
              {cardsOnSeats && gameStarted && player.hand.length > 0 && top >= 200 && (() => {
                const cardCount = player.hand.length
                const gap = 2
                const cardW = Math.min(Math.floor((150 - gap * (cardCount - 1)) / cardCount), 32)
                const cardH = Math.round(cardW * 1.5)
                const skin = CARD_BACK_SKINS.find(s => s.id === cardBackSkin) ?? CARD_BACK_SKINS[0]
                return (
                  <div className="pointer-events-none absolute left-0 right-0 flex justify-center" style={{ gap: `${gap}px`, top: `calc(100% + 4px)` }}>
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
              })()}
            </div>
          )
        })}

        {/* Buttons in center of table (pre-game only) */}
        {!gameStarted && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center gap-2 z-10">
            <Button onClick={onShare}>{t("shareGameLink")}</Button>
            {isOwner && players.length >= 2 && (
              <Button onClick={() => setShowConfigureDialog(true)}>{t("configureGameBtn")}</Button>
            )}
            {canStartGame && <Button onClick={onStartGame}>{ t("startGame") }</Button>}
          </div>
        )}

        {/* Cards on table */}
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 flex space-x-2">
          {cardsOnTable.map((card, index) => (
            <div key={index} className="relative">
              <PlayingCard
                suit={card.suit}
                value={card.value}
                disabled
                className={
                  safeGameData.highestCard &&
                  card.suit === safeGameData.highestCard.suit &&
                  card.value === safeGameData.highestCard.value
                    ? "bg-yellow-100"
                    : (isNoSuitRound && card.suit === "diamonds")
                      ? "bg-white"
                      : ""
                }
              />
              {card.suit === "spades" && card.value === 7 && card.pokerOption && (
                <div
                  className={`absolute bottom-0 left-0 right-0 text-white text-xs py-1 px-2 text-center
  ${card.pokerOption === "Trumps" ? "bg-red-300" : card.pokerOption === "Poker" ? "bg-yellow-300" : "bg-blue-300"}`}
                >
                  {card.pokerOption}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Spacer container to manage vertical spacing */}
      <div className="h-2"></div>

      {/* Betting and Player's hand */}
      <div className="flex mt-4" style={cardsOnSeats && gameStarted ? { marginTop: "40px" } : undefined}>
        {/* Spacer div */}
        <div className="w-1/6"></div>
        {/* Your Bet/Win section — container always present to keep hand position stable */}
        <div className={`w-1/3 mr-8 flex flex-col rounded-xl p-3 border-2 ${isCurrentPlayerBettingTurn && betBlinkEnabled ? "border-green-400 animate-bet-border" : "border-transparent"}`}>
        {(!gameStarted || (currentPlayer && currentPlayer.bet === null && isCurrentPlayerBettingTurn)) && <>
          <h2 className="text-xl font-bold mb-2 text-center px-4 py-1 bg-black/20 rounded-lg w-fit mx-auto">{!gameStarted ? t("bet") : t("makeYourBet")}</h2>
          {!gameStarted ? (
            <div className="flex flex-col items-center justify-center min-h-36">
              <p className="text-center italic">{t("youWillBetHere")}</p>
            </div>
          ) : currentPlayer && currentPlayer.bet === null ? (
            isCurrentPlayerBettingTurn ? (
              <div className="flex flex-col flex-1">
                {/* Number display + up/down buttons */}
                <div className="relative flex items-center justify-center flex-1">
                  <span className="text-white text-6xl font-bold select-none">
                    {betAmount ?? 0}
                  </span>
                  <button
                    onClick={() => setBetAmount((v) => Math.max((v ?? 0) - 1, 0))}
                    className="absolute w-10 h-10 flex items-center justify-center rounded-lg bg-gray-700 hover:bg-gray-600 text-white border border-gray-500"
                    style={{ right: "calc(50% + 2.5rem)" }}
                  >
                    <ChevronLeft size={20} />
                  </button>
                  <button
                    onClick={() => setBetAmount((v) => Math.min((v ?? 0) + 1, cardsThisRound))}
                    className="absolute w-10 h-10 flex items-center justify-center rounded-lg bg-gray-700 hover:bg-gray-600 text-white border border-gray-500"
                    style={{ left: "calc(50% + 2.5rem)" }}
                  >
                    <ChevronRight size={20} />
                  </button>
                </div>
                {/* Confirm + forbidden bet */}
                <div className="flex flex-col items-center mt-2">
                  {(() => {
                    const forbiddenBet = calculateForbiddenBet()
                    return (
                      <div className="flex flex-col items-center justify-center gap-3" style={{ minHeight: "56px" }}>
                        <p className={`text-red-500 text-sm italic ${forbiddenBet !== null ? "visible" : "invisible"}`}>
                          {t("youCannotBet")} {forbiddenBet ?? "–"}
                        </p>
                        <Button onClick={handlePlaceBet}>{t("confirm")}</Button>
                      </div>
                    )
                  })()}
                </div>
              </div>
            ) : (
              <p className="text-center text-yellow-600 italic mt-4">
                {waitingForBetDelay ? (
                  t("preparingRound")
                ) : (
                  <>
                    {t("waitingFor")}{" "}
                    {currentBettingPlayerName.startsWith("Waiting")
                      ? players.find((p) => p.name !== currentPlayerName)?.name || "..."
                      : currentBettingPlayerName}{" "}
                    {t("toPlaceBet")}
                  </>
                )}
              </p>
            )
          ) : null}
        </>}
        </div>

        {/* Player's hand */}
        <div className="w-2/3">
          <div className="mb-2">
            <h2 className="text-xl font-bold text-center px-4 py-1 bg-black/20 rounded-lg w-fit mx-auto">{t("yourHand")}</h2>
          </div>
          <div className="flex justify-center space-x-2 items-center min-h-36 w-[680px] mx-auto">
            {currentPlayer && currentPlayer.hand && currentPlayer.hand.length > 0 ? (
              currentPlayer.hand.map((card, index) => (
                <PlayingCard
                  key={index}
                  suit={card.suit}
                  value={card.value}
                  onClick={() => handlePlayCard(card)}
                  disabled={
                    !isCurrentPlayerTurn ||
                    isClearing ||
                    !isValidCardToPlay(card) ||
                    !safeGameData.allBetsPlaced ||
                    isPlayingCard
                  }
                  showBack={shouldShowCardBacks}
                  className={`${isNoSuitRound && card.suit === "diamonds" ? "bg-white" : ""} ${
                    !isCurrentPlayerTurn || !isValidCardToPlay(card) || !safeGameData.allBetsPlaced || isPlayingCard
                      ? "opacity-50"
                      : ""
                  }`}
                />
              ))
            ) : (
              <p className="italic">{gameStarted ? t("allCardsPlayed") : t("cardsHereHint")}</p>
            )}
          </div>
          {/* Replace the hardcoded check with the dynamic getTotalRounds function */}
          {gameStarted && currentRound <= getTotalRounds(safeGameData.gameLength || "basic", safeGameData.hasGoldenRound || false, safeGameData.hasNoTrumps || false) && (
            <p className="text-center mt-2 w-[680px] mx-auto">{renderGameStatusMessage()}</p>
          )}
          {errorMessage && <p className="text-red-600 text-center mt-2 w-[680px] mx-auto">{errorMessage}</p>}
        </div>
      </div>

      </div>{/* end main content column */}

      {/* Score table: right position */}
      {scoreTablePosition === "right" && scoreTablePanel}

      {/* Score table: bottom position (rendered inside flex-col after main content) */}
      {scoreTablePosition === "bottom" && scoreTablePanel}

      <GameResultsDialog isOpen={showResultsDialog} onClose={() => { setShowResultsDialog(false); stopSound("gameOver") }} players={players} />
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
            <div className="py-4">
              <div className="space-y-2">
                {(["spades", "clubs", "hearts", "diamonds"] as const).map(suit => {
                  const isRed = suit === "hearts" || suit === "diamonds"
                  return (
                    <Button key={suit} onClick={() => handleSuitSelected(suit)}
                      className={`w-full justify-start text-left font-medium ${isRed ? "bg-red-900/50 hover:bg-red-800/70 border-red-700/50" : "bg-gray-800/80 hover:bg-gray-700/80 border-gray-600/50"} text-white`}
                      variant="outline">
                      {t(`suit${suit.charAt(0).toUpperCase() + suit.slice(1)}` as "suitSpades" | "suitHearts" | "suitDiamonds" | "suitClubs")}
                    </Button>
                  )
                })}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Avatar / Reaction Picker Modal */}
      {showAvatarPicker && (
        <div
          className="fixed inset-0 bg-black/60 flex items-center justify-center z-50"
          onClick={() => setShowAvatarPicker(false)}
        >
          <div className="bg-gray-800 rounded-xl p-4 w-80 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-white font-semibold text-sm">{t("emojiAvatar")}</h3>
              <button onClick={() => setShowAvatarPicker(false)} className="text-gray-400 hover:text-white text-lg leading-none">✕</button>
            </div>
            {/* Tabs */}
            <div className="flex gap-2 mb-4">
              <button
                className={`flex-1 py-1.5 rounded text-xs ${avatarPickerTab === "emoji" ? "bg-blue-600 text-white" : "bg-gray-700 text-gray-300"}`}
                onClick={() => setAvatarPickerTab("emoji")}
              >{t("emojiTab")}</button>
              <button
                className={`flex-1 py-1.5 rounded text-xs ${avatarPickerTab === "image" ? "bg-blue-600 text-white" : "bg-gray-700 text-gray-300"}`}
                onClick={() => setAvatarPickerTab("image")}
              >{t("avatarTab")}</button>
            </div>

            <div className="h-[220px] overflow-y-auto [&::-webkit-scrollbar]:hidden" style={{ scrollbarWidth: "none" }}>
            {avatarPickerTab === "emoji" && (
              <div className="grid grid-cols-6 gap-1">
                {EMOJI_LIST.map((emoji) => (
                  <button
                    key={emoji}
                    className="text-2xl hover:bg-gray-700 rounded p-1 transition-colors"
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
                  {players.find((p) => p.name === currentPlayerName)?.avatar ? (
                    <img
                      src={players.find((p) => p.name === currentPlayerName)!.avatar}
                      alt="avatar"
                      className="w-[140px] h-[140px] rounded-full object-cover border-0 outline-none ring-0"
                    />
                  ) : (
                    <div className="w-[140px] h-[140px] rounded-full bg-gray-600 flex items-center justify-center text-4xl text-white font-bold">
                      {currentPlayerName?.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                <div className="flex gap-2 mt-3 self-end">
                  {players.find((p) => p.name === currentPlayerName)?.avatar && (
                    <Button size="sm" variant="outline" className="w-[100px]" onClick={() => { onSetAvatar(""); setShowAvatarPicker(false) }}>
                      {t("removePhoto")}
                    </Button>
                  )}
                  <Button size="sm" className="w-[100px]" onClick={() => fileInputRef.current?.click()}>
                    {t("choosePhoto")}
                  </Button>
                </div>
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileSelect} />
              </div>
            )}
            </div>
          </div>
        </div>
      )}

      {/* Add CSS for animations */}
      <style jsx global>{`
      @keyframes fadeIn {
        from { opacity: 0; transform: translate(-50%, -10px); }
        to { opacity: 1; transform: translate(-50%, 0); }
      }
      @keyframes betBorder {
        0%, 100% { border-color: rgb(74 222 128); box-shadow: 0 0 8px rgb(74 222 128 / 0.6); }
        50% { border-color: transparent; box-shadow: none; }
      }
      .animate-bet-border {
        animation: betBorder 1s ease-in-out infinite;
      }
      @keyframes reactionFloat {
        0%   { opacity: 1; transform: translateX(-50%) translateY(0)   scale(1); }
        40%  { opacity: 1; transform: translateX(-50%) translateY(-50px) scale(1.4); }
        100% { opacity: 0; transform: translateX(-50%) translateY(-90px) scale(0.8); }
      }
      .reaction-float {
        animation: reactionFloat 3s ease-out forwards;
      }
    `}</style>
    </div>
  )
}
