import { serviceSchemaResolver } from '@forklaunch/internal';
import { StripeSubscriptionServiceSchemas as TypeBoxSchemas } from './typebox/subscription.schema';
import { StripeSubscriptionServiceSchemas as ZodSchemas } from './zod/subscription.schema';

export const StripeSubscriptionServiceSchemas = serviceSchemaResolver(
  () => TypeBoxSchemas,
  () => ZodSchemas
);
