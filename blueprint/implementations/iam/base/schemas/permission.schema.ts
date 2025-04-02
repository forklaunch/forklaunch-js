import { serviceSchemaResolver } from '@forklaunch/core/dtoMapper';
import {
  CreatePermissionSchema as TypeBoxCreatePermissionSchema,
  PermissionSchema as TypeBoxPermissionSchema,
  UpdatePermissionSchema as TypeBoxUpdatePermissionSchema
} from './typebox/permission.schema';
import {
  CreatePermissionSchema as ZodCreatePermissionSchema,
  PermissionSchema as ZodPermissionSchema,
  UpdatePermissionSchema as ZodUpdatePermissionSchema
} from './zod/permission.schema';

const TypeBoxSchemas = (uuidId: boolean) => ({
  CreatePermissionSchema: TypeBoxCreatePermissionSchema,
  UpdatePermissionSchema: TypeBoxUpdatePermissionSchema(uuidId),
  PermissionSchema: TypeBoxPermissionSchema(uuidId)
});

const ZodSchemas = (uuidId: boolean) => ({
  CreatePermissionSchema: ZodCreatePermissionSchema,
  UpdatePermissionSchema: ZodUpdatePermissionSchema(uuidId),
  PermissionSchema: ZodPermissionSchema(uuidId)
});

export const BasePermissionServiceSchemas = serviceSchemaResolver(
  TypeBoxSchemas,
  ZodSchemas
);
