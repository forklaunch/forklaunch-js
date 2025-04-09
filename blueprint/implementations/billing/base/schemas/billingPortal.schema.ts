import { serviceSchemaResolver } from '@forklaunch/core/dtoMapper';
import { BaseBillingPortalServiceSchemas as TypeBoxSchemas } from './typebox/billingPortal.schema';
import { BaseBillingPortalServiceSchemas as ZodSchemas } from './zod/billingPortal.schema';

export const BaseBillingPortalServiceSchemas = serviceSchemaResolver(
  TypeBoxSchemas,
  ZodSchemas
);
