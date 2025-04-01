import { isNever } from '@forklaunch/common';
import { AnySchemaValidator } from '@forklaunch/validator';
import { TypeboxSchemaValidator } from '@forklaunch/validator/typebox';
import { ZodSchemaValidator } from '@forklaunch/validator/zod';
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

type SchemasByValidator<T extends AnySchemaValidator> =
  T extends TypeboxSchemaValidator
    ? ReturnType<typeof TypeBoxSchemas>
    : T extends ZodSchemaValidator
      ? ReturnType<typeof ZodSchemas>
      : never;

export const BasePermissionServiceSchemas = <
  SchemaValidator extends AnySchemaValidator
>(
  schemaValidator: SchemaValidator,
  uuidId: boolean
): SchemasByValidator<SchemaValidator> => {
  switch (schemaValidator._Type) {
    case 'TypeBox':
      return TypeBoxSchemas(uuidId) as SchemasByValidator<SchemaValidator>;

    case 'Zod':
      return ZodSchemas(uuidId) as SchemasByValidator<SchemaValidator>;

    default:
      isNever(schemaValidator._Type);
      throw new Error('Invalid schema validator');
  }
};
