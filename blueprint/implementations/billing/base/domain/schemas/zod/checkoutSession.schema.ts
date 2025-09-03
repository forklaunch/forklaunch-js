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
  T extends Record<string, LiteralSchema>,
  U extends Record<string, LiteralSchema>,
  V extends Record<string, LiteralSchema>
>(
  PaymentMethodEnum: T,
  CurrencyEnum: V,
  StatusEnum: U
) => ({
  customerId: string,
  paymentMethods: array(enum_(PaymentMethodEnum)),
  currency: enum_(CurrencyEnum),
  uri: optional(string),
  successRedirectUri: optional(string),
  cancelRedirectUri: optional(string),
  expiresAt: date,
  status: enum_(StatusEnum),
  providerFields: optional(unknown)
});

export const UpdateCheckoutSessionSchema =
  ({ uuidId }: { uuidId: boolean }) =>
  <
    T extends Record<string, LiteralSchema>,
    U extends Record<string, LiteralSchema>,
    V extends Record<string, LiteralSchema>
  >(
    PaymentMethodEnum: T,
    CurrencyEnum: U,
    StatusEnum: V
  ) => ({
    id: uuidId ? uuid : string,
    customerId: optional(string),
    paymentMethods: optional(array(enum_(PaymentMethodEnum))),
    currency: optional(enum_(CurrencyEnum)),
    uri: optional(string),
    successRedirectUri: optional(string),
    cancelRedirectUri: optional(string),
    expiresAt: optional(date),
    status: optional(enum_(StatusEnum)),
    providerFields: optional(unknown)
  });

export const CheckoutSessionSchema =
  ({ uuidId }: { uuidId: boolean }) =>
  <
    T extends Record<string, LiteralSchema>,
    U extends Record<string, LiteralSchema>,
    V extends Record<string, LiteralSchema>
  >(
    PaymentMethodEnum: T,
    CurrencyEnum: U,
    StatusEnum: V
  ) => ({
    id: uuidId ? uuid : string,
    customerId: string,
    paymentMethods: array(enum_(PaymentMethodEnum)),
    currency: enum_(CurrencyEnum),
    uri: optional(string),
    successRedirectUri: optional(string),
    cancelRedirectUri: optional(string),
    expiresAt: date,
    status: enum_(StatusEnum),
    providerFields: optional(unknown),
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
