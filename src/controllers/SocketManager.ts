import { WebSocketServer } from "ws";
import {Server as HttpServer} from "http";
import { randomUUID } from 'crypto';

import { log } from "../services/Logger";
import { OpenAIService } from "../services/OpenAIService";
import {ChatCompletionRequest, WebSocketMessage, TTSRequest} from "../types/types"
import { ConnectionManager } from "./ConnectionManager";
import { SessionManager } from "./SessionManager";
import { Session } from "inspector";

export class SocketManager{

  private webSocketServer: WebSocketServer;
  private openAIService : OpenAIService;
  private connectionManager: ConnectionManager;
  private sessionManager: SessionManager;


  constructor(server: HttpServer) {
    this.webSocketServer = new WebSocketServer({server: server});
    this.connectionManager = new ConnectionManager();
    this.sessionManager = new SessionManager();
    this.openAIService = new OpenAIService(this.connectionManager, this.sessionManager);
    this.setupWebSocket();
  }

  private setupWebSocket() {
    this.webSocketServer.on("connection", (ws, req) => {
      const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress;

      log.info("New connection from", ip);
      
      
      const sessionId = randomUUID();
      this.connectionManager.register(sessionId, ws);

      ws.on("message", async (data: WebSocketMessage) => {
        try {
          const {reqType, text} = JSON.parse(data.toString());
          
          if(reqType == "cancel") {
            this.sessionManager.removeSession(sessionId);
            return ;
          }

          this.sessionManager.addSession(sessionId);

          if (!text || typeof text !== "string") {
            ws.send(JSON.stringify({ error: "text field required" }));
            return;
          }

          const userText = text.trim();

          const chatOptions: ChatCompletionRequest = {messages: [{role: 'user', content: userText}]}
          const ttsOptions: TTSRequest = {input: ""}

          this.openAIService.processChain(chatOptions, ttsOptions, sessionId, 0)

          ws.send(JSON.stringify({ status: "thinking" }));

          ws.send(JSON.stringify({ status: "speaking"}));

          
        } catch (err: any) {
          log.error("Message handling error:", err);
          ws.send(JSON.stringify({ error: "Internal error" }));
        }
      });

      ws.on("close", () => {
        this.sessionManager.removeSession(sessionId);
        this.connectionManager.unregister(sessionId);
        log.info("Client disconnected") 
      });
      ws.on("error", (err) => log.error("WebSocket error:", err));
      
    })
  }
}