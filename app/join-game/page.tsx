import { Suspense } from "react"
import JoinGameClient from "./JoinGameClient"

export const dynamic = "force-dynamic"

export default function JoinGame() {
  return (
    <div className="flex-1 flex flex-col">
      <Suspense fallback={<div className="flex-1" />}>
        <JoinGameClient />
      </Suspense>
    </div>
  )
}

