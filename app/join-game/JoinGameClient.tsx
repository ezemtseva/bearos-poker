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

    const storedPlayerName = localStorage.getItem("playerName")
    if (storedPlayerName) {
      setPlayerName(storedPlayerName)
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

    localStorage.setItem("playerName", playerName)
    console.log("Player name stored in localStorage:", playerName)

    try {
      const response = await fetch("/api/game/join", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ tableId, playerName }),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      if (data.error) {
        throw new Error(data.error)
      }

      console.log("Joining game with player name:", playerName)

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
    <div className="container mx-auto px-4 min-h-screen flex items-center justify-center">
      <div className="max-w-md w-full">
        <h1 className="text-2xl font-bold mb-4 text-center text-white">Join Table</h1>
        <form onSubmit={handleJoinGame} className="space-y-4">
          <div>
            <label htmlFor="tableId" className="block text-sm font-medium text-white mb-1">
              Table ID
            </label>
            <Input
              type="text"
              id="tableId"
              value={tableId}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTableId(e.target.value)}
              className="w-full"
              required
            />
          </div>
          <div>
            <label htmlFor="playerName" className="block text-sm font-medium text-white mb-1">
              Enter Your Name
            </label>
            <Input
              type="text"
              id="playerName"
              value={playerName}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPlayerName(e.target.value)}
              className="w-full"
              required
            />
          </div>
          <Button type="submit" className="mx-auto block w-[120px] h-[40px]">
            Join
          </Button>
        </form>
      </div>
    </div>
  )
}

