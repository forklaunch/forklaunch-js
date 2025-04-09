import { serviceSchemaResolver } from '@forklaunch/core/dtoMapper';
import { BasePaymentLinkSchemas as TypeBoxSchemas } from './typebox/paymentLink.schema';
import { BasePaymentLinkSchemas as ZodSchemas } from './zod/paymentLink.schema';

export const BasePaymentLinkServiceSchemas = serviceSchemaResolver(
  TypeBoxSchemas,
  ZodSchemas
);
