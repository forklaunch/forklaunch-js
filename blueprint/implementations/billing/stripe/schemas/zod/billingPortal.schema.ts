import { date, optional, string, type } from '@forklaunch/validator/zod';
import {
  StripeBillingPortalDto,
  StripeCreateBillingPortalDto,
  StripeUpdateBillingPortalDto
} from '../../types/stripe.types';

export const CreateBillingPortalSchema = {
  id: optional(string),
  customerId: string,
  uri: optional(string),
  expiresAt: date,
  extraFields: optional(type<StripeCreateBillingPortalDto['extraFields']>())
};

export const UpdateBillingPortalSchema = {
  id: string,
  uri: optional(string),
  expiresAt: optional(date),
  extraFields: optional(type<StripeUpdateBillingPortalDto['extraFields']>())
};

export const BillingPortalSchema = {
  id: string,
  customerId: string,
  uri: optional(string),
  expiresAt: date,
  extraFields: optional(type<StripeBillingPortalDto['extraFields']>()),
  createdAt: optional(date),
  updatedAt: optional(date)
};

export const BaseBillingPortalServiceSchemas = {
  CreateBillingPortalSchema,
  UpdateBillingPortalSchema,
  BillingPortalSchema
};
