/**
 * OAuth 2.0 types and interfaces for MCP server integration
 */

export interface OAuthToken {
  accessToken: string;
  refreshToken?: string;
  tokenType: string;
  expiresIn: number;
  scope: string;
  createdAt: Date;
  expiresAt: Date;
}

export interface OAuthConfig {
  clientId: string;
  clientSecret: string;
  authorizationUrl: string;
  tokenUrl: string;
  redirectUri: string;
  scopes: string[];
  storeToken?: (token: OAuthToken) => Promise<void>;
  retrieveToken?: (tokenId: string) => Promise<OAuthToken | null>;
  deleteToken?: (tokenId: string) => Promise<void>;
  cacheEnabled?: boolean;
  cacheTtl?: number;
}

export interface OAuthStorage {
  storeToken(tokenId: string, token: OAuthToken): Promise<void>;
  retrieveToken(tokenId: string): Promise<OAuthToken | null>;
  deleteToken(tokenId: string): Promise<void>;
  clearExpiredTokens(): Promise<void>;
  storeSession(sessionId: string, session: OAuthSession): Promise<void>;
  retrieveSession(sessionId: string): Promise<OAuthSession | null>;
  deleteSession(sessionId: string): Promise<void>;
}

export interface OAuthAuthorizationRequest {
  clientId: string;
  redirectUri: string;
  scope: string;
  state: string;
  responseType: 'code';
}

export interface OAuthTokenRequest {
  grantType: 'authorization_code' | 'refresh_token';
  code?: string;
  refreshToken?: string;
  redirectUri?: string;
  clientId: string;
  clientSecret: string;
}

export interface OAuthTokenResponse {
  access_token: string;
  refresh_token?: string;
  token_type: string;
  expires_in: number;
  scope: string;
}

export interface OAuthError {
  error: string;
  error_description?: string;
  error_uri?: string;
}

export interface OAuthSession {
  sessionId: string;
  tokenId: string;
  state?: string;
  redirectUri?: string;
  userId?: string;
  createdAt: Date;
  lastAccessed: Date;
}

export interface OAuthValidationResult {
  isValid: boolean;
  token?: OAuthToken;
  error?: string;
}

export interface OAuthEndpointAuthMapping {
  endpoint: string;
  authMethod: 'jwt' | 'basic' | 'hmac';
  tokenMapping: (oauthToken: OAuthToken) => string;
}
