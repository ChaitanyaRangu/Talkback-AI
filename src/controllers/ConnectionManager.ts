/**
 * ConnectionManager
 * ------------------
 * Manages WebSocket connections by storing them in an in-memory map
 * keyed by `sessionId`. Provides methods to register, unregister,
 * look up connections, broadcast messages, and safely send data.
 */
import { WebSocket } from 'ws';
import {log} from "../services/Logger";
import {WebSocketMessage} from "../types/types";

export class ConnectionManager {
  /** Map of sessionId → WebSocket connection */
  private connections: Map<string, WebSocket> = new Map();

  /**
   * Registers a WebSocket connection under a specific session ID.
   *
   * @param sessionId - Unique ID representing the client session
   * @param ws - WebSocket instance for the session
   */
  register(sessionId: string, ws: WebSocket): void {
    this.connections.set(sessionId, ws);
  }

  /**
   * Removes a WebSocket connection associated with the given session ID.
   *
   * @param sessionId - The session to unregister
   */
  unregister(sessionId: string): void {
    this.connections.delete(sessionId);
  }

  /**
   * Returns all active WebSocket connections.
   *
   * @returns A map of sessionId → WebSocket
   */
  getAllConenctions(): Map<string, WebSocket> {
    return this.connections;
  }

  getConnection(sessionId: string): WebSocket | null {
    return this.connections.get(sessionId) || null;
  }

  /**
   * Sends a JSON-serializable message to the specified session.
   *
   * @param sessionId - The session to send the message to
   * @param message - Serializable WebSocketMessage object
   * @returns True if the message was sent, false otherwise
   */
  send(sessionId: string, message: WebSocketMessage): boolean {
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