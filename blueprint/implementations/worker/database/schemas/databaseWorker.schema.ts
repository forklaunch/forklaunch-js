import { serviceSchemaResolver } from '@forklaunch/internal';
import { DatabaseWorkerOptionsSchema as TypeBoxSchemas } from './typebox/databaseWorker.schema';
import { DatabaseWorkerOptionsSchema as ZodSchemas } from './zod/databaseWorker.schema';

export const DatabaseWorkerSchemas = serviceSchemaResolver(
  () => TypeBoxSchemas,
  () => ZodSchemas
);
