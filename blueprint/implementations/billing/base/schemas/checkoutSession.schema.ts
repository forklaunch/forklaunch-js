import { serviceSchemaResolver } from '@forklaunch/core/dtoMapper';
import { BaseCheckoutSessionSchemas as TypeBoxSchemas } from './typebox/checkoutSession.schema';
import { BaseCheckoutSessionSchemas as ZodSchemas } from './zod/checkoutSession.schema';

export const BaseCheckoutSessionServiceSchemas = serviceSchemaResolver(
  TypeBoxSchemas,
  ZodSchemas
);
