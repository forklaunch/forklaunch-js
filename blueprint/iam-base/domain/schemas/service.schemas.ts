//! NOTE: THIS FILE WILL BE DELETED UPON EJECTION. EDIT AT YOUR OWN RISK.
import { schemaValidator } from '@forklaunch/blueprint-core';
import { mapServiceSchemas } from '@forklaunch/core/mappers';
import {
  BaseOrganizationServiceSchemas,
  BasePermissionServiceSchemas,
  BaseRoleServiceSchemas,
  BaseUserServiceSchemas
} from '@forklaunch/implementation-iam-base/schemas';

export const {
  OrganizationSchemas,
  PermissionSchemas,
  RoleSchemas,
  UserSchemas
} = mapServiceSchemas(
  {
    OrganizationSchemas: BaseOrganizationServiceSchemas,
    PermissionSchemas: BasePermissionServiceSchemas,
    RoleSchemas: BaseRoleServiceSchemas,
    UserSchemas: BaseUserServiceSchemas
  },
  {
    uuidId: true,
    validator: schemaValidator
  }
);
