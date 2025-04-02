import { serviceSchemaResolver } from '@forklaunch/core/dtoMapper';
import {
  CreateSubscriptionSchema as TypeBoxCreateSubscriptionSchema,
  SubscriptionSchema as TypeBoxSubscriptionSchema,
  UpdateSubscriptionSchema as TypeBoxUpdateSubscriptionSchema
} from './typebox/subscription.schema';
import {
  CreateSubscriptionSchema as ZodCreateSubscriptionSchema,
  SubscriptionSchema as ZodSubscriptionSchema,
  UpdateSubscriptionSchema as ZodUpdateSubscriptionSchema
} from './zod/subscription.schema';

const TypeBoxSchemas = (uuidId: boolean) => ({
  CreateSubscriptionSchema: TypeBoxCreateSubscriptionSchema,
  UpdateSubscriptionSchema: TypeBoxUpdateSubscriptionSchema(uuidId),
  SubscriptionSchema: TypeBoxSubscriptionSchema
});

const ZodSchemas = (uuidId: boolean) => ({
  CreateSubscriptionSchema: ZodCreateSubscriptionSchema,
  UpdateSubscriptionSchema: ZodUpdateSubscriptionSchema(uuidId),
  SubscriptionSchema: ZodSubscriptionSchema(uuidId)
});

export const BaseSubscriptionServiceSchemas = serviceSchemaResolver(
  TypeBoxSchemas,
  ZodSchemas
);
