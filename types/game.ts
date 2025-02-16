export interface Player {
    name: string
    seatNumber: number
    isOwner: boolean
  }
  
  export interface GameData {
    tableId: string
    players: Player[]
  }
  
  