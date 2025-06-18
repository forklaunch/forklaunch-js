import { serviceSchemaResolver } from '@forklaunch/core/mappers';
import { BasePaymentLinkServiceSchemas as TypeBoxSchemas } from './typebox/paymentLink.schema';
import { BasePaymentLinkServiceSchemas as ZodSchemas } from './zod/paymentLink.schema';

export const BasePaymentLinkServiceSchemas = serviceSchemaResolver(
  () => TypeBoxSchemas,
  () => ZodSchemas
);
