"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import io from "socket.io-client"
import GameTable from "../../../components/GameTable"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"

interface Player {
  name: string
  seatNumber: number
  isOwner: boolean
}

interface GameData {
  tableId: string
  players: Player[]
}

export default function Game() {
  const params = useParams()
  const tableId = params?.tableId as string
  const [gameData, setGameData] = useState<GameData | null>(null)
  const [socket, setSocket] = useState<ReturnType<typeof io> | null>(null)
  const { toast } = useToast()

  useEffect(() => {
    if (!tableId) {
      toast({
        title: "Error",
        description: "No table ID provided",
        variant: "destructive",
      })
      return
    }

    const fetchGameData = async () => {
      const response = await fetch(`/api/game?tableId=${tableId}`)
      const data = await response.json()
      if (data.error) {
        toast({
          title: "Error",
          description: data.error,
          variant: "destructive",
        })
      } else {
        setGameData(data)
      }
    }

    fetchGameData()

    const socketInitializer = async () => {
      try {
        await fetch("/api/socket")
        const newSocket = io("/", {
          path: "/api/socket",
        })

        newSocket.on("connect", () => {
          console.log("Connected to WebSocket")
          newSocket.emit("join-game", tableId)
        })

        newSocket.on("game-updated", (updatedData: GameData) => {
          setGameData(updatedData)
        })

        setSocket(newSocket)
      } catch (error) {
        console.error("Failed to initialize socket:", error)
        toast({
          title: "Error",
          description: "Failed to connect to game server",
          variant: "destructive",
        })
      }
    }

    socketInitializer()

    return () => {
      if (socket) {
        socket.disconnect()
      }
    }
  }, [tableId, toast, socket])

  const handleShare = () => {
    const shareUrl = `${window.location.origin}/join-game?tableId=${tableId}`
    navigator.clipboard.writeText(shareUrl)
    toast({
      title: "Link Copied!",
      description: "Share this link with your friends to invite them to the game.",
    })
  }

  if (!gameData) {
    return <div>Loading...</div>
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <GameTable tableId={gameData.tableId} players={gameData.players} />
      <div className="mt-4 flex justify-center">
        <Button onClick={handleShare}>Share Game Link</Button>
      </div>
    </div>
  )
}

