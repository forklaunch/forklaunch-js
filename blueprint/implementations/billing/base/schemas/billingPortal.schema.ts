import { serviceSchemaResolver } from '@forklaunch/core/dtoMapper';
import { BaseBillingPortalSchemas as TypeBoxSchemas } from './typebox/billingPortal.schema';
import { BaseBillingPortalSchemas as ZodSchemas } from './zod/billingPortal.schema';

export const BaseBillingPortalServiceSchemas = serviceSchemaResolver(
  TypeBoxSchemas,
  ZodSchemas
);
