import { collection, SchemaValidator } from '@forklaunch/blueprint-core';
import {
  RequestDtoMapper,
  ResponseDtoMapper
} from '@forklaunch/core/dtoMapper';
import {
  OrganizationSchemas,
  PermissionSchemas,
  RoleSchemas,
  UserSchemas
} from '../../registrations';
import { OrganizationStatus } from '../enum/organizationStatus.enum';
import { Organization } from '../persistence/organization.entity';
import { UserDtoMapper } from './user.dtoMapper';

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
  schema = OrganizationSchemas.OrganizationSchema(
    UserSchemas.UserSchema(
      RoleSchemas.RoleSchema(PermissionSchemas.PermissionSchema)
    ),
    OrganizationStatus
  );

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
