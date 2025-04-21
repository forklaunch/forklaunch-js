import { LiteralSchema } from '@forklaunch/validator';
import {
  array,
  date,
  enum_,
  optional,
  string,
  unknown,
  uuid
} from '@forklaunch/validator/zod';

export const CreateCheckoutSessionSchema = <
  T extends Record<string, LiteralSchema>
>(
  PaymentMethodEnum: T
) => ({
  customerId: string,
  paymentMethods: array(enum_(PaymentMethodEnum)),
  successRedirectUri: string,
  cancelRedirectUri: string,
  extraFields: optional(unknown)
});

export const UpdateCheckoutSessionSchema =
  ({ uuidId }: { uuidId: boolean }) =>
  <T extends Record<string, LiteralSchema>>(PaymentMethodEnum: T) => ({
    id: uuidId ? uuid : string,
    customerId: optional(string),
    paymentMethods: optional(array(enum_(PaymentMethodEnum))),
    successRedirectUri: optional(string),
    cancelRedirectUri: optional(string),
    extraFields: optional(unknown)
  });

export const CheckoutSessionSchema =
  ({ uuidId }: { uuidId: boolean }) =>
  <T extends Record<string, LiteralSchema>>(PaymentMethodEnum: T) => ({
    id: uuidId ? uuid : string,
    customerId: string,
    metadata: optional(unknown),
    paymentMethods: array(enum_(PaymentMethodEnum)),
    successRedirectUri: string,
    cancelRedirectUri: string,
    extraFields: optional(unknown),
    createdAt: optional(date),
    updatedAt: optional(date)
  });

export const BaseCheckoutSessionServiceSchemas = (options: {
  uuidId: boolean;
}) => ({
  CreateCheckoutSessionSchema,
  UpdateCheckoutSessionSchema: UpdateCheckoutSessionSchema(options),
  CheckoutSessionSchema: CheckoutSessionSchema(options)
});
