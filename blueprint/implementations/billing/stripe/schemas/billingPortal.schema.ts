import { serviceSchemaResolver } from '@forklaunch/internal';
import { StripeBillingPortalServiceSchemas as TypeBoxSchemas } from './typebox/billingPortal.schema';
import { StripeBillingPortalServiceSchemas as ZodSchemas } from './zod/billingPortal.schema';

export const StripeBillingPortalServiceSchemas = serviceSchemaResolver(
  () => TypeBoxSchemas,
  () => ZodSchemas
);
