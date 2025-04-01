import { LiteralSchema } from '@forklaunch/validator';
import {
  date,
  enum_,
  number,
  optional,
  string,
  unknown,
  uuid
} from '@forklaunch/validator/typebox';

export const CreatePaymentLinkSchema = <
  T extends Record<string, LiteralSchema>
>(
  CurrencyEnum: T
) => ({
  amount: number,
  currency: enum_(CurrencyEnum),
  description: optional(string),
  metadata: optional(unknown),
  successRedirectUri: string,
  cancelRedirectUri: string,
  extraFields: optional(unknown)
});

export const UpdatePaymentLinkSchema =
  (uuidId: boolean) =>
  <T extends Record<string, LiteralSchema>>(CurrencyEnum: T) => ({
    id: uuidId ? uuid : string,
    amount: optional(number),
    currency: optional(enum_(CurrencyEnum)),
    description: optional(string),
    metadata: optional(unknown),
    successRedirectUri: optional(string),
    cancelRedirectUri: optional(string),
    extraFields: optional(unknown)
  });

export const PaymentLinkSchema =
  (uuidId: boolean) =>
  <T extends Record<string, LiteralSchema>>(CurrencyEnum: T) => ({
    id: uuidId ? uuid : string,
    amount: number,
    currency: enum_(CurrencyEnum),
    description: optional(string),
    metadata: optional(unknown),
    successRedirectUri: string,
    cancelRedirectUri: string,
    extraFields: optional(unknown),
    createdAt: optional(date),
    updatedAt: optional(date)
  });
