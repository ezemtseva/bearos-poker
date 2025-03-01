import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function Home() {
  return (
    <div className="container mx-auto px-4 min-h-screen flex items-center justify-center">
      <div className="max-w-2xl w-full">
        <h1 className="text-3xl font-bold mb-4 text-center">Welcome to Bearos Poker</h1>
        <p className="mb-4 text-center">Bearos Poker is a fun and exciting card game. Here are the basic rules:</p>
        <ul className="list-disc list-inside mb-6 space-y-2">
          <li>The game is played with 2-6 players</li>
          <li>Each round, players are dealt a number of cards based on the round number</li>
          <li>Players take turns playing one card at a time</li>
          <li>The highest card wins each play</li>
          <li>Diamond cards are always trump and beat any other suit</li>
          <li>Points are awarded based on the number of plays won</li>
        </ul>
        <div className="flex justify-center space-x-4">
          <Link href="/create-game">
            <Button>Create Game</Button>
          </Link>
          <Link href="/join-game">
            <Button variant="outline" className="text-primary hover:text-primary-foreground">
              Join Game
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}

