import { WebSocket } from 'ws';
import {log} from "../services/Logger";

export class ConnectionManager {
  private connections: Map<string, WebSocket> = new Map();

  register(sessionId: string, ws: WebSocket): void {
    this.connections.set(sessionId, ws);
  }

  unregister(sessionId: string): void {
    this.connections.delete(sessionId);
  }

  getConnection(sessionId: string): WebSocket | null {
    return this.connections.get(sessionId) || null;
  }

  send(sessionId: string, message: any): boolean {
    const ws = this.connections.get(sessionId);
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      return false;
    }

    try {
      ws.send(JSON.stringify(message));
      return true;
    } catch (error) {
      log.error(`Failed to send to ${sessionId}:`, error);
      return false;
    }
  }
}