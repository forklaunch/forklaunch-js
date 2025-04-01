import { SchemaValidator } from '@forklaunch/blueprint-core';
import {
  RequestDtoMapper,
  ResponseDtoMapper
} from '@forklaunch/core/dtoMapper';
import { BillingPortalSchemas } from '../../registrations';
import { BillingPortal } from '../persistence/billingPortal.entity';

export type CreateBillingPortalDto =
  CreateBillingPortalDtoMapperDefinition['dto'];
export const CreateBillingPortalDtoMapper = () =>
  new CreateBillingPortalDtoMapperDefinition(SchemaValidator());
export class CreateBillingPortalDtoMapperDefinition extends RequestDtoMapper<
  BillingPortal,
  SchemaValidator
> {
  schema = BillingPortalSchemas.CreateBillingPortalSchema;

  toEntity(): BillingPortal {
    return BillingPortal.create(this.dto);
  }
}

export type UpdateBillingPortalDto =
  UpdateBillingPortalDtoMapperDefinition['dto'];
export const UpdateBillingPortalDtoMapper = () =>
  new UpdateBillingPortalDtoMapperDefinition(SchemaValidator());
export class UpdateBillingPortalDtoMapperDefinition extends RequestDtoMapper<
  BillingPortal,
  SchemaValidator
> {
  schema = BillingPortalSchemas.UpdateBillingPortalSchema;

  toEntity(): BillingPortal {
    return BillingPortal.update(this.dto);
  }
}

export type BillingPortalDto = BillingPortalDtoMapperDefinition['dto'];
export const BillingPortalDtoMapper = () =>
  new BillingPortalDtoMapperDefinition(SchemaValidator());
export class BillingPortalDtoMapperDefinition extends ResponseDtoMapper<
  BillingPortal,
  SchemaValidator
> {
  schema = BillingPortalSchemas.BillingPortalSchema;

  fromEntity(entity: BillingPortal): this {
    this.dto = entity.read();
    return this;
  }
}
