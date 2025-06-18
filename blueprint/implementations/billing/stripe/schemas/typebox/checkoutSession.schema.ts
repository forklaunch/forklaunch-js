import { LiteralSchema } from '@forklaunch/validator';
import {
  array,
  date,
  enum_,
  optional,
  string,
  type,
  unknown
} from '@forklaunch/validator/typebox';
import { CurrencyEnum } from '../../domain/enums/currency.enum';
import { PaymentMethodEnum } from '../../domain/enums/paymentMethod.enum';
import {
  StripeCheckoutSessionDto,
  StripeCreateCheckoutSessionDto,
  StripeUpdateCheckoutSessionDto
} from '../../types/stripe.dto.types';

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
  stripeFields: type<StripeCreateCheckoutSessionDto<T>['stripeFields']>()
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
  stripeFields: optional(
    type<StripeUpdateCheckoutSessionDto<T>['stripeFields']>()
  )
});

export const CheckoutSessionSchema = <T extends Record<string, LiteralSchema>>(
  StatusEnum: T
) => ({
  id: string,
  customerId: string,
  metadata: optional(unknown),
  currency: enum_(CurrencyEnum),
  paymentMethods: array(enum_(PaymentMethodEnum)),
  successRedirectUri: optional(string),
  cancelRedirectUri: optional(string),
  expiresAt: date,
  status: enum_(StatusEnum),
  stripeFields: type<StripeCheckoutSessionDto<T>['stripeFields']>(),
  createdAt: optional(date),
  updatedAt: optional(date)
});

export const StripeCheckoutSessionServiceSchemas = {
  CreateCheckoutSessionSchema,
  UpdateCheckoutSessionSchema,
  CheckoutSessionSchema
};
