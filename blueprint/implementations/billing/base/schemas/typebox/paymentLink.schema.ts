import { LiteralSchema } from '@forklaunch/validator';
import {
  array,
  date,
  enum_,
  number,
  optional,
  string,
  unknown,
  uuid
} from '@forklaunch/validator/typebox';

export const CreatePaymentLinkSchema = <
  T extends Record<string, LiteralSchema>,
  U extends Record<string, LiteralSchema>,
  V extends Record<string, LiteralSchema>
>(
  PaymentMethodEnum: T,
  CurrencyEnum: U,
  StatusEnum: V
) => ({
  amount: number,
  paymentMethods: array(enum_(PaymentMethodEnum)),
  currency: enum_(CurrencyEnum),
  status: enum_(StatusEnum),
  extraFields: optional(unknown)
});

export const UpdatePaymentLinkSchema =
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
    amount: optional(number),
    paymentMethods: optional(array(enum_(PaymentMethodEnum))),
    currency: optional(enum_(CurrencyEnum)),
    status: optional(enum_(StatusEnum)),
    extraFields: optional(unknown)
  });

export const PaymentLinkSchema =
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
    amount: number,
    currency: enum_(CurrencyEnum),
    paymentMethods: array(enum_(PaymentMethodEnum)),
    status: enum_(StatusEnum),
    extraFields: optional(unknown),
    createdAt: optional(date),
    updatedAt: optional(date)
  });

export const BasePaymentLinkServiceSchemas = (options: {
  uuidId: boolean;
}) => ({
  CreatePaymentLinkSchema,
  UpdatePaymentLinkSchema: UpdatePaymentLinkSchema(options),
  PaymentLinkSchema: PaymentLinkSchema(options)
});
