import { SchemaValidator, schemaValidator } from '@forklaunch/blueprint-core';
import { mapServiceSchemas } from '@forklaunch/core/mappers';
import {
  BaseOrganizationServiceSchemas,
  BasePermissionServiceSchemas,
  BaseRoleServiceSchemas,
  BaseUserServiceSchemas
} from '@forklaunch/implementation-iam-base/schemas';

const schemas = mapServiceSchemas(
  {
    OrganizationSchemas: BaseOrganizationServiceSchemas<SchemaValidator>,
    PermissionSchemas: BasePermissionServiceSchemas<SchemaValidator>,
    RoleSchemas: BaseRoleServiceSchemas<SchemaValidator>,
    UserSchemas: BaseUserServiceSchemas<SchemaValidator>
  },
  {
    uuidId: true,
    validator: schemaValidator
  }
);

export const {
  OrganizationSchemas,
  PermissionSchemas,
  RoleSchemas,
  UserSchemas
} = schemas;
