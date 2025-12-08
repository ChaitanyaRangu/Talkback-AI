"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConnectionManager = void 0;
/**
 * ConnectionManager
 * ------------------
 * Manages WebSocket connections by storing them in an in-memory map
 * keyed by `sessionId`. Provides methods to register, unregister,
 * look up connections, broadcast messages, and safely send data.
 */
const ws_1 = require("ws");
const Logger_1 = require("../services/Logger");
class ConnectionManager {
    /** Map of sessionId → WebSocket connection */
    connections = new Map();
    /**
     * Registers a WebSocket connection under a specific session ID.
     *
     * @param sessionId - Unique ID representing the client session
     * @param ws - WebSocket instance for the session
     */
    register(sessionId, ws) {
        this.connections.set(sessionId, ws);
    }
    /**
     * Removes a WebSocket connection associated with the given session ID.
     *
     * @param sessionId - The session to unregister
     */
    unregister(sessionId) {
        this.connections.delete(sessionId);
    }
    /**
     * Returns all active WebSocket connections.
     *
     * @returns A map of sessionId → WebSocket
     */
    getAllConenctions() {
        return this.connections;
    }
    getConnection(sessionId) {
        return this.connections.get(sessionId) || null;
    }
    /**
     * Sends a JSON-serializable message to the specified session.
     *
     * @param sessionId - The session to send the message to
     * @param message - Serializable WebSocketMessage object
     * @returns True if the message was sent, false otherwise
     */
    send(sessionId, message) {
        const ws = this.connections.get(sessionId);
        if (!ws || ws.readyState !== ws_1.WebSocket.OPEN) {
            return false;
        }
        try {
            ws.send(JSON.stringify(message));
            return true;
        }
        catch (error) {
            Logger_1.log.error(`Failed to send to ${sessionId}:`, error);
            return false;
        }
    }
}
exports.ConnectionManager = ConnectionManager;
//# sourceMappingURL=ConnectionManager.js.map