---
title: Framework - Error Handling
category: References
description: Reference for Error Handling in ForkLaunch.
---

## Overview

ForkLaunch provides standardized error handling with automatic:
- HTTP status code mapping
- Correlation ID tracking
- Telemetry integration

## Standard Error Responses

ForkLaunch uses Express-style error handling with a default handler that returns a 500 status code and correlation ID, hiding internal error details.

### Authentication Errors
- **401 Unauthorized**: Missing or invalid credentials
- **403 Forbidden**: Valid credentials but insufficient permissions

### Not Found (404)
Resource not found errors with path information

### Server Errors (500)
Unexpected errors with safe error messages

## Correlation IDs

Every workflow gets a unique correlation ID that:
- Links related logs, metrics, and traces
- Helps with request tracking across services
- Simplifies debugging and support

## Error Logging
Errors are automatically:
- Logged with appropriate severity
- Tagged with correlation IDs
- Linked to related telemetry

## Security Considerations

1. Never expose internal error details in production
2. Log full error details for debugging
3. Use appropriate error status codes
4. Validate all error response data
5. Include retry-after headers when appropriate

## Response Status Codes

| Code | Description | Usage |
|------|-------------|-------|
| 400 | Bad Request | Invalid input, validation errors |
| 401 | Unauthorized | Missing or invalid authentication |
| 403 | Forbidden | Valid auth but insufficient permissions |
| 404 | Not Found | Resource doesn't exist |
| 429 | Too Many Requests | Rate limit exceeded (coming soon) |
| 500 | Internal Server Error | Unexpected server errors |
| 503 | Service Unavailable | Service temporarily unavailable |

