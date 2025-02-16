export interface Player {
    name: string
    seatNumber: number
    isOwner: boolean
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
    scoreTable: ScoreTableRow[]
  }
  
  