import { serviceSchemaResolver } from '@forklaunch/internal';
import { StripeCheckoutSessionServiceSchemas as TypeBoxSchemas } from './typebox/checkoutSession.schema';
import { StripeCheckoutSessionServiceSchemas as ZodSchemas } from './zod/checkoutSession.schema';

export const StripeCheckoutSessionServiceSchemas = serviceSchemaResolver(
  () => TypeBoxSchemas,
  () => ZodSchemas
);
