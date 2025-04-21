import { serviceSchemaResolver } from '@forklaunch/core/mappers';
import { RedisWorkerOptionsSchema as TypeBoxSchemas } from './typebox/redisWorker.schema';
import { RedisWorkerOptionsSchema as ZodSchemas } from './zod/redisWorker.schema';

export const RedisWorkerSchemas = serviceSchemaResolver(
  () => TypeBoxSchemas,
  () => ZodSchemas
);
