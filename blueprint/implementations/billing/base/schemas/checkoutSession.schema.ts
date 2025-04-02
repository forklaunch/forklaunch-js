import { serviceSchemaResolver } from '@forklaunch/core/dtoMapper';
import {
  CheckoutSessionSchema as TypeBoxCheckoutSessionSchema,
  CreateCheckoutSessionSchema as TypeBoxCreateCheckoutSessionSchema,
  UpdateCheckoutSessionSchema as TypeBoxUpdateCheckoutSessionSchema
} from './typebox/checkoutSession.schema';
import {
  CheckoutSessionSchema as ZodCheckoutSessionSchema,
  CreateCheckoutSessionSchema as ZodCreateCheckoutSessionSchema,
  UpdateCheckoutSessionSchema as ZodUpdateCheckoutSessionSchema
} from './zod/checkoutSession.schema';

const TypeBoxSchemas = (uuidId: boolean) => ({
  CreateCheckoutSessionSchema: TypeBoxCreateCheckoutSessionSchema,
  UpdateCheckoutSessionSchema: TypeBoxUpdateCheckoutSessionSchema(uuidId),
  CheckoutSessionSchema: TypeBoxCheckoutSessionSchema(uuidId)
});

const ZodSchemas = (uuidId: boolean) => ({
  CreateCheckoutSessionSchema: ZodCreateCheckoutSessionSchema,
  UpdateCheckoutSessionSchema: ZodUpdateCheckoutSessionSchema(uuidId),
  CheckoutSessionSchema: ZodCheckoutSessionSchema(uuidId)
});

export const BaseCheckoutSessionServiceSchemas = serviceSchemaResolver(
  TypeBoxSchemas,
  ZodSchemas
);
