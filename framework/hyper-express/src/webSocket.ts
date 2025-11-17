import {
  createWebSocketSchemas,
  encodeSchemaValue,
  EventSchema,
  EventSchemaEntry,
  ExtractSchemaFromEntry,
  ExtractSchemaFromRecord,
  normalizeEncodedValue
} from '@forklaunch/core/ws';
import { SendableData, Websocket } from '@forklaunch/hyper-express-fork';
import {
  AnySchemaValidator,
  Schema,
  SchemaValidator
} from '@forklaunch/validator';

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
      schemaValidator as SchemaValidator,
      eventSchemas
    );
  }

  // @ts-expect-error - Intentionally restricting types for compile-time schema validation
  override send(
    message: ES['serverMessages'] extends Record<string, EventSchemaEntry<SV>>
      ? Schema<ExtractSchemaFromRecord<SV, ES['serverMessages']>, SV>
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

  // @ts-expect-error - Intentionally restricting types for compile-time schema validation
  override ping(
    message?: ES['ping'] extends EventSchemaEntry<SV>
      ? Schema<ExtractSchemaFromEntry<SV, ES['ping']>, SV>
      : SendableData
  ): void {
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

  // @ts-expect-error - Intentionally restricting types for compile-time schema validation
  override close(
    code?: number,
    message?: ES['closeReason'] extends Record<string, EventSchemaEntry<SV>>
      ? Schema<ExtractSchemaFromRecord<SV, ES['closeReason']>, SV>
      : SendableData
  ): void {
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
