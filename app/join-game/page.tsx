import { Suspense } from "react"
import JoinGameClient from "./JoinGameClient"

export const dynamic = "force-dynamic"

export default function JoinGame() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-4">Join Game</h1>
      <Suspense fallback={<div>Loading...</div>}>
        <JoinGameClient />
      </Suspense>
    </div>
  )
}

