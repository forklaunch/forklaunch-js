---
title: MCP Autogeneration
category: Framework
description: Automatic Model Context Protocol (MCP) generation for ForkLaunch applications.
status: In Progress
---

# MCP Autogeneration

> ⚠️ **Development Status**: This feature is currently under active development and not yet available in production releases. API design may change before stable release.

## Overview

ForkLaunch provides automatic exposure of your API endpoints as Model Context Protocol (MCP) tools through a dedicated `/mcp` endpoint on your running application. This enables AI assistants and other external tools to interact with your application through a standardized interface using Streamable HTTP transport.

**Prerequisites:**
- Requires `zod` validator choice (see [Validation](/docs/framework/validation.md))
- Built on [HTTP Framework](/docs/framework/http.md) contract definitions
- Integrates with [Authorization](/docs/framework/authorization.md) for security

## What is MCP?

Model Context Protocol (MCP) is an open standard that allows AI systems to securely access data and tools from various sources. ForkLaunch automatically exposes your API endpoints as MCP tools, making your APIs immediately available to AI assistants, development tools, and other MCP-compatible clients.

## Features (Planned)

### Automatic Tool Exposure
- Expose API endpoints as MCP tools via `/mcp` endpoint
- Generate tools from ContractDetails objects automatically
- Support for all HTTP methods and endpoints
- Type-safe parameter handling from schemas
- Streamable HTTP transport for real-time communication

### Endpoint-Level Control
- Opt-out individual endpoints from MCP exposure
- Configure tool visibility per endpoint
- Custom tool descriptions and metadata
- Fine-grained access control

### Integration Features
- Seamless integration with existing applications
- No separate server or port required
- Automatic schema validation for tool parameters
- Error handling and response formatting
- Authentication passthrough

## Architecture

MCP integration works by:
1. **Endpoint Registration**: Automatically registers endpoints with ContractDetails as MCP tools
2. **Transport Layer**: Uses Streamable HTTP transport over the `/mcp` endpoint
3. **Schema Integration**: Leverages existing ForkLaunch validation schemas
4. **Opt-out Support**: Respects endpoint-level MCP configuration

```
┌─────────────────┐    HTTP/Stream    ┌─────────────────┐
│   MCP Client    │ ────────────────► │  Your API Host  │
│ (AI Assistant)  │                   │   GET /mcp      │
└─────────────────┘                   └─────────────────┘
                                              │
                                              ▼
                                      ┌─────────────────┐
                                      │ MCP Tool Router │
                                      │ /users/:id      │
                                      │ /users (POST)   │
                                      │ /orders/:id     │
                                      └─────────────────┘
```

## Configuration

MCP can be configured through the ForkLaunch application configuration:

```typescript
import { forklaunchExpress } from '@forklaunch/express';

const app = forklaunchExpress(schemaValidator, telemetryCollector, {
  // ... other options
  mcp: {
    enabled: true,
    endpoint: '/mcp',                    // MCP endpoint path
    serverName: 'my-api-server',
    description: 'MCP server for My API',
    authentication: {
      required: true,                    // Require auth for MCP access
      passthrough: true,                 // Pass auth to underlying endpoints
    },
  },
});
```

### Configuration Options

| Option | Type | Description | Default |
| :----- | :--- | :---------- | :------ |
| `enabled` | boolean | Enable MCP endpoint exposure | `false` |
| `endpoint` | string | Path for the MCP endpoint | `'/mcp'` |
| `serverName` | string | Name of the MCP server | Application name |
| `description` | string | Description of the MCP server | Auto-generated |
| `authentication.required` | boolean | Require authentication for MCP access | `false` |
| `authentication.passthrough` | boolean | Pass authentication to underlying endpoints | `true` |

## Endpoint-Level Configuration

Control MCP exposure at the individual endpoint level through ContractDetails:

```typescript
// Include in MCP (default when defaultInclude: true)
const userContractDetails = {
  name: 'getUser',
  summary: 'Get user by ID',
  // ... other contract details
  mcp: {
    enabled: true,                       // Explicitly include
    toolName: 'get_user_by_id',         // Custom tool name
    description: 'Retrieve user information by user ID',
  }
};

// Exclude from MCP
const adminContractDetails = {
  name: 'adminOperation',
  summary: 'Admin-only operation',
  // ... other contract details
  mcp: {
    enabled: false,                      // Opt-out from MCP
  }
};

// Use defaults
const publicContractDetails = {
  name: 'publicEndpoint',
  summary: 'Public endpoint',
  // ... other contract details
  // No mcp config = uses application defaults
};
```

### MCP Contract Options

| Option | Type | Description | Default |
| :----- | :--- | :---------- | :------ |
| `enabled` | boolean | Include this endpoint in MCP | Application default |
| `toolName` | string | Custom name for the MCP tool | Generated from endpoint |
| `description` | string | Tool description for MCP clients | Contract summary |
| `tags` | string[] | Tags for tool categorization | `[]` |

## Usage Examples (Planned)

### Basic Setup
```typescript
// Enable MCP on your application
const app = forklaunchExpress(schemaValidator, telemetryCollector, {
  mcp: {
    enabled: true,
    serverName: 'user-management-api',
    description: 'User management and authentication API',
  },
});

// Your existing routes automatically become MCP tools
app.get('/users/:id', {
  name: 'getUser',
  summary: 'Get user by ID',
  params: { id: string },
  responses: { 200: UserSchema.schema() },
  mcp: {
    toolName: 'get_user',
    description: 'Retrieve detailed user information',
  }
}, getUserHandler);

app.post('/users', {
  name: 'createUser',
  summary: 'Create new user',
  body: CreateUserSchema.schema(),
  responses: { 201: UserSchema.schema() },
  // Uses default MCP settings (included)
}, createUserHandler);
```

### Selective Exposure
```typescript
const app = forklaunchExpress(schemaValidator, telemetryCollector, {
  mcp: {
    enabled: true,
  },
});

// Only expose specific endpoints
app.get('/users/:id', {
  // ... contract details
  mcp: { enabled: true }                 // Explicitly include
}, getUserHandler);

app.delete('/users/:id', {
  // ... contract details
  mcp: { enabled: false }                // Explicitly exclude
}, deleteUserHandler);

app.get('/internal/health', {
  // ... contract details
  // No mcp config + defaultInclude: false = excluded
}, healthHandler);
```

## Transport Protocol

ForkLaunch MCP uses Streamable HTTP transport:

```typescript
// MCP client connection
const mcpClient = new McpClient({
  transport: new StreamableHttpTransport({
    url: 'https://your-api.com/mcp',
    headers: {
      'Authorization': 'Bearer your-token',
    },
  }),
});

// Tool invocation
const result = await mcpClient.callTool('get_user', {
  id: '123'
});
```

## Integration with AI Assistants (Planned)

### Claude Desktop
```json
{
  "mcpServers": {
    "my-api": {
      "command": "http",
      "args": ["https://your-api.com/mcp"],
      "env": {
        "API_KEY": "your-api-key"
      }
    }
  }
}
```

### Direct HTTP Integration
```typescript
// Direct MCP over HTTP
const response = await fetch('https://your-api.com/mcp', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer your-token',
  },
  body: JSON.stringify({
    method: 'tools/call',
    params: {
      name: 'get_user',
      arguments: { id: '123' }
    }
  })
});
```

## Security Considerations (Planned)

### Authentication
- Support for API key authentication
- JWT token validation
- OAuth 2.0 integration
- Authentication passthrough to underlying endpoints

### Access Control
- Endpoint-level MCP visibility control
- Tool filtering based on client identity
- Rate limiting for MCP access
- Audit logging for MCP requests

### Best Practices
```typescript
const app = forklaunchExpress(schemaValidator, telemetryCollector, {
  mcp: {
    enabled: true,
    authentication: {
      required: true,                    // Always require auth
      passthrough: true,                 // Validate against actual endpoints
    }
  },
});
```

## Development Workflow (Planned)

1. **Setup**: Enable MCP in your ForkLaunch application configuration
2. **Configure**: Set endpoint-level MCP options in ContractDetails
3. **Test**: Connect MCP clients to your `/mcp` endpoint
4. **Deploy**: Deploy normally - MCP endpoint deploys with your application
5. **Connect**: Configure AI assistants to use your MCP endpoint

### Debug Endpoints
```bash
# Check available MCP tools
curl https://your-api.com/mcp -X POST \
  -H "Content-Type: application/json" \
  -d '{"method": "tools/list"}'

# Validate tool parameters
curl https://your-api.com/mcp -X POST \
  -H "Content-Type: application/json" \
  -d '{"method": "tools/call", "params": {"name": "get_user", "arguments": {"id": "123"}}}'
```

## Related Documentation

- **[HTTP Frameworks](/docs/framework/http.md)** - Base HTTP framework configuration and ContractDetails
- **[Validation](/docs/framework/validation.md)** - Schema validation for MCP tools (zod required)
- **[Authorization](/docs/framework/authorization.md)** - Authentication and access control for MCP endpoints
- **[Documentation](/docs/framework/documentation.md)** - OpenAPI generation from the same contracts
- **[Error Handling](/docs/framework/error-handling.md)** - Standardized error responses for MCP tools

## Roadmap

- [ ] Basic MCP endpoint exposure
- [ ] Streamable HTTP transport implementation
- [ ] Endpoint-level opt-out configuration
- [ ] Tool registration and validation
- [ ] Authentication integration
- [ ] Real-time streaming support
- [ ] AI assistant integration guides
- [ ] Production deployment examples

---

**Note**: This feature is currently in development. The API and configuration options may change before the stable release. Check back for updates or follow the project on GitHub for the latest progress.
