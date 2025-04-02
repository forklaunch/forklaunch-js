import { serviceSchemaResolver } from '@forklaunch/core/dtoMapper';
import {
  CreatePaymentLinkSchema as TypeBoxCreatePaymentLinkSchema,
  PaymentLinkSchema as TypeBoxPaymentLinkSchema,
  UpdatePaymentLinkSchema as TypeBoxUpdatePaymentLinkSchema
} from './typebox/paymentLink.schema';
import {
  CreatePaymentLinkSchema as ZodCreatePaymentLinkSchema,
  PaymentLinkSchema as ZodPaymentLinkSchema,
  UpdatePaymentLinkSchema as ZodUpdatePaymentLinkSchema
} from './zod/paymentLink.schema';

const TypeBoxSchemas = (uuidId: boolean) => ({
  CreatePaymentLinkSchema: TypeBoxCreatePaymentLinkSchema,
  UpdatePaymentLinkSchema: TypeBoxUpdatePaymentLinkSchema(uuidId),
  PaymentLinkSchema: TypeBoxPaymentLinkSchema(uuidId)
});

const ZodSchemas = (uuidId: boolean) => ({
  CreatePaymentLinkSchema: ZodCreatePaymentLinkSchema,
  UpdatePaymentLinkSchema: ZodUpdatePaymentLinkSchema(uuidId),
  PaymentLinkSchema: ZodPaymentLinkSchema(uuidId)
});

export const BasePaymentLinkServiceSchemas = serviceSchemaResolver(
  TypeBoxSchemas,
  ZodSchemas
);
