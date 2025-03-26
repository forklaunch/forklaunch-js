import {
  date,
  optional,
  SchemaValidator,
  string,
  unknown,
  uuid
} from '@forklaunch/blueprint-core';
import {
  RequestDtoMapper,
  ResponseDtoMapper
} from '@forklaunch/core/dtoMapper';
import { BillingPortal } from '../persistence/billingPortal.dtoMapper';

export type CreateBillingPortalDto = CreateBillingPortalDtoMapper['dto'];
export class CreateBillingPortalDtoMapper extends RequestDtoMapper<
  BillingPortal,
  SchemaValidator
> {
  schema = {
    customerId: string,
    uri: string,
    expiresAt: date
  };

  toEntity(): BillingPortal {
    return BillingPortal.create({
      customerId: this.dto.customerId,
      uri: this.dto.uri,
      expiresAt: this.dto.expiresAt
    });
  }
}

export type UpdateBillingPortalDto = UpdateBillingPortalDtoMapper['dto'];
export class UpdateBillingPortalDtoMapper extends RequestDtoMapper<
  BillingPortal,
  SchemaValidator
> {
  schema = {
    uri: string,
    expiresAt: date
  };

  toEntity(): BillingPortal {
    return BillingPortal.update({
      uri: this.dto.uri,
      expiresAt: this.dto.expiresAt
    });
  }
}

export type BillingPortalDto = BillingPortalDtoMapper['dto'];
export class BillingPortalDtoMapper extends ResponseDtoMapper<
  BillingPortal,
  SchemaValidator
> {
  schema = {
    id: uuid,
    customerId: string,
    uri: string,
    expiresAt: date,
    extraFields: optional(unknown)
  };

  fromEntity(entity: BillingPortal): this {
    this.dto = entity.read();
    return this;
  }
}
