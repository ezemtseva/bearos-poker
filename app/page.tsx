"use client"

import type React from "react"
import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import Modal from "../components/Modal"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export default function Home() {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [playerName, setPlayerName] = useState("")
  const router = useRouter()

  const handleCreateGame = async () => {
    if (playerName.trim() === "") {
      alert("Please enter a name")
      return
    }

    const response = await fetch("/api/game", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ action: "create", playerName }),
    })

    const data = await response.json()
    if (data.tableId) {
      router.push(`/game/${data.tableId}`)
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen">
      <main className="container mx-auto px-4 py-8 text-center">
        <section className="mb-12">
          <h1 className="text-4xl font-bold mb-6">Welcome to Bearos Poker!</h1>
          <div className="space-x-4">
            <Button onClick={() => setIsModalOpen(true)}>Create New Game</Button>
            <Button variant="secondary" asChild>
              <Link href="/join-game">Join Game</Link>
            </Button>
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-bold mb-4">How to play?</h2>
          <p className="text-lg max-w-2xl mx-auto">
            Bearos Poker is a unique card game with custom rules. Players compete to create the best hand using a
            combination of cards. The game involves strategy, bluffing, and a bit of luck. Detailed rules and gameplay
            instructions will be provided here.
          </p>
        </section>

        <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
          <h2 className="text-xl font-bold mb-4">Create New Game</h2>
          <Input
            type="text"
            value={playerName}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPlayerName(e.target.value)}
            placeholder="Enter your name"
            className="mb-4"
          />
          <Button onClick={handleCreateGame}>Create</Button>
        </Modal>
      </main>
    </div>
  )
}

