import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@vercel/postgres"
import type { GameData, GameLength, Player, ScoreTableRow, PlayerScore } from "../../../../types/game"

export const runtime = "edge"

function initializeScoreTable(players: Player[] = [], gameLength: GameLength): ScoreTableRow[] {
  const roundNames = getRoundNames(gameLength)

  return roundNames.map((roundName, index) => {
    const roundId = index + 1
    const scores: { [playerName: string]: PlayerScore } = players.reduce(
      (acc, player) => {
        acc[player.name] = { cumulativePoints: 0, roundPoints: 0, bet: null }
        return acc
      },
      {} as { [playerName: string]: PlayerScore },
    )
    return { roundId, roundName, scores }
  })
}

function getRoundNames(gameLength: GameLength): string[] {
  switch (gameLength) {
    case "short":
      return ["1", "2", "3", "4", "5", "6", "B", "B", "B", "B", "B", "B", "6", "5", "4", "3", "2", "1"]
    case "basic":
      return [
        "1",
        "2",
        "3",
        "4",
        "5",
        "6",
        "6",
        "6",
        "B",
        "B",
        "B",
        "B",
        "B",
        "B",
        "6",
        "6",
        "6",
        "5",
        "4",
        "3",
        "2",
        "1",
      ]
    case "long":
      return [
        "1",
        "2",
        "3",
        "4",
        "5",
        "6",
        "6",
        "6",
        "6",
        "6",
        "6",
        "B",
        "B",
        "B",
        "B",
        "B",
        "B",
        "6",
        "6",
        "6",
        "6",
        "6",
        "6",
        "5",
        "4",
        "3",
        "2",
        "1",
      ]
    default:
      return ["1", "2", "3", "4", "5", "6", "B", "B", "B", "B", "B", "B", "6", "5", "4", "3", "2", "1"]
  }
}

export async function POST(req: NextRequest) {
  const { tableId, gameLength } = await req.json()

  if (!tableId || !gameLength) {
    return NextResponse.json({ error: "Table ID and game length are required" }, { status: 400 })
  }

  try {
    console.log(`[CONFIGURE-GAME] Configuring game for table: ${tableId}, length: ${gameLength}`)

    const result = await sql`
      SELECT * FROM poker_games
      WHERE table_id = ${tableId} AND game_started = false;
    `

    if (result.rowCount === 0) {
      console.log(`[CONFIGURE-GAME] Game not found or already started: ${tableId}`)
      return NextResponse.json({ error: "Game not found or already started" }, { status: 404 })
    }

    const game = result.rows[0]
    const players = game.players as Player[]

    // Initialize score table based on game length
    const scoreTable = initializeScoreTable(players, gameLength)

    // Update the game in the database
    await sql`
      UPDATE poker_games
      SET score_table = ${JSON.stringify(scoreTable)}::jsonb,
          game_length = ${gameLength}
      WHERE table_id = ${tableId}
    `

    console.log(`[CONFIGURE-GAME] Game configured successfully for table: ${tableId}`)

    // Construct a complete GameData object
    const updatedGameData: GameData = {
      tableId: game.table_id,
      players: players,
      gameStarted: game.game_started || false,
      currentRound: game.current_round || 0,
      currentPlay: game.current_play || 0,
      currentTurn: game.current_turn || 0,
      cardsOnTable: game.cards_on_table || [],
      deck: game.deck || [],
      scoreTable: scoreTable,
      allCardsPlayedTimestamp: game.all_cards_played_timestamp || null,
      playEndTimestamp: game.play_end_timestamp || null,
      lastPlayedCard: game.last_played_card || null,
      allCardsPlayed: game.all_cards_played || false,
      highestCard: game.highest_card || null,
      roundStartPlayerIndex: game.round_start_player_index || 0,
      allBetsPlaced: game.all_bets_placed || false,
      gameOver: game.game_over || false,
      gameLength: gameLength,
    }

    return NextResponse.json({ message: "Game configured successfully", gameData: updatedGameData })
  } catch (error) {
    console.error("[CONFIGURE-GAME] Error configuring game:", error)
    return NextResponse.json({ error: "Failed to configure game" }, { status: 500 })
  }
}

