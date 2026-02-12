---
title: WebSocket Utilities
description: Schema-validated WebSocket message encoding, decoding, and AsyncAPI 3.0 spec generation via @forklaunch/core/ws.
---

## Overview

The `@forklaunch/core/ws` module provides utilities for working with WebSocket messages in a type-safe, schema-validated way. It does not provide WebSocket client or server classes. Instead, it offers:

- A schema system (`EventSchema`) for defining all message types in a WebSocket protocol.
- Functions to build union schemas from event definitions and validate/encode/decode messages against them.
- An AsyncAPI 3.0 specification generator that produces machine-readable documentation from your event schemas.

These utilities are designed to be used alongside any WebSocket library (e.g., `ws`, `uWebSockets.js`) to add runtime validation and documentation generation.

## Import

All exports come from the `@forklaunch/core/ws` subpath:

```typescript
import {
  generateAsyncApi,
  createWebSocketSchemas,
  encodeSchemaValue,
  decodeSchemaValue,
  parseSchemaValue,
  normalizeEncodedValue,
  buildUnionSchema,
} from '@forklaunch/core/ws';
```

Types are exported from the same path:

```typescript
import type {
  EventSchema,
  EventSchemaEntry,
  ServerEventSchema,
  AsyncApiDocument,
  AsyncApiEnrichment,
  ExtractSchemaFromEntry,
  ExtractSchemaFromRecord,
} from '@forklaunch/core/ws';
```

## Defining Event Schemas

The `EventSchema` type describes every message category in a WebSocket protocol.

```typescript
type EventSchema<SV extends AnySchemaValidator> = {
  ping?: EventSchemaEntry<SV>;
  pong?: EventSchemaEntry<SV>;
  clientMessages: Record<string, EventSchemaEntry<SV>>;
  serverMessages: Record<string, EventSchemaEntry<SV>>;
  errors?: Record<string, EventSchemaEntry<SV>>;
  closeReason?: Record<string, EventSchemaEntry<SV>>;
  context?: StringOnlyObject<SV>;
  userData?: StringOnlyObject<SV>;
};
```

Each entry in the schema is an `EventSchemaEntry`:

```typescript
type EventSchemaEntry<SV extends AnySchemaValidator> = {
  shape: IdiomaticSchema<SV>;
} & AsyncApiEnrichment;
```

The `AsyncApiEnrichment` fields are optional metadata used during AsyncAPI generation:

```typescript
type AsyncApiEnrichment = {
  channel?: string;
  channels?: string[];
  operation?: string;
  operations?: string[];
};
```

### Field descriptions

| Field | Required | Description |
|---|---|---|
| `clientMessages` | Yes | Messages sent from client to server. Keys are message names, values are schema entries. |
| `serverMessages` | Yes | Messages sent from server to client. |
| `ping` | No | Schema for ping frame payloads. |
| `pong` | No | Schema for pong frame payloads. |
| `errors` | No | Error message schemas. |
| `closeReason` | No | Close reason schemas. |
| `context` | No | Connection context shape (string-valued properties). |
| `userData` | No | User data shape (string-valued properties). |

### Example

```typescript
import { z } from 'zod';

const eventSchemas = {
  ping: { shape: z.object({ ts: z.number() }) },
  pong: { shape: z.object({ ts: z.number() }) },
  clientMessages: {
    chat: {
      shape: z.object({
        type: z.literal('chat'),
        message: z.string(),
        userId: z.string(),
      }),
    },
    typing: {
      shape: z.object({
        type: z.literal('typing'),
        userId: z.string(),
        isTyping: z.boolean(),
      }),
    },
  },
  serverMessages: {
    chatResponse: {
      shape: z.object({
        type: z.literal('chat'),
        message: z.string(),
        timestamp: z.string(),
      }),
    },
  },
  errors: {
    validationError: {
      shape: z.object({
        code: z.string(),
        message: z.string(),
      }),
    },
  },
  closeReason: {
    unauthorized: {
      shape: z.object({
        code: z.literal(1008),
        message: z.string(),
      }),
    },
  },
};
```

### ServerEventSchema

The `ServerEventSchema` utility type swaps `clientMessages` and `serverMessages`, which is useful on the server side where incoming messages are the client's outgoing messages and vice versa:

```typescript
type ServerEventSchema<SV, ES extends EventSchema<SV>> =
  Omit<ES, 'serverMessages' | 'clientMessages'> & {
    serverMessages: ES['clientMessages'];
    clientMessages: ES['serverMessages'];
  };
```

## Creating WebSocket Schemas

`createWebSocketSchemas` takes an `EventSchema` and produces union schemas for each message category. It calls `buildUnionSchema` internally to combine multiple schema entries into a single union.

```typescript
function createWebSocketSchemas<SV, ES extends EventSchema<SV>>(
  schemaValidator: SchemaValidator,
  eventSchemas: ES
): {
  clientMessagesSchema: IdiomaticSchema<SV> | undefined;
  serverMessagesSchema: IdiomaticSchema<SV> | undefined;
  errorsSchema: IdiomaticSchema<SV> | undefined;
  pingSchema: IdiomaticSchema<SV> | undefined;
  pongSchema: IdiomaticSchema<SV> | undefined;
  closeReasonSchema: IdiomaticSchema<SV> | undefined;
};
```

### Behavior

- For `clientMessages`, `serverMessages`, `errors`, and `closeReason`, it builds a union of all entry shapes using `buildUnionSchema`. If the record has a single entry, the shape is returned directly (no union wrapper). If the record is undefined or empty, the result is `undefined`.
- For `ping` and `pong`, it extracts the `.shape` directly from the entry (no union needed since there is at most one schema each).

### Example

```typescript
import { SchemaValidator } from '@forklaunch/validator';

const schemaValidator = new SchemaValidator();
const schemas = createWebSocketSchemas(schemaValidator, eventSchemas);

// schemas.clientMessagesSchema  - union of chat | typing
// schemas.serverMessagesSchema  - chatResponse shape
// schemas.errorsSchema          - validationError shape
// schemas.pingSchema            - ping shape
// schemas.pongSchema            - pong shape
// schemas.closeReasonSchema     - unauthorized shape
```

## Encoding and Decoding Messages

These functions handle converting between JavaScript values and `Buffer` payloads, with schema validation at each step.

### encodeSchemaValue

Validates a value against a schema and encodes it to a `Buffer`.

```typescript
function encodeSchemaValue<SV>(
  schemaValidator: SchemaValidator,
  value: unknown,
  schema: IdiomaticSchema<SV> | undefined,
  context: string
): unknown;
```

**Encoding rules (after validation):**
- `Buffer` values are returned as-is.
- `ArrayBuffer` or `ArrayBufferView` values are converted to `Buffer`.
- Strings are encoded as UTF-8 `Buffer`.
- `null` and `undefined` are returned as-is.
- All other values (objects, numbers, etc.) are JSON-stringified and then encoded as UTF-8 `Buffer`.

If the schema is `undefined`, the value passes through without validation.

### decodeSchemaValue

Decodes raw WebSocket data into a validated JavaScript value.

```typescript
function decodeSchemaValue<SV>(
  schemaValidator: SchemaValidator,
  data: unknown,
  schema: IdiomaticSchema<SV> | undefined,
  context: string
): unknown;
```

**Decoding rules:**
1. `Buffer`, `ArrayBuffer`, or `ArrayBufferView` inputs are converted to a UTF-8 string.
2. Strings are JSON-parsed. If JSON parsing fails, the raw string is used.
3. The resulting value is validated against the schema via `parseSchemaValue`.
4. If `data` is already a non-binary, non-string value (e.g., a plain object), it is validated directly.

### parseSchemaValue

Validates a value against a schema and returns the parsed result. Throws an error with pretty-printed parse errors if validation fails.

```typescript
function parseSchemaValue<SV>(
  schemaValidator: SchemaValidator,
  value: unknown,
  schema: IdiomaticSchema<SV> | undefined,
  context: string
): unknown;
```

If `schema` is `undefined`, the value is returned as-is without validation.

The `context` parameter is a descriptive string (e.g., `"client message"`) used in error messages when validation fails.

### Example

```typescript
// Encoding: validate and convert to Buffer for sending
const encoded = encodeSchemaValue(
  schemaValidator,
  { type: 'chat', message: 'hello', userId: 'abc' },
  schemas.clientMessagesSchema,
  'client message'
);
// encoded is a Buffer containing the JSON string

// Decoding: convert received Buffer back to validated object
const decoded = decodeSchemaValue(
  schemaValidator,
  receivedBuffer,
  schemas.serverMessagesSchema,
  'server message'
);
// decoded is a validated JavaScript object
```

## AsyncAPI Generation

`generateAsyncApi` produces an AsyncAPI 3.0 specification document from an `EventSchema`.

```typescript
function generateAsyncApi<SV>(
  eventSchemas: EventSchema<SV>,
  options?: {
    title?: string;
    version?: string;
    description?: string;
    id?: AsyncApiDocument['id'];
    defaultContentType?: AsyncApiDocument['defaultContentType'];
  }
): AsyncApiDocument;
```

### Behavior

- Iterates over `clientMessages`, `serverMessages`, and `errors` to build the `channels` section. Each entry becomes a message within a channel.
- Channel names default to the message key. You can override this with the `channel` or `channels` fields on the `EventSchemaEntry`.
- Operation names default to the message key. You can override this with the `operation` or `operations` fields.
- `clientMessages` generate operations with `action: "receive"`.
- `serverMessages` generate operations with `action: "send"`.
- The `info.title` defaults to `process.env.API_TITLE` or `"Forklaunch WebSocket API"` if not provided.
- The `info.version` defaults to `"1.0.0"`.

### Example

```typescript
const asyncApiDoc = generateAsyncApi(eventSchemas, {
  title: 'Chat WebSocket API',
  version: '2.0.0',
  description: 'Real-time chat protocol',
  defaultContentType: 'application/json',
});

console.log(JSON.stringify(asyncApiDoc, null, 2));
```

This produces a document with the following structure:

```json
{
  "asyncapi": "3.0.0",
  "info": {
    "title": "Chat WebSocket API",
    "version": "2.0.0",
    "description": "Real-time chat protocol"
  },
  "defaultContentType": "application/json",
  "channels": {
    "chat": {
      "address": "chat",
      "messages": {
        "chat": {
          "name": "chat",
          "payload": {}
        }
      }
    }
  },
  "operations": {
    "receive-chat-chat": {
      "action": "receive",
      "channel": { "$ref": "#/channels/chat" },
      "messages": [{ "$ref": "#/channels/chat/messages/chat" }]
    }
  }
}
```

### Custom channel and operation names

Use the `channel`/`channels` and `operation`/`operations` fields on an entry to control how it appears in the AsyncAPI spec:

```typescript
const eventSchemas = {
  clientMessages: {
    sendMessage: {
      shape: z.object({ text: z.string() }),
      channel: 'chat-room',
      operation: 'publishChatMessage',
    },
    sendAlert: {
      shape: z.object({ level: z.string(), text: z.string() }),
      channels: ['alerts', 'notifications'],
    },
  },
  serverMessages: {},
};
```

## Helper Utilities

### buildUnionSchema

Builds a union schema from a record of `EventSchemaEntry` values.

```typescript
function buildUnionSchema<SV>(
  schemaValidator: SchemaValidator,
  record: Record<string, EventSchemaEntry<SV>> | undefined
): IdiomaticSchema<SV> | undefined;
```

- Returns `undefined` if the record is `undefined` or has no entries.
- Returns the single entry's shape directly if there is exactly one entry.
- Returns a union schema (via `schemaValidator.union(...)`) if there are multiple entries.

### normalizeEncodedValue

Converts various input types into a `Buffer`.

```typescript
function normalizeEncodedValue(
  encoded: unknown,
  context: string,
  allowUndefined?: boolean
): Buffer | undefined;
```

**Conversion rules:**
- `null` or `undefined`: throws an error unless `allowUndefined` is `true`, in which case returns `undefined`.
- `Buffer`: returned as-is.
- `ArrayBuffer`: wrapped in `Buffer.from(...)`.
- `ArrayBufferView`: extracted and wrapped in `Buffer`.
- `string`: encoded as UTF-8 `Buffer`.
- `number`, `boolean`, `bigint`, or `object`: JSON-stringified and encoded as UTF-8 `Buffer`.
- Any other type: throws an error.

### Type Helpers

Two utility types are exported for extracting schema shapes:

- `ExtractSchemaFromEntry<SV, Entry>` -- extracts the `shape` type from a single `EventSchemaEntry`.
- `ExtractSchemaFromRecord<SV, RecordType>` -- extracts a union of all `shape` types from a record of `EventSchemaEntry` values.
