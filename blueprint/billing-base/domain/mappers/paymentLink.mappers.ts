import { schemaValidator } from '@forklaunch/blueprint-core';
import { requestMapper, responseMapper } from '@forklaunch/core/mappers';
import { EntityManager } from '@mikro-orm/core';
import { PaymentLink } from '../../persistence/entities/paymentLink.entity';
import { PaymentLinkSchemas } from '../../registrations';
import { CurrencyEnum } from '../enum/currency.enum';
import { PaymentMethodEnum } from '../enum/paymentMethod.enum';
import { StatusEnum } from '../enum/status.enum';

export const CreatePaymentLinkMapper = requestMapper(
  schemaValidator,
  PaymentLinkSchemas.CreatePaymentLinkSchema(
    PaymentMethodEnum,
    CurrencyEnum,
    StatusEnum
  ),
  PaymentLink,
  {
    toEntity: async (dto, em: EntityManager) => {
      return PaymentLink.create(
        {
          ...dto,
          createdAt: new Date(),
          updatedAt: new Date()
        },
        em
      );
    }
  }
);

export const UpdatePaymentLinkMapper = requestMapper(
  schemaValidator,
  PaymentLinkSchemas.UpdatePaymentLinkSchema(
    PaymentMethodEnum,
    CurrencyEnum,
    StatusEnum
  ),
  PaymentLink,
  {
    toEntity: async (dto, em: EntityManager) => {
      return PaymentLink.update(dto, em);
    }
  }
);

export const PaymentLinkMapper = responseMapper(
  schemaValidator,
  PaymentLinkSchemas.PaymentLinkSchema(
    PaymentMethodEnum,
    CurrencyEnum,
    StatusEnum
  ),
  PaymentLink,
  {
    toDomain: async (entity: PaymentLink) => {
      return await entity.read();
    }
  }
);
