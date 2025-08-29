import { schemaValidator } from '@forklaunch/blueprint-core';
import { requestMapper, responseMapper } from '@forklaunch/core/mappers';
import { EntityManager } from '@mikro-orm/core';
import Stripe from 'stripe';
import { PaymentLink } from '../../persistence/entities/paymentLink.entity';
import { PaymentLinkSchemas } from '../../registrations';
import { StatusEnum } from '../enum/status.enum';

export const CreatePaymentLinkMapper = requestMapper(
  schemaValidator,
  PaymentLinkSchemas.CreatePaymentLinkSchema(StatusEnum),
  PaymentLink,
  {
    toEntity: async (
      dto,
      em: EntityManager,
      providerFields: Stripe.PaymentLink
    ) => {
      return PaymentLink.create(
        {
          ...dto,
          createdAt: new Date(),
          updatedAt: new Date(),
          providerFields
        },
        em
      );
    }
  }
);

export const UpdatePaymentLinkMapper = requestMapper(
  schemaValidator,
  PaymentLinkSchemas.UpdatePaymentLinkSchema(StatusEnum),
  PaymentLink,
  {
    toEntity: async (
      dto,
      em: EntityManager,
      providerFields: Stripe.PaymentLink
    ) => {
      return PaymentLink.update(
        {
          ...dto,
          providerFields
        },
        em
      );
    }
  }
);

export const PaymentLinkMapper = responseMapper(
  schemaValidator,
  PaymentLinkSchemas.PaymentLinkSchema(StatusEnum),
  PaymentLink,
  {
    toDto: async (entity: PaymentLink) => {
      return {
        ...(await entity.read()),
        stripeFields: entity.providerFields
      };
    }
  }
);
