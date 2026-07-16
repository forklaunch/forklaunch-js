import { schemaValidator } from '../../schema';
import { requestMapper, responseMapper } from '@forklaunch/core/mappers';
import { EntityManager } from '@mikro-orm/core';
import { GiftCard } from '../../persistence/entities/giftCard.entity';
import { GiftCardSchemas } from '../schemas';

export const CreateGiftCardMapper = requestMapper({
  schemaValidator,
  schema: GiftCardSchemas.CreateGiftCardSchema,
  entity: GiftCard,
  mapperDefinition: {
    toEntity: async (dto, em: EntityManager) => {
      return em.create(GiftCard, {
        code: dto.code,
        initialCents: dto.initialCents,
        currency: dto.currency,
        // Balance starts equal to the initial value — no separate activation step in v1.
        balanceCents: dto.initialCents
      });
    }
  }
});

export const GiftCardMapper = responseMapper({
  schemaValidator,
  schema: GiftCardSchemas.GiftCardSchema,
  entity: GiftCard,
  mapperDefinition: {
    toDto: async (entity) => ({
      ...entity
    })
  }
});
