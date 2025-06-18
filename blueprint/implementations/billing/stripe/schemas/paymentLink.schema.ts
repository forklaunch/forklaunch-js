import { serviceSchemaResolver } from '@forklaunch/core/mappers';
import { StripePaymentLinkServiceSchemas as TypeBoxSchemas } from './typebox/paymentLink.schema';
import { StripePaymentLinkServiceSchemas as ZodSchemas } from './zod/paymentLink.schema';

export const StripePaymentLinkServiceSchemas = serviceSchemaResolver(
  () => TypeBoxSchemas,
  () => ZodSchemas
);
