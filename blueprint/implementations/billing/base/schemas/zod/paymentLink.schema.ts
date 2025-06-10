import { LiteralSchema } from '@forklaunch/validator';
import {
  date,
  enum_,
  number,
  optional,
  string,
  unknown,
  uuid
} from '@forklaunch/validator/zod';

export const CreatePaymentLinkSchema = <
  T extends Record<string, LiteralSchema>,
  U extends Record<string, LiteralSchema>
>(
  CurrencyEnum: T,
  StatusEnum: U
) => ({
  amount: number,
  currency: enum_(CurrencyEnum),
  description: optional(string),
  metadata: optional(unknown),
  successRedirectUri: string,
  cancelRedirectUri: string,
  expiresAt: date,
  status: enum_(StatusEnum),
  extraFields: optional(unknown)
});

export const UpdatePaymentLinkSchema =
  ({ uuidId }: { uuidId: boolean }) =>
  <
    T extends Record<string, LiteralSchema>,
    U extends Record<string, LiteralSchema>
  >(
    CurrencyEnum: T,
    StatusEnum: U
  ) => ({
    id: uuidId ? uuid : string,
    amount: optional(number),
    currency: optional(enum_(CurrencyEnum)),
    description: optional(string),
    metadata: optional(unknown),
    successRedirectUri: optional(string),
    cancelRedirectUri: optional(string),
    expiresAt: optional(date),
    status: optional(enum_(StatusEnum)),
    extraFields: optional(unknown)
  });

export const PaymentLinkSchema =
  ({ uuidId }: { uuidId: boolean }) =>
  <
    T extends Record<string, LiteralSchema>,
    U extends Record<string, LiteralSchema>
  >(
    CurrencyEnum: T,
    StatusEnum: U
  ) => ({
    id: uuidId ? uuid : string,
    amount: number,
    currency: enum_(CurrencyEnum),
    description: optional(string),
    metadata: optional(unknown),
    successRedirectUri: string,
    cancelRedirectUri: string,
    expiresAt: date,
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
