import {
  array,
  boolean,
  date,
  enum_,
  literal,
  number,
  optional,
  string,
  type
} from '@forklaunch/validator/zod';
import { CurrencyEnum } from '../../domain/enums/currency.enum';
import { PlanCadenceEnum } from '../../domain/enums/planCadence.enum';
import {
  StripeCreatePlanDto,
  StripePlanDto,
  StripeUpdatePlanDto
} from '../../types/stripe.types';

export const CreatePlanSchema = {
  id: optional(string),
  name: string,
  description: optional(string),
  price: number,
  cadence: enum_(PlanCadenceEnum),
  currency: enum_(CurrencyEnum),
  features: optional(array(string)),
  extraFields: optional(type<StripeCreatePlanDto['extraFields']>()),
  externalId: string,
  billingProvider: optional(literal('stripe')),
  active: boolean
};

export const UpdatePlanSchema = {
  id: string,
  name: optional(string),
  description: optional(string),
  price: optional(number),
  cadence: optional(enum_(PlanCadenceEnum)),
  currency: optional(enum_(CurrencyEnum)),
  features: optional(array(string)),
  extraFields: optional(type<StripeUpdatePlanDto['extraFields']>()),
  externalId: optional(string),
  billingProvider: optional(literal('stripe')),
  active: optional(boolean)
};

export const PlanSchema = {
  id: string,
  name: string,
  description: optional(string),
  price: number,
  cadence: enum_(PlanCadenceEnum),
  currency: enum_(CurrencyEnum),
  features: optional(array(string)),
  extraFields: optional(type<StripePlanDto['extraFields']>()),
  externalId: string,
  billingProvider: optional(literal('stripe')),
  active: boolean,
  createdAt: optional(date),
  updatedAt: optional(date)
};

export const BasePlanServiceSchemas = {
  CreatePlanSchema,
  UpdatePlanSchema,
  PlanSchema
};
