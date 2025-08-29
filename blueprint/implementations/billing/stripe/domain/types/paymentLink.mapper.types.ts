import { EntityManager } from '@mikro-orm/core';
import Stripe from 'stripe';
import { StripePaymentLinkDtos } from './stripe.dto.types';
import { StripePaymentLinkEntities } from './stripe.entity.types';

export type StripePaymentLinkMappers<
  StatusEnum,
  Entities extends StripePaymentLinkEntities<StatusEnum>,
  Dto extends StripePaymentLinkDtos<StatusEnum>
> = {
  PaymentLinkMapper: {
    toDomain: (
      entity: Entities['PaymentLinkMapper']
    ) => Promise<Dto['PaymentLinkMapper']>;
  };
  CreatePaymentLinkMapper: {
    toEntity: (
      dto: Dto['CreatePaymentLinkMapper'],
      em: EntityManager,
      stripePaymentLink: Stripe.PaymentLink,
      ...args: unknown[]
    ) => Promise<Entities['CreatePaymentLinkMapper']>;
  };
  UpdatePaymentLinkMapper: {
    toEntity: (
      dto: Dto['UpdatePaymentLinkMapper'],
      em: EntityManager,
      stripePaymentLink: Stripe.PaymentLink,
      ...args: unknown[]
    ) => Promise<Entities['UpdatePaymentLinkMapper']>;
  };
};
