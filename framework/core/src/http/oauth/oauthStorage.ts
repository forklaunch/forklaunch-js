import { OAuthSession, OAuthStorage, OAuthToken } from './types/oauth.types';

/**
 * In-memory OAuth storage implementation
 * This is the default storage mechanism for OAuth tokens and sessions
 */
export class InMemoryOAuthStorage implements OAuthStorage {
  private tokens = new Map<string, OAuthToken>();
  private sessions = new Map<string, OAuthSession>();

  async storeToken(tokenId: string, token: OAuthToken): Promise<void> {
    this.tokens.set(tokenId, token);
  }

  async retrieveToken(tokenId: string): Promise<OAuthToken | null> {
    const token = this.tokens.get(tokenId);
    if (!token) {
      return null;
    }

    // Check if token is expired
    if (token.expiresAt < new Date()) {
      this.tokens.delete(tokenId);
      return null;
    }

    return token;
  }

  async deleteToken(tokenId: string): Promise<void> {
    this.tokens.delete(tokenId);
  }

  async clearExpiredTokens(): Promise<void> {
    const now = new Date();
    for (const [tokenId, token] of this.tokens.entries()) {
      if (token.expiresAt < now) {
        this.tokens.delete(tokenId);
      }
    }
  }

  // Session management methods
  async storeSession(sessionId: string, session: OAuthSession): Promise<void> {
    this.sessions.set(sessionId, session);
  }

  async retrieveSession(sessionId: string): Promise<OAuthSession | null> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return null;
    }

    // Update last accessed time
    session.lastAccessed = new Date();
    this.sessions.set(sessionId, session);

    return session;
  }

  async deleteSession(sessionId: string): Promise<void> {
    this.sessions.delete(sessionId);
  }
}

/**
 * Custom OAuth storage implementation that uses provided hooks for tokens
 * and in-memory storage for sessions (sessions are ephemeral)
 */
export class CustomOAuthStorage implements OAuthStorage {
  private sessions = new Map<string, OAuthSession>();

  constructor(
    private storeTokenHook: (
      tokenId: string,
      token: OAuthToken
    ) => Promise<void>,
    private retrieveTokenHook: (tokenId: string) => Promise<OAuthToken | null>,
    private deleteTokenHook: (tokenId: string) => Promise<void>
  ) {}

  async storeToken(tokenId: string, token: OAuthToken): Promise<void> {
    return this.storeTokenHook(tokenId, token);
  }

  async retrieveToken(tokenId: string): Promise<OAuthToken | null> {
    return this.retrieveTokenHook(tokenId);
  }

  async deleteToken(tokenId: string): Promise<void> {
    return this.deleteTokenHook(tokenId);
  }

  async clearExpiredTokens(): Promise<void> {
    // Custom storage implementations should handle their own cleanup
    // This is a no-op for custom storage
  }

  // Session management uses in-memory storage (sessions are ephemeral/short-lived)
  async storeSession(sessionId: string, session: OAuthSession): Promise<void> {
    this.sessions.set(sessionId, session);
  }

  async retrieveSession(sessionId: string): Promise<OAuthSession | null> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return null;
    }

    // Update last accessed time
    session.lastAccessed = new Date();
    this.sessions.set(sessionId, session);

    return session;
  }

  async deleteSession(sessionId: string): Promise<void> {
    this.sessions.delete(sessionId);
  }
}

/**
 * Factory function to create OAuth storage based on configuration
 */
export function createOAuthStorage(config?: {
  storeToken?: (tokenId: string, token: OAuthToken) => Promise<void>;
  retrieveToken?: (tokenId: string) => Promise<OAuthToken | null>;
  deleteToken?: (tokenId: string) => Promise<void>;
}): OAuthStorage {
  if (config?.storeToken && config?.retrieveToken && config?.deleteToken) {
    return new CustomOAuthStorage(
      config.storeToken,
      config.retrieveToken,
      config.deleteToken
    );
  }

  return new InMemoryOAuthStorage();
}
