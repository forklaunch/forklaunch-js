import { SchemaValidator } from '@forklaunch/blueprint-core';
import { RequestDtoMapper, ResponseDtoMapper } from '@forklaunch/core/mappers';
import { BillingPortalSchemas } from '../../registrations';
import { BillingPortal } from '../../persistence/entities/billingPortal.entity';

export class CreateBillingPortalDtoMapper extends RequestDtoMapper<
  BillingPortal,
  SchemaValidator
> {
  schema = BillingPortalSchemas.CreateBillingPortalSchema;

  toEntity(): BillingPortal {
    return BillingPortal.create(this.dto);
  }
}

export class UpdateBillingPortalDtoMapper extends RequestDtoMapper<
  BillingPortal,
  SchemaValidator
> {
  schema = BillingPortalSchemas.UpdateBillingPortalSchema;

  toEntity(): BillingPortal {
    return BillingPortal.update(this.dto);
  }
}

export class BillingPortalDtoMapper extends ResponseDtoMapper<
  BillingPortal,
  SchemaValidator
> {
  schema = BillingPortalSchemas.BillingPortalSchema;

  fromEntity(entity: BillingPortal): this {
    this.dto = entity.read();
    return this;
  }
}
