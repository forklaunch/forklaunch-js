import { serviceSchemaResolver } from '@forklaunch/core/dtoMapper';
import { BaseSubscriptionServiceSchemas as TypeBoxSchemas } from './typebox/subscription.schema';
import { BaseSubscriptionServiceSchemas as ZodSchemas } from './zod/subscription.schema';

export const BaseSubscriptionServiceSchemas = serviceSchemaResolver(
  TypeBoxSchemas,
  ZodSchemas
);
