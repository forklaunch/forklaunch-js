import { serviceSchemaResolver } from '@forklaunch/core/dtoMapper';
import { BaseSubscriptionSchemas as TypeBoxSchemas } from './typebox/subscription.schema';
import { BaseSubscriptionSchemas as ZodSchemas } from './zod/subscription.schema';

export const BaseSubscriptionServiceSchemas = serviceSchemaResolver(
  TypeBoxSchemas,
  ZodSchemas
);
