import { LiteralSchema } from '@forklaunch/validator';
import {
  array,
  date,
  enum_,
  optional,
  string,
  type,
  unknown
} from '@forklaunch/validator/zod';
import Stripe from 'stripe';
import { CurrencyEnum } from '../../domain/enums/currency.enum';
import { PaymentMethodEnum } from '../../domain/enums/paymentMethod.enum';
import {
  StripeCheckoutSessionDto,
  StripeCreateCheckoutSessionDto,
  StripeUpdateCheckoutSessionDto
} from '../../types/stripe.types';

export const CreateCheckoutSessionSchema = <
  T extends Record<string, LiteralSchema>
>(
  StatusEnum: T
) => ({
  id: optional(string),
  customerId: string,
  currency: enum_(CurrencyEnum),
  paymentMethods: array(enum_(PaymentMethodEnum)),
  successRedirectUri: optional(string),
  cancelRedirectUri: optional(string),
  expiresAt: date,
  status: enum_(StatusEnum),
  lineItems: array(type<Stripe.Checkout.SessionCreateParams.LineItem>()),
  mode: type<Stripe.Checkout.SessionCreateParams.Mode>(),
  extraFields: optional(
    type<StripeCreateCheckoutSessionDto<T>['extraFields']>()
  )
});

export const UpdateCheckoutSessionSchema = <
  T extends Record<string, LiteralSchema>
>(
  StatusEnum: T
) => ({
  id: string,
  customerId: optional(string),
  currency: optional(enum_(CurrencyEnum)),
  paymentMethods: optional(array(enum_(PaymentMethodEnum))),
  successRedirectUri: optional(string),
  cancelRedirectUri: optional(string),
  expiresAt: optional(date),
  status: optional(enum_(StatusEnum)),
  extraFields: optional(
    type<StripeUpdateCheckoutSessionDto<T>['extraFields']>()
  )
});

export const CheckoutSessionSchema = <T extends Record<string, LiteralSchema>>(
  StatusEnum: T
) => ({
  id: string,
  customerId: string,
  currency: enum_(CurrencyEnum),
  metadata: optional(unknown),
  paymentMethods: array(enum_(PaymentMethodEnum)),
  successRedirectUri: optional(string),
  cancelRedirectUri: optional(string),
  expiresAt: date,
  status: enum_(StatusEnum),
  lineItems: array(type<Stripe.LineItem>()),
  mode: type<Stripe.Checkout.Session.Mode>(),
  extraFields: optional(type<StripeCheckoutSessionDto<T>['extraFields']>()),
  createdAt: optional(date),
  updatedAt: optional(date)
});

export const BaseCheckoutSessionServiceSchemas = {
  CreateCheckoutSessionSchema,
  UpdateCheckoutSessionSchema,
  CheckoutSessionSchema
};
