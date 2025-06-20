import {
  array,
  date,
  optional,
  string,
  unknown,
  uuid
} from '@forklaunch/validator/typebox';
import { PermissionSchema } from './permission.schema';

export const CreateRoleSchema = {
  name: string,
  permissionIds: optional(array(string)),
  providerFields: optional(unknown)
};

export const UpdateRoleSchema = ({ uuidId }: { uuidId: boolean }) => ({
  id: uuidId ? uuid : string,
  name: optional(string),
  permissionIds: optional(array(string)),
  providerFields: optional(unknown)
});

export const RoleSchema = ({ uuidId }: { uuidId: boolean }) => ({
  id: uuidId ? uuid : string,
  name: string,
  permissions: array(PermissionSchema({ uuidId })),
  providerFields: optional(unknown),
  createdAt: optional(date),
  updatedAt: optional(date)
});

export const BaseRoleServiceSchemas = (options: { uuidId: boolean }) => ({
  CreateRoleSchema,
  UpdateRoleSchema: UpdateRoleSchema(options),
  RoleSchema: RoleSchema(options)
});
