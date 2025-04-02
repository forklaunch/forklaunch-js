import { serviceSchemaResolver } from '@forklaunch/core/dtoMapper';
import {
  BillingPortalSchema as TypeBoxBillingPortalSchema,
  CreateBillingPortalSchema as TypeBoxCreateBillingPortalSchema,
  UpdateBillingPortalSchema as TypeBoxUpdateBillingPortalSchema
} from './typebox/billingPortal.schema';
import {
  BillingPortalSchema as ZodBillingPortalSchema,
  CreateBillingPortalSchema as ZodCreateBillingPortalSchema,
  UpdateBillingPortalSchema as ZodUpdateBillingPortalSchema
} from './zod/billingPortal.schema';

const TypeBoxSchemas = (uuidId: boolean) => ({
  CreateBillingPortalSchema: TypeBoxCreateBillingPortalSchema,
  UpdateBillingPortalSchema: TypeBoxUpdateBillingPortalSchema(uuidId),
  BillingPortalSchema: TypeBoxBillingPortalSchema(uuidId)
});

const ZodSchemas = (uuidId: boolean) => ({
  CreateBillingPortalSchema: ZodCreateBillingPortalSchema,
  UpdateBillingPortalSchema: ZodUpdateBillingPortalSchema(uuidId),
  BillingPortalSchema: ZodBillingPortalSchema(uuidId)
});

export const BaseBillingPortalServiceSchemas = serviceSchemaResolver(
  TypeBoxSchemas,
  ZodSchemas
);
