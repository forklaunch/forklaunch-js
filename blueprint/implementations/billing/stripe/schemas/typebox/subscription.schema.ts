import { LiteralSchema } from '@forklaunch/validator';
import {
  boolean,
  date,
  enum_,
  optional,
  string,
  type
} from '@forklaunch/validator/typebox';
import {
  StripeCreateSubscriptionDto,
  StripeSubscriptionDto,
  StripeUpdateSubscriptionDto
} from '../../types/stripe.types';

export const CreateSubscriptionSchema = <
  T extends Record<string, LiteralSchema>
>(
  PartyEnum: T
) => ({
  id: optional(string),
  partyId: string,
  partyType: enum_(PartyEnum),
  productId: string,
  description: optional(string),
  active: boolean,
  externalId: string,
  startDate: date,
  endDate: date,
  status: string,
  extraFields: optional(type<StripeCreateSubscriptionDto<T>['extraFields']>())
});

export const UpdateSubscriptionSchema = <
  T extends Record<string, LiteralSchema>
>(
  PartyEnum: T
) => ({
  id: string,
  partyId: optional(string),
  partyType: optional(enum_(PartyEnum)),
  productId: optional(string),
  description: optional(string),
  active: optional(boolean),
  externalId: optional(string),
  startDate: optional(date),
  endDate: optional(date),
  status: optional(string),
  extraFields: optional(type<StripeUpdateSubscriptionDto<T>['extraFields']>())
});

export const SubscriptionSchema = <T extends Record<string, LiteralSchema>>(
  PartyEnum: T
) => ({
  id: string,
  partyId: string,
  partyType: enum_(PartyEnum),
  productId: string,
  description: optional(string),
  active: boolean,
  externalId: string,
  startDate: date,
  endDate: date,
  status: string,
  extraFields: optional(type<StripeSubscriptionDto<T>['extraFields']>()),
  createdAt: optional(date),
  updatedAt: optional(date)
});

export const BaseSubscriptionServiceSchemas = {
  CreateSubscriptionSchema,
  UpdateSubscriptionSchema,
  SubscriptionSchema
};
