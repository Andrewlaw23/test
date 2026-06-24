export class RosterRoom {
  constructor(state, env) {
    this.state = state;
  }

  async fetch(request) {
    const url = new URL(request.url);
    
    if (url.pathname === "/ws") {
      const pair = new WebSocketPair();
      const [client, server] = Object.values(pair);
      this.state.acceptWebSocket(server);
      
      const currentState = await this.state.storage.get("state");
      server.send(JSON.stringify({ 
        type: "init", 
        state: currentState 
      }));
      
      return new Response(null, { status: 101, webSocket: client });
    }
    
    return new Response("Not found", { status: 404 });
  }

  async webSocketMessage(ws, message) {
    try {
      const msg = JSON.parse(message);
      if (msg.type === "update" && msg.state) {
        await this.state.storage.put("state", msg.state);
        
        for (const client of this.state.getWebSockets()) {
          if (client !== ws && client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({ 
              type: "update", 
              state: msg.state 
            }));
          }
        }
      }
    } catch (e) {
      console.error("WebSocket error:", e);
    }
  }
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    
    if (url.pathname === "/ws") {
      const id = env.ROSTER.idFromName("main-roster");
      const room = env.ROSTER.get(id);
      return room.fetch(request);
    }
    
    return env.ASSETS.fetch(request);
  }
};
