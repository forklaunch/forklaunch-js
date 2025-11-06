# MCP OAuth Implementation Plan

## Overview

Add OAuth authentication to MCP servers using better-auth. IAM service handles OAuth flow, all other services validate tokens against IAM. Initial implementation focuses on Google OAuth with support for adding other providers.

## Architecture

```
┌─────────────┐         ┌─────────────┐         ┌──────────────┐
│   Browser   │────────▶│ IAM Service │────────▶│OAuth Provider│
│             │◀────────│   (OAuth)   │◀────────│ (Google, etc)│
└─────────────┘         └─────────────┘         └──────────────┘
       │                       │
       │ Bearer token          │ Validates token
       ▼                       ▼
┌─────────────┐         ┌─────────────┐
│ MCP Servers │────────▶│ IAM Service │
│ (Billing,   │◀────────│  /validate  │
│  Worker)    │         └─────────────┘
└─────────────┘
```

### Flow

1. User authenticates via IAM OAuth → receives session token
2. User includes token in MCP requests: `Authorization: Bearer <token>`
3. MCP server calls IAM to validate token
4. If valid, MCP processes request

## Implementation Stages

### ✅ Stage 1: Framework Changes (COMPLETED)

**Files Modified:**
- `framework/core/src/http/types/expressLikeOptions.ts` - Added authenticate option to MCP config
- `framework/core/src/http/mcpGenerator/mcpGenerator.ts` - Accept and pass authenticate callback
- `framework/express/src/expressApplication.ts` - Wire authenticate callback

**What it does:**
Framework now accepts an `authenticate` callback when configuring MCP. Simple pass-through - no auth logic in framework.

**Status:** ✅ Built, tested, ready for PR

---

### Stage 2: Blueprint IAM Service Changes

**Goal:** Add OAuth endpoints to IAM service for MCP authentication

**Files to Modify:**

1. **`blueprint/iam-better-auth/auth.ts`**
   - Add OAuth provider(s) to better-auth config (Google initially, extensible to others)
   - Add env vars: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` (add more as needed)

2. **`blueprint/iam-better-auth/api/routes/mcp-auth.routes.ts`** (new file)
   - `GET /mcp/auth/login` - Returns OAuth URL (supports provider parameter)
   - `GET /mcp/auth/callback` - Handles OAuth callback, displays token in plain text/HTML
   - **Note:** Use better-auth's existing `/auth/get-session` endpoint for token validation (no custom endpoint needed)

3. **`blueprint/iam-better-auth/server.ts`**
   - Mount the new mcp-auth router
   - Add MCP authenticate callback (validates locally since IAM has direct access to better-auth)

4. **`blueprint/iam-better-auth/registrations.ts`**
   - Add Google OAuth env vars to config injector

**IAM Database:** Already has `Account` and `Session` tables with OAuth fields - no migrations needed.

---

### Stage 3: Blueprint Other Services Changes

**Goal:** Configure MCP servers in other services to validate tokens via IAM

**Services:** billing-base, billing-stripe, sample-worker

**Files to Modify:**

For each service's `server.ts`:
```typescript
const IAM_SERVICE_URL = getEnvVar('IAM_SERVICE_URL') ?? 'http://localhost:3001';

const app = forklaunchExpress(schemaValidator, otel, {
  mcp: {
    authenticate: async (request) => {
      const token = request.headers.authorization?.replace('Bearer ', '');
      if (!token) return undefined;
      
      const response = await fetch(`${IAM_SERVICE_URL}/auth/get-session`, {
        headers: { Cookie: `better-auth.session_token=${token}` }
      });
      
      return response.ok ? await response.json() : undefined;
    }
  }
});
```

**Environment Variables:**
Add `IAM_SERVICE_URL=http://localhost:3001` to each service's `.env.example`

---

## User Authentication Flow

### Manual Flow

1. User runs: `curl http://localhost:3001/mcp/auth/login?provider=google`
2. Response contains OAuth URL for specified provider
3. User opens URL in browser
4. After OAuth authentication, callback page displays token
5. User copies token
6. User includes in MCP requests: `Authorization: Bearer <token>`

---

## Configuration

### IAM Service (.env)
```bash
# OAuth Providers (add more as needed)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
# GITHUB_CLIENT_ID=your-github-client-id
# GITHUB_CLIENT_SECRET=your-github-client-secret

BETTER_AUTH_BASE_PATH=/auth
```

### Other Services (.env)
```bash
IAM_SERVICE_URL=http://localhost:3001
```

---

## Key Design Decisions

1. **Centralized OAuth:** Only IAM service integrates with OAuth providers (extensible to multiple providers)
2. **Token Validation:** All services validate via better-auth's built-in `/auth/get-session` endpoint
3. **Shared Database:** IAM's existing Account/Session tables store OAuth tokens
4. **No UI Required:** Callback page displays token as plain text for terminal use
5. **Framework Agnostic:** Framework only wires callbacks, no auth logic
6. **Provider Flexibility:** Design supports adding GitHub, Microsoft, etc. by extending IAM config

---

## Testing

### IAM OAuth Flow
```bash
# 1. Start IAM service
cd blueprint/iam-better-auth && pnpm dev

# 2. Get OAuth URL (specify provider)
curl http://localhost:3001/mcp/auth/login?provider=google

# 3. Open URL in browser, complete OAuth

# 4. Copy token from callback page

# 5. Test MCP endpoint
curl -H "Authorization: Bearer TOKEN" http://localhost:5001/mcp
```

### Cross-Service Validation
```bash
# 1. Start billing service
cd blueprint/billing-base && pnpm dev

# 2. Use same token from IAM OAuth
curl -H "Authorization: Bearer TOKEN" http://localhost:5002/mcp
```

---

## Implementation Status

- **Stage 1 (Framework):** ✅ COMPLETED
- **Stage 2 (IAM OAuth):** Pending
- **Stage 3 (Other Services):** Pending

