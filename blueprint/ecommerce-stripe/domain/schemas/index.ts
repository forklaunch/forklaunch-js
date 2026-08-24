import { SchemaValidator, schemaValidator } from '../../schema';
import { mapServiceSchemas } from '@forklaunch/core/mappers';
import {
  BaseInventoryServiceSchemas,
  BaseProductServiceSchemas,
  BaseVariantServiceSchemas
} from '@forklaunch/implementation-ecommerce-base/schemas';

// Entity ids are fp.string() (uuid-shaped strings assigned via uuid()), not
// mikro-orm's uuid column type — uuidId: false matches sqlBaseProperties.
const schemas = mapServiceSchemas(
  {
    InventorySchemas: BaseInventoryServiceSchemas<SchemaValidator>,
    ProductSchemas: BaseProductServiceSchemas<SchemaValidator>,
    VariantSchemas: BaseVariantServiceSchemas<SchemaValidator>
  },
  {
    validator: schemaValidator,
    uuidId: false
  }
);

export const { InventorySchemas, ProductSchemas, VariantSchemas } = schemas;
