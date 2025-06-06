import { SchemaValidator } from '@forklaunch/blueprint-core';
import { RequestDtoMapper, ResponseDtoMapper } from '@forklaunch/core/mappers';
import { BillingPortal } from '../../persistence/entities/billingPortal.entity';
import { BillingPortalSchemas } from '../../registrations';

export class CreateBillingPortalDtoMapper extends RequestDtoMapper<
  BillingPortal,
  SchemaValidator
> {
  schema = BillingPortalSchemas.CreateBillingPortalSchema;

  async toEntity(): Promise<BillingPortal> {
    return BillingPortal.create(this.dto);
  }
}

export class UpdateBillingPortalDtoMapper extends RequestDtoMapper<
  BillingPortal,
  SchemaValidator
> {
  schema = BillingPortalSchemas.UpdateBillingPortalSchema;

  async toEntity(): Promise<BillingPortal> {
    return BillingPortal.update(this.dto);
  }
}

export class BillingPortalDtoMapper extends ResponseDtoMapper<
  BillingPortal,
  SchemaValidator
> {
  schema = BillingPortalSchemas.BillingPortalSchema;

  async fromEntity(entity: BillingPortal): Promise<this> {
    this.dto = await entity.read();
    return this;
  }
}
