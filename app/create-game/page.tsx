"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useToast } from "@/hooks/use-toast"

export default function CreateGame() {
  const [playerName, setPlayerName] = useState("")
  const router = useRouter()
  const { toast } = useToast()

  const handleCreateGame = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!playerName) {
      toast({
        title: "Error",
        description: "Please enter your name",
        variant: "destructive",
      })
      return
    }

    localStorage.setItem("playerName", playerName)

    try {
      const response = await fetch("/api/game/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ playerName }),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      if (data.error) {
        throw new Error(data.error)
      }

      router.push(`/game/${data.tableId}`)
    } catch (error: unknown) {
      console.error("Error creating game:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "An error occurred while creating the game",
        variant: "destructive",
      })
    }
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-4">Create a New Game</h1>
      <form onSubmit={handleCreateGame} className="max-w-md">
        <div className="mb-4">
          <label htmlFor="playerName" className="block text-sm font-medium text-gray-700">
            Your Name
          </label>
          <Input
            type="text"
            id="playerName"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            className="mt-1"
            required
          />
        </div>
        <Button type="submit">Create Game</Button>
      </form>
    </div>
  )
}

