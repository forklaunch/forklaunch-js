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
  (uuidId: boolean) =>
  <T extends Record<string, LiteralSchema>>(PaymentMethodEnum: T) => ({
    id: uuidId ? uuid : string,
    customerId: optional(string),
    paymentMethods: optional(array(enum_(PaymentMethodEnum))),
    successRedirectUri: optional(string),
    cancelRedirectUri: optional(string),
    extraFields: optional(unknown)
  });

export const CheckoutSessionSchema =
  (uuidId: boolean) =>
  <T extends Record<string, LiteralSchema>>(PaymentMethodEnum: T) => ({
    id: uuidId ? uuid : string,
    customerId: string,
    paymentMethods: array(enum_(PaymentMethodEnum)),
    successRedirectUri: string,
    cancelRedirectUri: string,
    extraFields: optional(unknown),
    createdAt: optional(date),
    updatedAt: optional(date)
  });
