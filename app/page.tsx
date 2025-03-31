import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function Home() {
  return (
    <div className="container mx-auto px-4 min-h-screen flex items-center justify-center">
      <div className="max-w-2xl w-full">
        <h1 className="text-3xl font-bold mb-4 text-center">Welcome to Bearos Poker</h1>
        <div className="flex justify-center space-x-4 mt-6">
          <Link href="/create-game">
            <Button>Create Table</Button>
          </Link>
          <Link href="/join-game">
            <Button variant="outline" className="text-primary hover:text-primary-foreground">
              Join Table
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}

