import { IdiomaticSchema } from '@forklaunch/validator';
import {
  array,
  date,
  optional,
  string,
  TypeboxSchemaValidator,
  unknown,
  uuid
} from '@forklaunch/validator/typebox';

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

export const RoleSchema =
  (uuidId: boolean) =>
  <PermissionSchema extends IdiomaticSchema<TypeboxSchemaValidator>>(
    PermissionSchema: PermissionSchema
  ) => ({
    id: uuidId ? uuid : string,
    name: string,
    permissions: array(PermissionSchema),
    extraFields: optional(unknown),
    createdAt: optional(date),
    updatedAt: optional(date)
  });
