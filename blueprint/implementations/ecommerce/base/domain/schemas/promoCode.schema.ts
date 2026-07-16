import { serviceSchemaResolver } from '@forklaunch/internal';
import { BasePromoCodeServiceSchemas as TypeBoxSchemas } from './typebox/promoCode.schema';
import { BasePromoCodeServiceSchemas as ZodSchemas } from './zod/promoCode.schema';

export const BasePromoCodeServiceSchemas = serviceSchemaResolver(
  TypeBoxSchemas,
  ZodSchemas
);
