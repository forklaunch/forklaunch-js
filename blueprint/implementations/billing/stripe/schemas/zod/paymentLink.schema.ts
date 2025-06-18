import { LiteralSchema } from '@forklaunch/validator';
import {
  array,
  date,
  enum_,
  number,
  optional,
  string,
  type
} from '@forklaunch/validator/zod';
import Stripe from 'stripe';
import { CurrencyEnum } from '../../domain/enums/currency.enum';
import { PaymentMethodEnum } from '../../domain/enums/paymentMethod.enum';
import {
  StripeCreatePaymentLinkDto,
  StripePaymentLinkDto,
  StripeUpdatePaymentLinkDto
} from '../../types/stripe.types';

export const CreatePaymentLinkSchema = <
  T extends Record<string, LiteralSchema>
>(
  StatusEnum: T
) => ({
  id: optional(string),
  amount: number,
  currency: enum_(CurrencyEnum),
  paymentMethods: array(enum_(PaymentMethodEnum)),
  lineItems: array(type<Stripe.PaymentLinkCreateParams.LineItem>()),
  status: enum_(StatusEnum),
  extraFields: optional(type<StripeCreatePaymentLinkDto<T>['extraFields']>())
});

export const UpdatePaymentLinkSchema = <
  T extends Record<string, LiteralSchema>
>(
  StatusEnum: T
) => ({
  id: string,
  amount: optional(number),
  currency: optional(enum_(CurrencyEnum)),
  paymentMethods: optional(array(enum_(PaymentMethodEnum))),
  lineItems: optional(array(type<Stripe.PaymentLinkUpdateParams.LineItem>())),
  status: optional(enum_(StatusEnum)),
  extraFields: optional(type<StripeUpdatePaymentLinkDto<T>['extraFields']>())
});

export const PaymentLinkSchema = <T extends Record<string, LiteralSchema>>(
  StatusEnum: T
) => ({
  id: string,
  amount: number,
  currency: enum_(CurrencyEnum),
  paymentMethods: array(enum_(PaymentMethodEnum)),
  lineItems: array(type<Stripe.LineItem>()),
  status: enum_(StatusEnum),
  extraFields: optional(type<StripePaymentLinkDto<T>['extraFields']>()),
  createdAt: optional(date),
  updatedAt: optional(date)
});

export const BasePaymentLinkServiceSchemas = {
  CreatePaymentLinkSchema,
  UpdatePaymentLinkSchema,
  PaymentLinkSchema
};
