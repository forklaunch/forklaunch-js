import { SchemaValidator } from '@forklaunch/blueprint-core';
import {
  RequestDtoMapper,
  ResponseDtoMapper
} from '@forklaunch/core/dtoMapper';
import { PermissionSchemas } from '../../registrations';
import { Permission } from '../persistence/permission.entity';

export class CreatePermissionDtoMapper extends RequestDtoMapper<
  Permission,
  SchemaValidator
> {
  schema = PermissionSchemas.CreatePermissionSchema;

  toEntity(): Permission {
    return Permission.create(this.dto);
  }
}

export class UpdatePermissionDtoMapper extends RequestDtoMapper<
  Permission,
  SchemaValidator
> {
  schema = PermissionSchemas.UpdatePermissionSchema;

  toEntity(): Permission {
    return Permission.update(this.dto);
  }
}

export class PermissionDtoMapper extends ResponseDtoMapper<
  Permission,
  SchemaValidator
> {
  schema = PermissionSchemas.PermissionSchema;

  fromEntity(entity: Permission): this {
    this.dto = entity.read();
    return this;
  }
}
