import { serviceSchemaResolver } from '@forklaunch/internal';
import { KafkaWorkerOptionsSchema as TypeBoxSchemas } from './typebox/kafkaWorker.schema';
import { KafkaWorkerOptionsSchema as ZodSchemas } from './zod/kafkaWorker.schema';

export const KafkaWorkerSchemas = serviceSchemaResolver(
  () => TypeBoxSchemas,
  () => ZodSchemas
);
