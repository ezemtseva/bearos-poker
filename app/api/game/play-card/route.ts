import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@vercel/postgres"
import type { GameData, Player, Card, ScoreTableRow, PlayerScore } from "../../../../types/game"
import { sendSSEUpdate } from "../../../utils/sse"
import { createDeck } from "../../../utils/deck"

export const runtime = "edge"

function getNextTurn(currentTurn: number, playerCount: number): number {
  return (currentTurn + 1) % playerCount
}

function dealCards(players: Player[], deck: Card[], cardsPerPlayer: number): [Player[], Card[]] {
  const updatedPlayers = players.map((player) => ({
    ...player,
    hand: [...player.hand, ...deck.splice(0, cardsPerPlayer)],
  }))
  return [updatedPlayers, deck]
}

function determineHighestCard(cards: Card[]): Card | null {
  if (cards.length === 0) return null

  // 7 of spades with Trumps always wins (NEW rule)
  const sevenOfSpadesWithTrumps = cards.find((c) => c.suit === "spades" && c.value === 7 && c.pokerOption === "Trumps")
  if (sevenOfSpadesWithTrumps) return sevenOfSpadesWithTrumps

  // 7 of spades with Poker always wins
  const sevenOfSpadesWithPoker = cards.find((c) => c.suit === "spades" && c.value === 7 && c.pokerOption === "Poker")
  if (sevenOfSpadesWithPoker) return sevenOfSpadesWithPoker

  const leadingSuit = cards[0].suit
  const trumpCards = cards.filter((c) => c.suit === "diamonds")

  if (trumpCards.length > 0) {
    return trumpCards.reduce((max, current) => (current.value > max.value ? current : max))
  }

  const leadingSuitCards = cards.filter((c) => c.suit === leadingSuit)
  return leadingSuitCards.reduce((max, current) => (current.value > max.value ? current : max))
}

function getNextRoundStartPlayer(currentRound: number, players: Player[]): number {
  if (currentRound === 1) {
    // First round always starts with the owner (seat 1)
    return players.findIndex((player) => player.seatNumber === 1)
  }

  const targetSeatNumber = currentRound <= players.length ? currentRound : ((currentRound - 1) % players.length) + 1
  const nextStartPlayer = players.findIndex((player) => player.seatNumber === targetSeatNumber)

  return nextStartPlayer !== -1 ? nextStartPlayer : 0 // Fallback to owner if seat not found
}

function isValidPlay(card: Card, playerHand: Card[], cardsOnTable: Card[]): boolean {
  if (playerHand.length === 1) return true // Player can play their last card regardless of suit

  if (cardsOnTable.length === 0) return true // First player can play any card

  const firstCard = cardsOnTable[0]

  // Special case: 7 of spades can be played when diamonds are the leading suit
  if (card.suit === "spades" && card.value === 7 && firstCard.suit === "diamonds") {
    return true // Can play 7 of spades when diamonds are the leading suit
  }

  // Check if 7 of spades with 'Trumps' option is on the table
  const sevenOfSpadesWithTrumps = cardsOnTable.find(
    (c) => c.suit === "spades" && c.value === 7 && c.pokerOption === "Trumps",
  )
  if (sevenOfSpadesWithTrumps) {
    const diamonds = playerHand.filter((c) => c.suit === "diamonds")
    if (diamonds.length > 0) {
      // Player must play their highest diamond
      const highestDiamond = diamonds.reduce((max, current) => (current.value > max.value ? current : max))
      return card.suit === "diamonds" && card.value === highestDiamond.value
    } else {
      // Player must play one of their highest cards of any suit
      const highestValue = Math.max(...playerHand.map((c) => c.value))
      return card.value === highestValue
    }
  }

  // Special case for 7 of spades with 'Poker' option as the first card
  if (firstCard.suit === "spades" && firstCard.value === 7 && firstCard.pokerOption === "Poker") {
    return true // Any card can be played
  }

  // Normal play
  const leadingSuit = firstCard.suit

  // Check if player has any cards of the leading suit, excluding 7 of spades
  const hasSuit = playerHand.some((c) => c.suit === leadingSuit && !(c.suit === "spades" && c.value === 7))

  if (card.suit === "spades" && card.value === 7) {
    return !hasSuit // Can play 7 of spades only if player doesn't have the leading suit
  }

  if (hasSuit) {
    return card.suit === leadingSuit // Must follow suit if possible
  }

  // If player doesn't have the leading suit, check if they have trumps
  const hasTrumps = playerHand.some((c) => c.suit === "diamonds")
  if (hasTrumps) {
    return card.suit === "diamonds" // Must play a trump if they have one and can't follow suit
  }

  // If player has neither the leading suit nor trumps, they can play any card
  return true
}

function cardsPerRound(round: number): number {
  if (round <= 6) return round
  if (round <= 12) return 6
  return 19 - round
}

function getValidCardsAfterTrumps(hand: Card[]): Card[] {
  const trumps = hand.filter((c) => c.suit === "diamonds")
  if (trumps.length > 0) {
    const highestTrump = trumps.reduce((max, card) => (card.value > max.value ? card : max))
    return [highestTrump]
  }
  // If no trumps, return the highest card(s) of any suit
  const highestValue = Math.max(...hand.map((c) => c.value))
  return hand.filter((c) => c.value === highestValue)
}

export async function POST(req: NextRequest) {
  const { tableId, playerName, card, pokerOption } = await req.json()

  if (!tableId || !playerName || !card) {
    return NextResponse.json({ error: "Table ID, player name, and card are required" }, { status: 400 })
  }

  try {
    const result = await sql`
      SELECT * FROM poker_games
      WHERE table_id = ${tableId} AND game_started = true;
    `

    if (result.rowCount === 0) {
      return NextResponse.json({ error: "Game not found or not started" }, { status: 404 })
    }

    const game = result.rows[0]
    let players = game.players as Player[]
    let cardsOnTable = game.cards_on_table as Card[]
    let currentRound = game.current_round
    let currentPlay = game.current_play
    let currentTurn = game.current_turn
    let allCardsPlayedTimestamp: number | null = game.all_cards_played_timestamp
    const scoreTable = game.score_table as ScoreTableRow[]
    let deck = game.deck as Card[]
    let allCardsPlayed = game.cards_on_table.length === players.length
    let roundStartPlayerIndex = game.round_start_player_index
    let allBetsPlaced = game.all_bets_placed

    console.log("Initial game state:", {
      players,
      cardsOnTable,
      currentRound,
      currentPlay,
      currentTurn,
      allCardsPlayedTimestamp,
    })

    // Find the current player
    const playerIndex = players.findIndex((p) => p.name === playerName)
    if (playerIndex === -1 || playerIndex !== currentTurn) {
      return NextResponse.json({ error: "It's not your turn" }, { status: 400 })
    }

    // Handle 7 of spades special case
    if (card.suit === "spades" && card.value === 7) {
      if (!pokerOption) {
        return NextResponse.json(
          { error: "You must select an option (Trumps, Poker, or Simple) when playing the 7 of spades." },
          { status: 400 },
        )
      }
      if (cardsOnTable.length > 0 && pokerOption === "Trumps") {
        return NextResponse.json(
          { error: "You can only play 7 of spades as Trumps when it's the first card." },
          { status: 400 },
        )
      }
    }

    // Check if the play is valid
    if (!isValidPlay(card, players[playerIndex].hand, cardsOnTable)) {
      if (
        cardsOnTable[0]?.suit === "spades" &&
        cardsOnTable[0]?.value === 7 &&
        cardsOnTable[0]?.pokerOption === "Trumps"
      ) {
        const diamonds = players[playerIndex].hand.filter((c) => c.suit === "diamonds")
        if (diamonds.length > 0) {
          return NextResponse.json({ error: "You must play your highest diamond card." }, { status: 400 })
        } else {
          const highestCard = players[playerIndex].hand.reduce((max, current) =>
            current.value > max.value ? current : max,
          )
          if (card.suit !== highestCard.suit || card.value !== highestCard.value) {
            return NextResponse.json({ error: "You must play your highest card of any suit." }, { status: 400 })
          }
        }
      } else {
        return NextResponse.json(
          {
            error:
              "Invalid card play. You must follow the leading suit if possible, or play a trump if you don't have the leading suit.",
          },
          { status: 400 },
        )
      }
    }

    // Remove the played card from the player's hand
    players[playerIndex].hand = players[playerIndex].hand.filter(
      (c) => !(c.suit === card.suit && c.value === card.value),
    )

    // Add the card to the table
    if (card.suit === "spades" && card.value === 7 && pokerOption) {
      card.pokerOption = pokerOption
    }
    cardsOnTable.push({ ...card, playerName })

    // Determine the highest card
    const highestCard = determineHighestCard(cardsOnTable)

    // Update the database with the new game state
    await sql`
      UPDATE poker_games
      SET players = ${JSON.stringify(players)}::jsonb,
          cards_on_table = ${JSON.stringify(cardsOnTable)}::jsonb,
          highest_card = ${JSON.stringify(highestCard)}::jsonb
      WHERE table_id = ${tableId}
    `

    allCardsPlayed = cardsOnTable.length === players.length
    allCardsPlayedTimestamp = allCardsPlayed ? Date.now() : null

    // Send an immediate update with the new card on the table
    await sendSSEUpdate(tableId, {
      tableId: game.table_id,
      players,
      gameStarted: game.game_started,
      currentRound,
      currentPlay,
      currentTurn,
      cardsOnTable,
      deck,
      scoreTable,
      allCardsPlayedTimestamp,
      playEndTimestamp: null,
      lastPlayedCard: { ...card, playerName, pokerOption },
      allCardsPlayed,
      highestCard,
      roundStartPlayerIndex,
      allBetsPlaced,
      gameOver: false,
    })

    console.log("All cards played:", allCardsPlayed)

    if (allCardsPlayed) {
      console.log("All cards played, waiting 2 seconds before processing")

      // Wait for 2 seconds to display all cards
      await new Promise((resolve) => setTimeout(resolve, 2000))

      console.log("Processing end of play")

      // The winner is the player who played the highest card
      const winnerIndex = players.findIndex((p) => p.name === highestCard?.playerName)

      // Update round wins for the winner
      players[winnerIndex].roundWins = (players[winnerIndex].roundWins || 0) + 1

      // Prepare for the next play or round
      currentPlay++
      const cardsPerRoundValue = cardsPerRound(currentRound)
      if (currentPlay > cardsPerRoundValue) {
        // End of round
        // Update scores in the score table
        const roundIndex = currentRound - 1
        const isRoundB = scoreTable[roundIndex].roundName === "B"
        const multiplier = isRoundB ? 2 : 1

        players.forEach((player) => {
          const playsWon = player.roundWins
          const playerBet = player.bet

          let roundPoints = 0
          if (playerBet !== null) {
            if (playsWon === 0 && playerBet === 0) {
              // New rule: Player bet 0 and didn't win any plays
              roundPoints = 5 * multiplier
            } else if (playsWon > playerBet) {
              // Player won more plays than they bet
              roundPoints = playsWon * multiplier
            } else if (playsWon === playerBet) {
              // Player won exactly as many plays as they bet
              roundPoints = playsWon * 10 * multiplier
            } else {
              // Player won fewer plays than they bet
              roundPoints = (playsWon - playerBet) * 10 * multiplier
            }
          }

          player.score += roundPoints

          const playerScore: PlayerScore = {
            cumulativePoints: player.score,
            roundPoints: roundPoints,
            bet: playerBet,
          }
          scoreTable[roundIndex].scores[player.name] = playerScore
          player.roundWins = 0 // Reset for next round
          player.bet = null // Reset bet for next round
        })

        if (currentRound < 18) {
          // Start new round
          currentRound++
          currentPlay = 1
          const newCardsPerRound = cardsPerRound(currentRound)
          if (deck.length < newCardsPerRound * players.length) {
            deck = createDeck() // Create a new deck if needed
          }
          ;[players, deck] = dealCards(players, deck, newCardsPerRound) // Deal the correct number of cards for the new round

          // Set the starting player for the new round
          roundStartPlayerIndex = getNextRoundStartPlayer(currentRound, players)
          currentTurn = roundStartPlayerIndex

          // Reset all bets placed flag
          allBetsPlaced = false

          console.log(
            `Starting Round ${currentRound}. Cards dealt: ${newCardsPerRound} per player. First turn: ${players[currentTurn].name}`,
          )
        } else {
          // Game over
          const gameOverData: GameData = {
            tableId: game.table_id,
            players,
            gameStarted: false,
            currentRound: 18,
            currentPlay: 0,
            currentTurn: -1,
            cardsOnTable: [],
            deck: [],
            scoreTable,
            allCardsPlayedTimestamp: Date.now(),
            playEndTimestamp: null,
            lastPlayedCard: null,
            allCardsPlayed: false,
            highestCard: null,
            roundStartPlayerIndex,
            allBetsPlaced: false,
            gameOver: true,
          }
          await sql`
            UPDATE poker_games
            SET game_started = false,
                players = ${JSON.stringify(players)}::jsonb,
                current_round = 18,
                current_play = 0,
                current_turn = -1,
                cards_on_table = '[]'::jsonb,
                score_table = ${JSON.stringify(scoreTable)}::jsonb,
                all_cards_played_timestamp = ${gameOverData.allCardsPlayedTimestamp},
                play_end_timestamp = null,
                last_played_card = null,
                all_cards_played = false,
                highest_card = null,
                round_start_player_index = ${roundStartPlayerIndex},
                all_bets_placed = false,
                game_over = true
            WHERE table_id = ${tableId}
          `
          await sendSSEUpdate(tableId, gameOverData)
          return NextResponse.json({ message: "Game over", gameData: gameOverData })
        }
      } else {
        // Set the starting player for the next play to the winner of the current play
        currentTurn = winnerIndex
      }

      // Clear the table and reset flags
      cardsOnTable = []
      allCardsPlayed = false
      allCardsPlayedTimestamp = null

      // Send another update to clear the table
      await sendSSEUpdate(tableId, {
        tableId: game.table_id,
        players,
        gameStarted: game.game_started,
        currentRound,
        currentPlay,
        currentTurn,
        cardsOnTable,
        deck,
        scoreTable,
        allCardsPlayedTimestamp,
        playEndTimestamp: null,
        lastPlayedCard: null,
        allCardsPlayed: false,
        highestCard: null,
        roundStartPlayerIndex,
        allBetsPlaced,
        gameOver: false,
      })
    } else {
      // Move to the next turn
      currentTurn = getNextTurn(currentTurn, players.length)
    }

    // Create final gameData object
    const finalGameData: GameData = {
      tableId: game.table_id,
      players,
      gameStarted: game.game_started,
      currentRound,
      currentPlay,
      currentTurn,
      cardsOnTable,
      deck,
      scoreTable,
      allCardsPlayedTimestamp,
      playEndTimestamp: null,
      lastPlayedCard: allCardsPlayed ? null : { ...card, playerName, pokerOption },
      allCardsPlayed,
      highestCard,
      roundStartPlayerIndex,
      allBetsPlaced,
      gameOver: currentRound > 18,
    }

    console.log("Final game state:", finalGameData)
    await sendSSEUpdate(tableId, finalGameData)

    await sql`
      UPDATE poker_games
      SET players = ${JSON.stringify(players)}::jsonb,
          current_round = ${currentRound},
          current_play = ${currentPlay},
          current_turn = ${currentTurn},
          cards_on_table = ${JSON.stringify(cardsOnTable)}::jsonb,
          deck = ${JSON.stringify(deck)}::jsonb,
          game_started = ${game.game_started},
          all_cards_played_timestamp = ${allCardsPlayedTimestamp},
          play_end_timestamp = null,
          score_table = ${JSON.stringify(scoreTable)}::jsonb,
          last_played_card = ${JSON.stringify({ ...card, playerName, pokerOption })}::jsonb,
          all_cards_played = ${allCardsPlayed},
          highest_card = ${JSON.stringify(highestCard)}::jsonb,
          round_start_player_index = ${roundStartPlayerIndex},
          all_bets_placed = ${allBetsPlaced}
      WHERE table_id = ${tableId}
    `

    return NextResponse.json({ message: "Card played successfully", gameData: finalGameData })
  } catch (error) {
    console.error("Error playing card:", error)
    return NextResponse.json({ error: "Failed to play card" }, { status: 500 })
  }
}

