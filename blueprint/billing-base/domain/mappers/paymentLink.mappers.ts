import { schemaValidator } from '@forklaunch/blueprint-core';
import { requestMapper, responseMapper } from '@forklaunch/core/mappers';
import { EntityManager } from '@mikro-orm/core';
import { PaymentLink } from '../../persistence/entities/paymentLink.entity';
import { CurrencyEnum } from '../enum/currency.enum';
import { PaymentMethodEnum } from '../enum/paymentMethod.enum';
import { StatusEnum } from '../enum/status.enum';
import { PaymentLinkSchemas } from '../schemas';

export const CreatePaymentLinkMapper = requestMapper({
  schemaValidator,
  schema: PaymentLinkSchemas.CreatePaymentLinkSchema(
    PaymentMethodEnum,
    CurrencyEnum,
    StatusEnum
  ),
  entity: PaymentLink,
  mapperDefinition: {
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
});

export const UpdatePaymentLinkMapper = requestMapper({
  schemaValidator,
  schema: PaymentLinkSchemas.UpdatePaymentLinkSchema(
    PaymentMethodEnum,
    CurrencyEnum,
    StatusEnum
  ),
  entity: PaymentLink,
  mapperDefinition: {
    toEntity: async (dto, em: EntityManager) => {
      return PaymentLink.update(dto, em);
    }
  }
});

export const PaymentLinkMapper = responseMapper({
  schemaValidator,
  schema: PaymentLinkSchemas.PaymentLinkSchema(
    PaymentMethodEnum,
    CurrencyEnum,
    StatusEnum
  ),
  entity: PaymentLink,
  mapperDefinition: {
    toDto: async (entity: PaymentLink) => {
      return await entity.read();
    }
  }
});
