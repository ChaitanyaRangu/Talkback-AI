"use strict";
/**
 * SessionManager
 * ---------------
 * Tracks which session IDs are currently active. This is used to
 * determine whether a request should still process or whether
 * a session has been cancelled/closed.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.SessionManager = void 0;
class SessionManager {
    /** Set of active session IDs */
    activeSessions = new Set();
    /**
     * Marks a session as active.
     *
     * @param sessionId - Unique session identifier
     */
    addSession(sessionId) {
        this.activeSessions.add(sessionId);
    }
    /**
     * Removes a session from the active set.
     *
     * @param sessionId - The session ID to remove
     */
    removeSession(sessionId) {
        this.activeSessions.delete(sessionId);
    }
    /**
     * Checks if a given session is marked as active.
     *
     * @param sessionId - Session identifier to check
     * @returns True if the session is active
     */
    isActive(sessionId) {
        return this.activeSessions.has(sessionId);
    }
    /**
     * Retrieves a list of all currently active session IDs.
     *
     * @returns Array of session IDs
     */
    getAllActiveSessions() {
        return Array.from(this.activeSessions);
    }
}
exports.SessionManager = SessionManager;
//# sourceMappingURL=SessionManager.js.map