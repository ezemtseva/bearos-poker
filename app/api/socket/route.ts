import { Server as SocketIOServer } from "socket.io"
import type { NextApiRequest } from "next"
import { NextResponse } from "next/server"

export const runtime = "edge"

const SocketHandler = (req: NextApiRequest) => {
  if (!(req.socket as any).server.io) {
    console.log("New Socket.io server...")
    // adapt Next's net Server to http Server
    const httpServer = (req.socket as any).server
    const io = new SocketIOServer(httpServer, {
      path: "/api/socket",
    })
    // append SocketIO server to Next.js socket server
    ;(req.socket as any).server.io = io

    io.on("connection", (socket) => {
      console.log("A client connected")

      socket.on("join-game", (tableId) => {
        console.log(`Client joined game: ${tableId}`)
        socket.join(tableId)
      })

      socket.on("game-update", (data) => {
        console.log(`Game update received for table: ${data.tableId}`)
        socket.to(data.tableId).emit("game-updated", data)
      })

      socket.on("disconnect", () => {
        console.log("A client disconnected")
      })
    })
  }
  return NextResponse.json({ message: "Socket is initialized" }, { status: 200 })
}

export const GET = SocketHandler

