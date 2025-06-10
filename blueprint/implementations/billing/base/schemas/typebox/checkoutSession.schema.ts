import { LiteralSchema } from '@forklaunch/validator';
import {
  array,
  date,
  enum_,
  optional,
  string,
  unknown,
  uuid
} from '@forklaunch/validator/typebox';

export const CreateCheckoutSessionSchema = <
  T extends Record<string, LiteralSchema>
>(
  PaymentMethodEnum: T,
  StatusEnum: T
) => ({
  customerId: string,
  paymentMethods: array(enum_(PaymentMethodEnum)),
  successRedirectUri: string,
  cancelRedirectUri: string,
  expiresAt: date,
  status: enum_(StatusEnum),
  extraFields: optional(unknown)
});

export const UpdateCheckoutSessionSchema =
  ({ uuidId }: { uuidId: boolean }) =>
  <
    T extends Record<string, LiteralSchema>,
    U extends Record<string, LiteralSchema>
  >(
    PaymentMethodEnum: T,
    StatusEnum: U
  ) => ({
    id: uuidId ? uuid : string,
    customerId: optional(string),
    paymentMethods: optional(array(enum_(PaymentMethodEnum))),
    successRedirectUri: optional(string),
    cancelRedirectUri: optional(string),
    expiresAt: optional(date),
    status: optional(enum_(StatusEnum)),
    extraFields: optional(unknown)
  });

export const CheckoutSessionSchema =
  ({ uuidId }: { uuidId: boolean }) =>
  <
    T extends Record<string, LiteralSchema>,
    U extends Record<string, LiteralSchema>
  >(
    PaymentMethodEnum: T,
    StatusEnum: U
  ) => ({
    id: uuidId ? uuid : string,
    customerId: string,
    metadata: optional(unknown),
    paymentMethods: array(enum_(PaymentMethodEnum)),
    successRedirectUri: string,
    cancelRedirectUri: string,
    expiresAt: date,
    status: enum_(StatusEnum),
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
