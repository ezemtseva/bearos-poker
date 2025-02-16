"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useToast } from "@/hooks/use-toast"

export default function JoinGameClient() {
  const [tableId, setTableId] = useState("")
  const [playerName, setPlayerName] = useState("")
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()

  useEffect(() => {
    const tableIdParam = searchParams?.get("tableId")
    if (tableIdParam) {
      setTableId(tableIdParam)
    }
  }, [searchParams])

  const handleJoinGame = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!tableId || !playerName) {
      toast({
        title: "Error",
        description: "Please enter both table ID and your name",
        variant: "destructive",
      })
      return
    }

    try {
      const response = await fetch("/api/game", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action: "join", tableId, playerName }),
      })

      const data = await response.json()
      if (data.error) {
        throw new Error(data.error)
      }

      // Navigate to the game page
      router.push(`/game/${tableId}`)
    } catch (error: unknown) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "An error occurred while joining the game",
        variant: "destructive",
      })
    }
  }

  return (
    <form onSubmit={handleJoinGame} className="max-w-md mx-auto">
      <div className="mb-4">
        <label htmlFor="tableId" className="block text-sm font-medium text-gray-700">
          Table ID
        </label>
        <Input
          type="text"
          id="tableId"
          value={tableId}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTableId(e.target.value)}
          className="mt-1"
          required
        />
      </div>
      <div className="mb-4">
        <label htmlFor="playerName" className="block text-sm font-medium text-gray-700">
          Your Name
        </label>
        <Input
          type="text"
          id="playerName"
          value={playerName}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPlayerName(e.target.value)}
          className="mt-1"
          required
        />
      </div>
      <Button type="submit" className="w-full">
        Join Game
      </Button>
    </form>
  )
}

