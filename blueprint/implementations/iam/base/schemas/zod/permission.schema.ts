import {
  array,
  date,
  optional,
  string,
  unknown,
  uuid
} from '@forklaunch/validator/zod';

export const CreatePermissionSchema = {
  slug: string,
  addToRolesIds: optional(array(string)),
  extraFields: optional(unknown)
};

export const UpdatePermissionSchema = (uuidId: boolean) => ({
  id: uuidId ? uuid : string,
  slug: optional(string),
  extraFields: optional(unknown),
  addToRolesIds: optional(array(string)),
  removeFromRolesIds: optional(array(string))
});

export const PermissionSchema = (uuidId: boolean) => ({
  id: uuidId ? uuid : string,
  slug: string,
  extraFields: optional(unknown),
  createdAt: optional(date),
  updatedAt: optional(date)
});

export const BasePermissionServiceSchemas = (uuidId: boolean) => ({
  CreatePermissionSchema,
  UpdatePermissionSchema: UpdatePermissionSchema(uuidId),
  PermissionSchema: PermissionSchema(uuidId)
});
