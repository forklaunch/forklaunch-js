import { StringOnlyObject } from '@forklaunch/core/http';
import { AnySchemaValidator, IdiomaticSchema } from '@forklaunch/validator';

/**
 * Schema definitions for WebSocket events.
 *
 * Defines the expected data structure for each type of WebSocket event:
 * - `ping` / `pong`: Heartbeat frame payloads
 * - `clientMessages`: Messages sent from client to server
 * - `serverMessages`: Messages sent from server to client
 * - `errors`: Error event payloads
 * - `closeReason`: Close frame reason payloads
 *
 * @template SV - The schema validator type (e.g., ZodSchemaValidator)
 *
 * @example With Zod
 * ```typescript
 * import { z } from 'zod';
 *
 * const schemas: EventSchema<ZodSchemaValidator> = {
 *   ping: z.object({ timestamp: z.number() }),
 *   pong: z.object({ timestamp: z.number() }),
 *   clientMessages: {
 *     chat: z.object({ type: z.literal('chat'), message: z.string() }),
 *     join: z.object({ type: z.literal('join'), roomId: z.string() })
 *   },
 *   serverMessages: {
 *     message: z.object({ type: z.literal('message'), text: z.string() }),
 *     userJoined: z.object({ type: z.literal('user-joined'), userId: z.string() })
 *   },
 *   errors: {
 *     validation: z.object({ code: z.number(), message: z.string() })
 *   },
 *   closeReason: z.object({ reason: z.string() })
 * };
 * ```
 *
 * @example Minimal Schema
 * ```typescript
 * const minimalSchemas = {
 *   clientMessages: { msg: z.object({ data: z.string() }) },
 *   serverMessages: { msg: z.object({ data: z.string() }) }
 * };
 * ```
 */
export type EventSchema<SV extends AnySchemaValidator> = {
  /** Schema for ping frame payloads */
  ping?: IdiomaticSchema<SV> & { channel?: string; channels?: string[] };
  /** Schema for pong frame payloads */
  pong?: IdiomaticSchema<SV> & { channel?: string; channels?: string[] };
  /** Record of schemas for messages sent from client to server (keyed by message type) */
  clientMessages: StringOnlyObject<SV> & {
    channel?: string;
    channels?: string[];
  };
  /** Record of schemas for messages sent from server to client (keyed by message type) */
  serverMessages: StringOnlyObject<SV> & {
    channel?: string;
    channels?: string[];
  };
  /** Record of schemas for error event payloads (keyed by error type) */
  errors?: StringOnlyObject<SV> & { channel?: string; channels?: string[] };
  /** Schema for close frame reason payloads */
  closeReason?: IdiomaticSchema<SV> & { channel?: string; channels?: string[] };
  /** Schema for the context object */
  context?: StringOnlyObject<SV>;
  /** Schema for the user data object */
  userData?: StringOnlyObject<SV>;
};

/**
 * Server-side event schema with swapped message directions.
 *
 * On the server side, the message directions are reversed:
 * - What the client sends as `clientMessages` arrives as `serverMessages`
 * - What the server sends as `clientMessages` goes out as `serverMessages` to the client
 *
 * This type automatically swaps these for you when used with {@link ForklaunchWebSocketServer}.
 *
 * @template SV - The schema validator type
 * @template ES - The original client-side event schema
 *
 * @internal This type is used internally by ForklaunchWebSocketServer
 */
export type ServerEventSchema<
  SV extends AnySchemaValidator,
  ES extends EventSchema<SV>
> = Omit<ES, 'serverMessages' | 'clientMessages'> & {
  /** Messages received from clients (originally clientMessages) */
  serverMessages: ES['clientMessages'];
  /** Messages sent to clients (originally serverMessages) */
  clientMessages: ES['serverMessages'];
};
