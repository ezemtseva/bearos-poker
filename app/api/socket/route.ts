import { Server as SocketIOServer } from "socket.io"
import type { Server as NetServer } from "http"
import type { NextApiResponse } from "next"
import type { NextRequest } from "next/server"
import type { Socket as NetSocket } from "net"

interface SocketServer extends NetServer {
  io?: SocketIOServer
}

interface SocketWithIO extends NetSocket {
  server: SocketServer
}

interface ResponseWithSocket extends NextApiResponse {
  socket: SocketWithIO
}

export async function GET(req: NextRequest, res: ResponseWithSocket) {
  if (res.socket.server.io) {
    console.log("Socket is already running")
    return new Response(JSON.stringify({ message: "Socket is already running" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    })
  }

  console.log("Socket is initializing")
  const io = new SocketIOServer(res.socket.server as SocketServer)
  res.socket.server.io = io

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

  return new Response(JSON.stringify({ message: "Socket initialized" }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  })
}

export const config = {
  api: {
    bodyParser: false,
  },
}

