import {
  array,
  date,
  optional,
  string,
  unknown,
  uuid
} from '@forklaunch/validator/zod';
import { PermissionSchema } from './permission.schema';

export const CreateRoleSchema = {
  name: string,
  permissionIds: optional(array(string)),
  extraFields: optional(unknown)
};

export const UpdateRoleSchema = (uuidId: boolean) => ({
  id: uuidId ? uuid : string,
  name: optional(string),
  permissionIds: optional(array(string)),
  extraFields: optional(unknown)
});

export const RoleSchema = (uuidId: boolean) => ({
  id: uuidId ? uuid : string,
  name: string,
  permissions: array(PermissionSchema(uuidId)),
  extraFields: optional(unknown),
  createdAt: optional(date),
  updatedAt: optional(date)
});

export const BaseRoleServiceSchemas = (uuidId: boolean) => ({
  CreateRoleSchema,
  UpdateRoleSchema: UpdateRoleSchema(uuidId),
  RoleSchema: RoleSchema(uuidId)
});
