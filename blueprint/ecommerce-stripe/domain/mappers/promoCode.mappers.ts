import { schemaValidator } from '../../schema';
import { requestMapper, responseMapper } from '@forklaunch/core/mappers';
import { EntityManager } from '@mikro-orm/core';
import { PromoCode } from '../../persistence/entities/promoCode.entity';
import { PromoCodeSchemas } from '../schemas';

export const CreatePromoCodeMapper = requestMapper({
  schemaValidator,
  schema: PromoCodeSchemas.CreatePromoCodeSchema,
  entity: PromoCode,
  mapperDefinition: {
    toEntity: async (dto, em: EntityManager) => {
      return em.create(PromoCode, {
        code: dto.code,
        type: dto.type,
        value: dto.value,
        maxRedemptions: dto.maxRedemptions ?? null,
        minSubtotalCents: dto.minSubtotalCents ?? null,
        expiresAt: dto.expiresAt ?? null,
        timesRedeemed: 0,
        active: true
      });
    }
  }
});

export const UpdatePromoCodeMapper = requestMapper({
  schemaValidator,
  schema: PromoCodeSchemas.UpdatePromoCodeSchema,
  entity: PromoCode,
  mapperDefinition: {
    toEntity: async (dto, em: EntityManager) => {
      const { id, ...rest } = dto;
      const entity = await em.findOneOrFail(PromoCode, { id });
      em.assign(entity, rest);
      return entity;
    }
  }
});

export const PromoCodeMapper = responseMapper({
  schemaValidator,
  schema: PromoCodeSchemas.PromoCodeSchema,
  entity: PromoCode,
  mapperDefinition: {
    toDto: async (entity) => ({
      ...entity,
      maxRedemptions: entity.maxRedemptions ?? undefined,
      minSubtotalCents: entity.minSubtotalCents ?? undefined,
      expiresAt: entity.expiresAt ?? undefined
    })
  }
});
