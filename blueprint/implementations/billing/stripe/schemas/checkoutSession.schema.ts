import { serviceSchemaResolver } from '@forklaunch/core/mappers';
import { StripeCheckoutSessionServiceSchemas as TypeBoxSchemas } from './typebox/checkoutSession.schema';
import { StripeCheckoutSessionServiceSchemas as ZodSchemas } from './zod/checkoutSession.schema';

export const StripeCheckoutSessionServiceSchemas = serviceSchemaResolver(
  () => TypeBoxSchemas,
  () => ZodSchemas
);
