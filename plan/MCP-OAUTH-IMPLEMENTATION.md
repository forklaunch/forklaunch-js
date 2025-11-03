# MCP OAuth Implementation Plan

## Overview

Add Google OAuth authentication to MCP servers using better-auth. IAM service handles OAuth flow, all other services validate tokens against IAM.

## Architecture

```
┌─────────────┐         ┌─────────────┐         ┌──────────────┐
│   Browser   │────────▶│ IAM Service │────────▶│    Google    │
│             │◀────────│   (OAuth)   │◀────────│    OAuth     │
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

**Goal:** Add Google OAuth endpoints to IAM service for MCP authentication

**Files to Modify:**

1. **`blueprint/iam-better-auth/auth.ts`**
   - Add Google OAuth provider to better-auth config
   - Add env vars: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`

2. **`blueprint/iam-better-auth/api/routes/mcp-auth.routes.ts`** (new file)
   - `GET /mcp/auth/login` - Returns Google OAuth URL
   - `GET /mcp/auth/callback` - Handles OAuth callback, displays token in plain text/HTML
   - `GET /mcp/auth/validate` - Validates session token (for other services to call)

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
      
      const response = await fetch(`${IAM_SERVICE_URL}/mcp/auth/validate`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      return response.ok ? await response.json() : undefined;
    }
  }
});
```

**Environment Variables:**
Add `IAM_SERVICE_URL=http://localhost:3001` to each service's `.env.example`

---

### Stage 4: CLI Changes (Optional)

**Goal:** Add helper command for OAuth login

**File:** `cli/src/commands/auth.rs` (new)

**Command:** `forklaunch auth login`
- Calls IAM login endpoint
- Opens browser
- Captures and saves token to config file

**Note:** This is optional enhancement. Users can authenticate manually via browser for initial implementation.

---

## User Authentication Flow

### Manual Flow (Phase 1)

1. User runs: `curl http://localhost:3001/mcp/auth/login`
2. Response contains Google OAuth URL
3. User opens URL in browser
4. After Google auth, callback page displays token
5. User copies token
6. User includes in MCP requests: `Authorization: Bearer <token>`

### CLI Flow (Phase 2 - Optional)

1. User runs: `forklaunch auth login`
2. Browser opens automatically
3. After auth, token saved to config
4. CLI uses token automatically for MCP requests

---

## Configuration

### IAM Service (.env)
```bash
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
BETTER_AUTH_BASE_PATH=/auth
```

### Other Services (.env)
```bash
IAM_SERVICE_URL=http://localhost:3001
```

---

## Key Design Decisions

1. **Centralized OAuth:** Only IAM service integrates with Google OAuth
2. **Token Validation:** All services validate via IAM's `/mcp/auth/validate` endpoint
3. **Shared Database:** IAM's existing Account/Session tables store OAuth tokens
4. **No UI Required:** Callback page displays token as plain text for terminal use
5. **Framework Agnostic:** Framework only wires callbacks, no auth logic

---

## Testing

### IAM OAuth Flow
```bash
# 1. Start IAM service
cd blueprint/iam-better-auth && pnpm dev

# 2. Get OAuth URL
curl http://localhost:3001/mcp/auth/login

# 3. Open URL in browser, complete Google OAuth

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

## Timeline

- **Stage 1 (Framework):** ✅ COMPLETED
- **Stage 2 (IAM OAuth):** ~2 hours
- **Stage 3 (Other Services):** ~1 hour
- **Stage 4 (CLI - Optional):** ~2 hours

**Total:** ~3 hours for core functionality (Stages 2-3)

