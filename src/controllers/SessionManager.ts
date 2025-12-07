export class SessionManager {
  private activeSessions: Set<string> = new Set();

  addSession(sessionId: string): void {
    this.activeSessions.add(sessionId);
  }

  removeSession(sessionId: string): void {
    this.activeSessions.delete(sessionId);
  }

  isActive(sessionId: string): boolean {
    return this.activeSessions.has(sessionId);
  }

  getAllActiveSessions(): string[] {
    return Array.from(this.activeSessions);
  }
}