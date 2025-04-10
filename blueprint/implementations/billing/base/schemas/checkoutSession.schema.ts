import { serviceSchemaResolver } from '@forklaunch/core/dtoMapper';
import { BaseCheckoutSessionServiceSchemas as TypeBoxSchemas } from './typebox/checkoutSession.schema';
import { BaseCheckoutSessionServiceSchemas as ZodSchemas } from './zod/checkoutSession.schema';

export const BaseCheckoutSessionServiceSchemas = serviceSchemaResolver(
  TypeBoxSchemas,
  ZodSchemas
);
