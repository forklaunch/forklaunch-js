import { schemaValidator } from '@forklaunch/blueprint-core';
import { requestMapper, responseMapper } from '@forklaunch/core/mappers';
import { EntityManager } from '@mikro-orm/core';
import { BillingPortal } from '../../persistence/entities/billingPortal.entity';
import { BillingPortalSchemas } from '../../registrations';

export const CreateBillingPortalMapper = requestMapper(
  schemaValidator,
  BillingPortalSchemas.CreateBillingPortalSchema,
  BillingPortal,
  {
    toEntity: async (dto, em: EntityManager) => {
      return BillingPortal.create(
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

export const UpdateBillingPortalMapper = requestMapper(
  schemaValidator,
  BillingPortalSchemas.UpdateBillingPortalSchema,
  BillingPortal,
  {
    toEntity: async (dto, em: EntityManager) => {
      return BillingPortal.update(dto, em);
    }
  }
);

export const BillingPortalMapper = responseMapper(
  schemaValidator,
  BillingPortalSchemas.BillingPortalSchema,
  BillingPortal,
  {
    toDomain: async (entity: BillingPortal) => {
      return await entity.read();
    }
  }
);
