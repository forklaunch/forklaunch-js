import { schemaValidator } from '../../schema';
import { requestMapper, responseMapper } from '@forklaunch/core/mappers';
import { ReviewStatus } from '@forklaunch/interfaces-ecommerce/types';
import { EntityManager } from '@mikro-orm/core';
import { Review } from '../../persistence/entities/review.entity';
import { ReviewSchemas } from '../schemas';

export const CreateReviewMapper = requestMapper({
  schemaValidator,
  schema: ReviewSchemas.CreateReviewSchema,
  entity: Review,
  mapperDefinition: {
    toEntity: async (dto, em: EntityManager) => {
      return em.create(Review, {
        productId: dto.productId,
        orderId: dto.orderId ?? null,
        rating: dto.rating,
        title: dto.title ?? null,
        body: dto.body,
        media: dto.media ?? null,
        status: ReviewStatus.PENDING
      });
    }
  }
});

export const UpdateReviewMapper = requestMapper({
  schemaValidator,
  schema: ReviewSchemas.UpdateReviewSchema,
  entity: Review,
  mapperDefinition: {
    toEntity: async (dto, em: EntityManager) => {
      const { id, ...rest } = dto;
      const entity = await em.findOneOrFail(Review, { id });
      em.assign(entity, rest);
      return entity;
    }
  }
});

export const ReviewMapper = responseMapper({
  schemaValidator,
  schema: ReviewSchemas.ReviewSchema,
  entity: Review,
  mapperDefinition: {
    toDto: async (entity) => ({
      ...entity,
      orderId: entity.orderId ?? undefined,
      title: entity.title ?? undefined,
      media: entity.media ?? undefined
    })
  }
});
