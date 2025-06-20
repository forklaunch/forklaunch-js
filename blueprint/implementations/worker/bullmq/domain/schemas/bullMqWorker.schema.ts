import { serviceSchemaResolver } from '@forklaunch/internal';
import { BullMqWorkerOptionsSchema as TypeBoxSchemas } from './typebox/bullMqWorker.schema';
import { BullMqWorkerOptionsSchema as ZodSchemas } from './zod/bullMqWorker.schema';

export const BullMqWorkerSchemas = serviceSchemaResolver(
  () => TypeBoxSchemas,
  () => ZodSchemas
);
