import { schemaValidator } from '@forklaunch/blueprint-core';
import { requestMapper, responseMapper } from '@forklaunch/core/mappers';
import { EntityManager } from '@mikro-orm/core';
import { CheckoutSession } from '../../persistence/entities/checkoutSession.entity';
import { CheckoutSessionSchemas } from '../../registrations';
import { CurrencyEnum } from '../enum/currency.enum';
import { PaymentMethodEnum } from '../enum/paymentMethod.enum';
import { StatusEnum } from '../enum/status.enum';

export const CreateCheckoutSessionMapper = requestMapper(
  schemaValidator,
  CheckoutSessionSchemas.CreateCheckoutSessionSchema(
    PaymentMethodEnum,
    CurrencyEnum,
    StatusEnum
  ),
  CheckoutSession,
  {
    toEntity: async (dto, em: EntityManager) => {
      return CheckoutSession.create(
        {
          ...dto,
          uri: `checkout/${Date.now()}`, // Generate a simple URI
          createdAt: new Date(),
          updatedAt: new Date()
        },
        em
      );
    }
  }
);

export const UpdateCheckoutSessionMapper = requestMapper(
  schemaValidator,
  CheckoutSessionSchemas.UpdateCheckoutSessionSchema(
    PaymentMethodEnum,
    CurrencyEnum,
    StatusEnum
  ),
  CheckoutSession,
  {
    toEntity: async (dto, em: EntityManager) => {
      return CheckoutSession.update(dto, em);
    }
  }
);

export const CheckoutSessionMapper = responseMapper(
  schemaValidator,
  CheckoutSessionSchemas.CheckoutSessionSchema(
    PaymentMethodEnum,
    CurrencyEnum,
    StatusEnum
  ),
  CheckoutSession,
  {
    toDomain: async (entity: CheckoutSession) => {
      return await entity.read();
    }
  }
);
