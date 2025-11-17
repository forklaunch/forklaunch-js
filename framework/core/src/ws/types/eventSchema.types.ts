import { AnySchemaValidator, IdiomaticSchema } from '@forklaunch/validator';
import { StringOnlyObject } from '../../http/types/contractDetails.types';

export type AsyncApiEnrichment = {
  channel?: string;
  channels?: string[];
  operation?: string;
  operations?: string[];
};

export type EventSchemaEntry<SV extends AnySchemaValidator> = {
  shape: IdiomaticSchema<SV>;
} & AsyncApiEnrichment;

export type EventSchema<SV extends AnySchemaValidator> = {
  ping?: EventSchemaEntry<SV>;
  pong?: EventSchemaEntry<SV>;
  clientMessages: Record<string, EventSchemaEntry<SV>>;
  serverMessages: Record<string, EventSchemaEntry<SV>>;
  errors?: Record<string, EventSchemaEntry<SV>>;
  closeReason?: Record<string, EventSchemaEntry<SV>>;
  context?: StringOnlyObject<SV>;
  userData?: StringOnlyObject<SV>;
};

export type ServerEventSchema<
  SV extends AnySchemaValidator,
  ES extends EventSchema<SV>
> = Omit<ES, 'serverMessages' | 'clientMessages'> & {
  serverMessages: ES['clientMessages'];
  clientMessages: ES['serverMessages'];
};

export type ExtractSchemaFromEntry<
  SV extends AnySchemaValidator,
  Entry extends EventSchemaEntry<SV> | undefined
> = Entry extends EventSchemaEntry<SV> ? Entry['shape'] : never;

export type ExtractSchemaFromRecord<
  SV extends AnySchemaValidator,
  RecordType extends Record<string, EventSchemaEntry<SV>> | undefined
> =
  RecordType extends Record<string, EventSchemaEntry<SV>>
    ? RecordType[keyof RecordType]['shape']
    : never;
