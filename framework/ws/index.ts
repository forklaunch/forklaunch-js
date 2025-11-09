/**
 * @packageDocumentation
 *
 * # ForkLaunch WebSocket Library
 *
 * Type-safe WebSocket client and server with automatic schema validation and data transformation.
 *
 * ## Features
 *
 * - **Automatic Validation**: All messages validated against provided schemas
 * - **Auto Transformation**: Buffer ↔ Object conversion handled automatically
 * - **Type Safety**: Full TypeScript support with proper event typing
 * - **Schema Agnostic**: Works with Zod, TypeBox, or any validator
 * - **Drop-in Replacement**: Extends standard `ws` library
 *
 * ## Quick Start
 *
 * ```typescript
 * import { ZodSchemaValidator } from '@forklaunch/validator';
 * import { z } from 'zod';
 * import { ForklaunchWebSocket, ForklaunchWebSocketServer } from '@forklaunch/ws';
 *
 * // Define schemas
 * const validator = new ZodSchemaValidator();
 * const schemas = {
 *   clientMessages: {
 *     chat: z.object({ type: z.literal('chat'), message: z.string() })
 *   },
 *   serverMessages: {
 *     response: z.object({ type: z.literal('response'), data: z.string() })
 *   }
 * };
 *
 * // Server
 * const wss = new ForklaunchWebSocketServer(validator, schemas, { port: 8080 });
 * wss.on('connection', (ws) => {
 *   ws.on('message', (data) => {
 *     console.log('Validated message:', data);
 *   });
 * });
 *
 * // Client
 * const ws = new ForklaunchWebSocket(validator, schemas, 'ws://localhost:8080');
 * ws.on('open', () => {
 *   ws.send({ type: 'chat', message: 'Hello!' });
 * });
 * ```
 *
 * @see {@link ForklaunchWebSocket} for client documentation
 * @see {@link ForklaunchWebSocketServer} for server documentation
 * @see {@link EventSchema} for schema structure
 */

// Re-export main classes
export { ForklaunchWebSocket } from './src/webSocket';
export {
  buildUnionSchema,
  createWebSocketSchemas,
  decodeSchemaValue,
  encodeSchemaValue,
  normalizeEncodedValue,
  parseSchemaValue
} from './src/webSocketLike';
export { ForklaunchWebSocketServer } from './src/webSocketServer';

// Re-export types
export type {
  EventSchema,
  ServerEventSchema
} from './src/types/eventSchema.types';

// Re-export original ws types
export { WebSocket, WebSocketServer } from 'ws';

// Re-export ws constants from WebSocket class
import { WebSocket } from 'ws';
export const CLOSED = WebSocket.CLOSED;
export const CLOSING = WebSocket.CLOSING;
export const CONNECTING = WebSocket.CONNECTING;
export const OPEN = WebSocket.OPEN;

// Re-export EventEmitter
export { EventEmitter } from 'events';

// Default export is the extended WebSocket
export { ForklaunchWebSocket as default } from './src/webSocket';
