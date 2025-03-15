export interface Player {
  name: string
  seatNumber: number
  isOwner: boolean
  hand: Card[]
  score: number
  roundWins: number
  bet: number | null
}

export interface ScoreTableRow {
  roundId: number
  roundName: string
  scores: { [playerName: string]: PlayerScore }
}

export interface PlayerScore {
  cumulativePoints: number
  roundPoints: number
  bet: number | null
}

export interface Card {
  suit: "spades" | "hearts" | "diamonds" | "clubs"
  value: number // 6-14, where 11=J, 12=Q, 13=K, 14=A
  playerName?: string
  pokerOption?: "Trumps" | "Poker" | "Simple"
}

export interface GameData {
  tableId: string
  players: Player[]
  gameStarted: boolean
  currentRound: number
  currentPlay: number
  currentTurn: number
  cardsOnTable: Card[]
  deck: Card[]
  scoreTable: ScoreTableRow[]
  allCardsPlayedTimestamp: number | null
  playEndTimestamp: number | null
  lastPlayedCard: Card | null
  allCardsPlayed: boolean
  highestCard: Card | null
  roundStartPlayerIndex: number
  allBetsPlaced: boolean
  gameOver: boolean
  currentBettingTurn?: number
}

