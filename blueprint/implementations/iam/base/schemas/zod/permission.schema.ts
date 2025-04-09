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

export const UpdatePermissionSchema = ({ uuidId }: { uuidId: boolean }) => ({
  id: uuidId ? uuid : string,
  slug: optional(string),
  extraFields: optional(unknown),
  addToRolesIds: optional(array(string)),
  removeFromRolesIds: optional(array(string))
});

export const PermissionSchema = ({ uuidId }: { uuidId: boolean }) => ({
  id: uuidId ? uuid : string,
  slug: string,
  extraFields: optional(unknown),
  createdAt: optional(date),
  updatedAt: optional(date)
});

export const BasePermissionServiceSchemas = (options: { uuidId: boolean }) => ({
  CreatePermissionSchema,
  UpdatePermissionSchema: UpdatePermissionSchema(options),
  PermissionSchema: PermissionSchema(options)
});
