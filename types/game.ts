export interface Player {
    name: string
    seatNumber: number
    isOwner: boolean
    hand: Card[]
    score: number
  }
  
  export interface Card {
    suit: "trumps" | "hearts" | "diamonds" | "clubs"
    value: number // 6-14, where 11=J, 12=Q, 13=K, 14=A
    playerName?: string
  }
  
  export interface ScoreTableRow {
    roundId: number
    roundName: string
    scores: { [playerName: string]: number | null }
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
  }
  
  