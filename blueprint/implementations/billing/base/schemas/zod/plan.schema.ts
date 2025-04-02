import { LiteralSchema } from '@forklaunch/validator';
import {
  array,
  boolean,
  date,
  enum_,
  number,
  optional,
  string,
  unknown,
  uuid
} from '@forklaunch/validator/zod';

export const CreatePlanSchema = <
  T extends Record<string, LiteralSchema>,
  U extends Record<string, LiteralSchema>
>(
  PlanCadenceEnum: T,
  BillingProviderEnum: U
) => ({
  name: string,
  description: optional(string),
  price: number,
  cadence: enum_(PlanCadenceEnum),
  features: array(string),
  extraFields: optional(unknown),
  externalId: string,
  billingProvider: optional(enum_(BillingProviderEnum)),
  active: boolean
});

export const UpdatePlanSchema =
  (uuidId: boolean) =>
  <
    T extends Record<string, LiteralSchema>,
    U extends Record<string, LiteralSchema>
  >(
    PlanCadenceEnum: T,
    BillingProviderEnum: U
  ) => ({
    id: uuidId ? uuid : string,
    name: optional(string),
    description: optional(string),
    price: optional(number),
    cadence: optional(enum_(PlanCadenceEnum)),
    features: optional(array(string)),
    extraFields: optional(unknown),
    externalId: optional(string),
    billingProvider: optional(enum_(BillingProviderEnum)),
    active: optional(boolean)
  });

export const PlanSchema =
  (uuidId: boolean) =>
  <
    T extends Record<string, LiteralSchema>,
    U extends Record<string, LiteralSchema>
  >(
    PlanCadenceEnum: T,
    BillingProviderEnum: U
  ) => ({
    id: uuidId ? uuid : string,
    name: string,
    description: optional(string),
    price: number,
    cadence: enum_(PlanCadenceEnum),
    features: optional(array(string)),
    extraFields: optional(unknown),
    externalId: string,
    billingProvider: optional(enum_(BillingProviderEnum)),
    active: boolean,
    createdAt: optional(date),
    updatedAt: optional(date)
  });
