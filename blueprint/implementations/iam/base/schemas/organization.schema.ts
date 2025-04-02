import { serviceSchemaResolver } from '@forklaunch/core/dtoMapper';
import {
  CreateOrganizationSchema as TypeBoxCreateOrganizationSchema,
  OrganizationSchema as TypeBoxOrganizationSchema,
  UpdateOrganizationSchema as TypeBoxUpdateOrganizationSchema
} from './typebox/organization.schema';
import {
  CreateOrganizationSchema as ZodCreateOrganizationSchema,
  OrganizationSchema as ZodOrganizationSchema,
  UpdateOrganizationSchema as ZodUpdateOrganizationSchema
} from './zod/organization.schema';

const TypeBoxSchemas = (uuidId: boolean) => ({
  CreateOrganizationSchema: TypeBoxCreateOrganizationSchema,
  UpdateOrganizationSchema: TypeBoxUpdateOrganizationSchema(uuidId),
  OrganizationSchema: TypeBoxOrganizationSchema(uuidId)
});

const ZodSchemas = (uuidId: boolean) => ({
  CreateOrganizationSchema: ZodCreateOrganizationSchema,
  UpdateOrganizationSchema: ZodUpdateOrganizationSchema(uuidId),
  OrganizationSchema: ZodOrganizationSchema(uuidId)
});

export const BaseOrganizationServiceSchemas = serviceSchemaResolver(
  TypeBoxSchemas,
  ZodSchemas
);
