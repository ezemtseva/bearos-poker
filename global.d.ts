declare global {
    class WebSocketPair {
      0: WebSocket
      1: WebSocket
    }
  
    interface WebSocket {
      accept(): void
    }
  
    interface ResponseInit {
      webSocket?: WebSocket
    }
  }
  
  export {}
  
  