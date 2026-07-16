import { serviceSchemaResolver } from '@forklaunch/internal';
import { BaseGiftCardServiceSchemas as TypeBoxSchemas } from './typebox/giftCard.schema';
import { BaseGiftCardServiceSchemas as ZodSchemas } from './zod/giftCard.schema';

export const BaseGiftCardServiceSchemas = serviceSchemaResolver(
  TypeBoxSchemas,
  ZodSchemas
);
