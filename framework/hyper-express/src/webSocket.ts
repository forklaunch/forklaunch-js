import { StringOnlyObject } from '@forklaunch/core/http';
import { SendableData, Websocket } from '@forklaunch/hyper-express-fork';
import {
  AnySchemaValidator,
  Schema,
  SchemaValidator
} from '@forklaunch/validator';
import { EventSchema } from '@forklaunch/ws';
import {
  createWebSocketSchemas,
  decodeSchemaValue,
  encodeSchemaValue,
  normalizeEncodedValue
} from '../../ws/src/webSocketLike';

export class WebSocket<
  SV extends AnySchemaValidator,
  ES extends EventSchema<SV>
> extends Websocket<ES['userData']> {
  private readonly schemas;
  private readonly schemaValidator: SchemaValidator;

  constructor(schemaValidator: SV, eventSchemas: ES) {
    super();
    this.schemaValidator = schemaValidator as SchemaValidator;
    this.schemas = createWebSocketSchemas<SV, ES>(
      schemaValidator,
      eventSchemas
    );
  }

  public decodeClientMessage(message: unknown): unknown {
    return decodeSchemaValue(
      this.schemaValidator,
      message,
      this.schemas.clientMessagesSchema,
      'web socket client message'
    );
  }

  public decodeServerMessage(message: unknown): unknown {
    return decodeSchemaValue(
      this.schemaValidator,
      message,
      this.schemas.serverMessagesSchema,
      'web socket server message'
    );
  }

  public decodeErrorPayload(error: unknown): unknown {
    return decodeSchemaValue(
      this.schemaValidator,
      error,
      this.schemas.errorsSchema,
      'web socket error'
    );
  }

  public decodePingPayload(payload: unknown): unknown {
    return decodeSchemaValue(
      this.schemaValidator,
      payload,
      this.schemas.pingSchema,
      'web socket ping'
    );
  }

  public decodePongPayload(payload: unknown): unknown {
    return decodeSchemaValue(
      this.schemaValidator,
      payload,
      this.schemas.pongSchema,
      'web socket pong'
    );
  }

  public decodeCloseReason(reason: unknown): unknown {
    return decodeSchemaValue(
      this.schemaValidator,
      reason,
      this.schemas.closeReasonSchema,
      'web socket close'
    );
  }

  // @ts-expect-error - Intentionally restricting types for compile-time schema validation
  override send(
    message: ES['serverMessages'] extends StringOnlyObject<SV>
      ? Schema<ES['serverMessages'][keyof ES['serverMessages']], SV>
      : SendableData,
    is_binary?: boolean,
    compress?: boolean
  ): boolean {
    const encoded = encodeSchemaValue(
      this.schemaValidator,
      message,
      this.schemas.serverMessagesSchema,
      'web socket message'
    );
    const payload = normalizeEncodedValue(encoded, 'web socket message');
    if (!payload) {
      throw new Error('Invalid web socket message');
    }
    return super.send(payload, is_binary, compress);
  }

  override ping(message?: SendableData): void {
    const payload =
      message !== undefined
        ? encodeSchemaValue(
            this.schemaValidator,
            message,
            this.schemas.pingSchema,
            'web socket ping'
          )
        : undefined;
    const prepared = normalizeEncodedValue(payload, 'web socket ping', true);
    super.ping(prepared);
  }

  override close(code?: number, message?: SendableData): void {
    const payload =
      message !== undefined
        ? encodeSchemaValue(
            this.schemaValidator,
            message,
            this.schemas.closeReasonSchema,
            'web socket close'
          )
        : undefined;
    const prepared = normalizeEncodedValue(payload, 'web socket close', true);
    super.close(code, prepared);
  }
}
