import { randomBytes } from 'crypto';
import {
  OAuthAuthorizationRequest,
  OAuthConfig,
  OAuthSession,
  OAuthStorage,
  OAuthToken,
  OAuthTokenRequest,
  OAuthTokenResponse,
  OAuthValidationResult
} from './types/oauth.types';

/**
 * OAuth 2.0 flow implementation for MCP server
 * Handles authorization code flow and token management
 */
export class OAuthFlow {
  private storage: OAuthStorage;
  private config: OAuthConfig;

  constructor(config: OAuthConfig, storage: OAuthStorage) {
    this.config = config;
    this.storage = storage;
  }

  /**
   * Generate authorization URL for OAuth flow
   */
  async initiateAuthFlow(sessionId: string): Promise<string> {
    const state = this.generateState();

    // Include sessionId in redirect URI as a query parameter
    const redirectUriWithSession = `${this.config.redirectUri}?sessionId=${encodeURIComponent(sessionId)}`;

    const session: OAuthSession = {
      sessionId,
      tokenId: '', // Will be set after token exchange
      state,
      redirectUri: redirectUriWithSession,
      createdAt: new Date(),
      lastAccessed: new Date()
    };

    await this.storage.storeSession(sessionId, session);

    const authRequest: OAuthAuthorizationRequest = {
      clientId: this.config.clientId,
      redirectUri: redirectUriWithSession,
      scope: this.config.scopes.join(' '),
      state,
      responseType: 'code'
    };

    const params = new URLSearchParams({
      client_id: authRequest.clientId,
      redirect_uri: authRequest.redirectUri,
      scope: authRequest.scope,
      state: authRequest.state,
      response_type: authRequest.responseType
    });

    return `${this.config.authorizationUrl}?${params.toString()}`;
  }

  /**
   * Exchange authorization code for access token
   */
  async exchangeCodeForToken(
    code: string,
    state: string,
    sessionId: string
  ): Promise<OAuthToken> {
    const session = await this.storage.retrieveSession(sessionId);
    if (!session) {
      throw new Error('Invalid session');
    }

    if (session.state !== state) {
      throw new Error('Invalid state parameter - possible CSRF attack');
    }

    const tokenRequest: OAuthTokenRequest = {
      grantType: 'authorization_code',
      code,
      redirectUri: session.redirectUri,
      clientId: this.config.clientId,
      clientSecret: this.config.clientSecret
    };

    const response = await fetch(this.config.tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json'
      },
      body: new URLSearchParams({
        grant_type: tokenRequest.grantType,
        code: tokenRequest.code!,
        redirect_uri: tokenRequest.redirectUri!,
        client_id: tokenRequest.clientId,
        client_secret: tokenRequest.clientSecret
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(
        `Token exchange failed: ${error.error_description || error.error}`
      );
    }

    const tokenResponse: OAuthTokenResponse = await response.json();

    const token: OAuthToken = {
      accessToken: tokenResponse.access_token,
      refreshToken: tokenResponse.refresh_token,
      tokenType: tokenResponse.token_type,
      expiresIn: tokenResponse.expires_in,
      scope: tokenResponse.scope,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + tokenResponse.expires_in * 1000)
    };

    const tokenId = this.generateTokenId();
    await this.storage.storeToken(tokenId, token);

    session.tokenId = tokenId;
    await this.storage.storeSession(sessionId, session);

    return token;
  }

  /**
   * Validate OAuth token
   */
  async validateToken(tokenId: string): Promise<OAuthValidationResult> {
    try {
      const token = await this.storage.retrieveToken(tokenId);

      if (!token) {
        return {
          isValid: false,
          error: 'Token not found or expired'
        };
      }

      if (token.expiresAt < new Date()) {
        await this.storage.deleteToken(tokenId);
        return {
          isValid: false,
          error: 'Token expired'
        };
      }

      return {
        isValid: true,
        token
      };
    } catch (error) {
      return {
        isValid: false,
        error:
          error instanceof Error ? error.message : 'Token validation failed'
      };
    }
  }

  /**
   * Refresh OAuth token using refresh token
   */
  async refreshToken(tokenId: string): Promise<OAuthToken> {
    const token = await this.storage.retrieveToken(tokenId);
    if (!token || !token.refreshToken) {
      throw new Error('No refresh token available');
    }

    const tokenRequest: OAuthTokenRequest = {
      grantType: 'refresh_token',
      refreshToken: token.refreshToken,
      clientId: this.config.clientId,
      clientSecret: this.config.clientSecret
    };

    const response = await fetch(this.config.tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json'
      },
      body: new URLSearchParams({
        grant_type: tokenRequest.grantType,
        refresh_token: tokenRequest.refreshToken!,
        client_id: tokenRequest.clientId,
        client_secret: tokenRequest.clientSecret
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(
        `Token refresh failed: ${error.error_description || error.error}`
      );
    }

    const tokenResponse: OAuthTokenResponse = await response.json();

    const newToken: OAuthToken = {
      accessToken: tokenResponse.access_token,
      refreshToken: tokenResponse.refresh_token || token.refreshToken,
      tokenType: tokenResponse.token_type,
      expiresIn: tokenResponse.expires_in,
      scope: tokenResponse.scope,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + tokenResponse.expires_in * 1000)
    };

    await this.storage.storeToken(tokenId, newToken);

    return newToken;
  }

  /**
   * Get token for session
   */
  async getTokenForSession(sessionId: string): Promise<OAuthToken | null> {
    const session = await this.storage.retrieveSession(sessionId);
    if (!session || !session.tokenId) {
      return null;
    }

    return this.storage.retrieveToken(session.tokenId);
  }

  /**
   * Revoke token and clear session
   */
  async revokeToken(sessionId: string): Promise<void> {
    const session = await this.storage.retrieveSession(sessionId);
    if (session?.tokenId) {
      await this.storage.deleteToken(session.tokenId);
    }
    await this.storage.deleteSession(sessionId);
  }

  /**
   * Generate cryptographically secure state parameter
   */
  private generateState(): string {
    return randomBytes(32).toString('hex');
  }

  /**
   * Generate unique token ID
   */
  private generateTokenId(): string {
    return randomBytes(16).toString('hex');
  }
}
