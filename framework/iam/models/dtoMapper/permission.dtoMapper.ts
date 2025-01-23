import {
  RequestDtoMapper,
  ResponseDtoMapper
} from '@forklaunch/core/dtoMapper';
import {
  array,
  date,
  optional,
  SchemaValidator,
  string,
  uuid
} from '@forklaunch/framework-core';
import { Permission } from '../persistence/permission.entity';

export type CreatePermissionDto = CreatePermissionDtoMapper['dto'];
export class CreatePermissionDtoMapper extends RequestDtoMapper<
  Permission,
  SchemaValidator
> {
  schema = {
    slug: string,
    addToRolesIds: optional(array(string))
  };

  toEntity(): Permission {
    return Permission.create(this.dto);
  }
}

export type UpdatePermissionDto = UpdatePermissionDtoMapper['dto'];
export class UpdatePermissionDtoMapper extends RequestDtoMapper<
  Permission,
  SchemaValidator
> {
  schema = {
    id: uuid,
    slug: optional(string),
    addToRolesIds: optional(array(string)),
    removeFromRolesIds: optional(array(string))
  };

  toEntity(): Permission {
    return Permission.update(this.dto);
  }
}

const permissionSchema = {
  id: uuid,
  slug: string,
  createdAt: date,
  updatedAt: date
};

export type PermissionDto = PermissionDtoMapper['dto'];
export class PermissionDtoMapper extends ResponseDtoMapper<
  Permission,
  SchemaValidator
> {
  schema = permissionSchema;

  fromEntity(entity: Permission): this {
    this.dto = entity.read();
    return this;
  }
}

export class PermissionEntityMapper extends RequestDtoMapper<
  Permission,
  SchemaValidator
> {
  schema = permissionSchema;

  toEntity(): Permission {
    return Permission.create(this.dto);
  }
}
