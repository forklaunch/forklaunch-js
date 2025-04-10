import { collection, SchemaValidator } from '@forklaunch/blueprint-core';
import { RequestDtoMapper, ResponseDtoMapper } from '@forklaunch/core/mappers';
import { OrganizationSchemas } from '../../registrations';
import { OrganizationStatus } from '../../domain/enum/organizationStatus.enum';
import { Organization } from '../../persistence/entities/organization.entity';
import { UserDtoMapper } from './user.mappers';

export class CreateOrganizationDtoMapper extends RequestDtoMapper<
  Organization,
  SchemaValidator
> {
  schema = OrganizationSchemas.CreateOrganizationSchema;

  toEntity() {
    return Organization.create({
      ...this.dto,
      users: collection([]),
      status: OrganizationStatus.ACTIVE
    });
  }
}

export class UpdateOrganizationDtoMapper extends RequestDtoMapper<
  Organization,
  SchemaValidator
> {
  schema = OrganizationSchemas.UpdateOrganizationSchema;

  toEntity(): Organization {
    return Organization.update(this.dto);
  }
}
export class OrganizationDtoMapper extends ResponseDtoMapper<
  Organization,
  SchemaValidator
> {
  schema = OrganizationSchemas.OrganizationSchema(OrganizationStatus);

  fromEntity(entity: Organization): this {
    this.dto = {
      ...entity.read(),
      users: entity.users.isInitialized()
        ? entity.users
            .getItems()
            .map((user) =>
              UserDtoMapper.fromEntity(SchemaValidator(), user).toDto()
            )
        : []
    };

    return this;
  }
}
