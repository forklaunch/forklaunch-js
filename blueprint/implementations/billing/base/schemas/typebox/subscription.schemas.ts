import { LiteralSchema } from '@forklaunch/validator';
import {
  boolean,
  date,
  enum_,
  optional,
  string,
  unknown,
  uuid
} from '@forklaunch/validator/typebox';

export const CreateSubscriptionSchema = <
  T extends Record<string, LiteralSchema>,
  U extends Record<string, LiteralSchema>
>(
  PartyEnum: T,
  BillingProviderEnum: U
) => ({
  partyId: string,
  partyType: enum_(PartyEnum),
  productId: string,
  description: optional(string),
  active: boolean,
  externalId: string,
  startDate: date,
  endDate: date,
  status: string,
  billingProvider: optional(enum_(BillingProviderEnum)),
  extraFields: optional(unknown)
});

export const UpdateSubscriptionSchema =
  (uuidId: boolean) =>
  <
    T extends Record<string, LiteralSchema>,
    U extends Record<string, LiteralSchema>
  >(
    PartyEnum: T,
    BillingProviderEnum: U
  ) => ({
    id: uuidId ? uuid : string,
    partyId: optional(string),
    partyType: optional(enum_(PartyEnum)),
    productId: optional(string),
    description: optional(string),
    active: optional(boolean),
    externalId: optional(string),
    startDate: optional(date),
    endDate: optional(date),
    status: optional(string),
    billingProvider: optional(enum_(BillingProviderEnum)),
    extraFields: optional(unknown)
  });

export const SubscriptionSchema =
  (uuidId: boolean) =>
  <
    T extends Record<string, LiteralSchema>,
    U extends Record<string, LiteralSchema>
  >(
    PartyEnum: T,
    BillingProviderEnum: U
  ) => ({
    id: uuidId ? uuid : string,
    partyId: string,
    partyType: enum_(PartyEnum),
    productId: string,
    description: optional(string),
    active: boolean,
    externalId: string,
    startDate: date,
    endDate: date,
    status: string,
    billingProvider: optional(enum_(BillingProviderEnum)),
    extraFields: optional(unknown),
    createdAt: optional(date),
    updatedAt: optional(date)
  });
