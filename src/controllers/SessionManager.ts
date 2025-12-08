/**
 * SessionManager
 * ---------------
 * Tracks which session IDs are currently active. This is used to
 * determine whether a request should still process or whether
 * a session has been cancelled/closed.
 */

export class SessionManager {
  /** Set of active session IDs */
  private activeSessions: Set<string> = new Set();

  /**
   * Marks a session as active.
   *
   * @param sessionId - Unique session identifier
   */
  addSession(sessionId: string): void {
    this.activeSessions.add(sessionId);
  }

  /**
   * Removes a session from the active set.
   *
   * @param sessionId - The session ID to remove
   */
  removeSession(sessionId: string): void {
    this.activeSessions.delete(sessionId);
  }

  /**
   * Checks if a given session is marked as active.
   *
   * @param sessionId - Session identifier to check
   * @returns True if the session is active
   */
  isActive(sessionId: string): boolean {
    return this.activeSessions.has(sessionId);
  }

  /**
   * Retrieves a list of all currently active session IDs.
   *
   * @returns Array of session IDs
   */
  getAllActiveSessions(): string[] {
    return Array.from(this.activeSessions);
  }
}