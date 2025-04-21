import { serviceSchemaResolver } from '@forklaunch/core/mappers';
import { BullMqWorkerOptionsSchema as TypeBoxSchemas } from './typebox/bullMqWorker.schema';
import { BullMqWorkerOptionsSchema as ZodSchemas } from './zod/bullMqWorker.schema';

export const BullMqWorkerSchemas = serviceSchemaResolver(
  () => TypeBoxSchemas,
  () => ZodSchemas
);
