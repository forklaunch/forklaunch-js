import { serviceSchemaResolver } from '@forklaunch/core/mappers';
import { StripeSubscriptionServiceSchemas as TypeBoxSchemas } from './typebox/subscription.schema';
import { StripeSubscriptionServiceSchemas as ZodSchemas } from './zod/subscription.schema';

export const StripeSubscriptionServiceSchemas = serviceSchemaResolver(
  () => TypeBoxSchemas,
  () => ZodSchemas
);
