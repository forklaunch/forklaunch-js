import { IdiomaticSchema, LiteralSchema } from '@forklaunch/validator';
import {
  array,
  date,
  enum_,
  optional,
  string,
  unknown,
  uuid,
  ZodSchemaValidator
} from '@forklaunch/validator/zod';

export const CreateOrganizationSchema = {
  name: string,
  domain: string,
  subscription: string,
  logoUrl: optional(string),
  extraFields: optional(unknown)
};

export const UpdateOrganizationSchema = (uuidId: boolean) => ({
  id: uuidId ? uuid : string,
  name: optional(string),
  domain: optional(string),
  subscription: optional(string),
  logoUrl: optional(string),
  extraFields: optional(unknown)
});

export const OrganizationSchema =
  (uuidId: boolean) =>
  <
    UserDtoSchema extends IdiomaticSchema<ZodSchemaValidator>,
    OrganizationStatus extends Record<string, LiteralSchema>
  >(
    UserDtoSchema: UserDtoSchema,
    OrganizationStatus: OrganizationStatus
  ) => ({
    id: uuidId ? uuid : string,
    name: string,
    users: array(UserDtoSchema),
    domain: string,
    subscription: string,
    status: enum_(OrganizationStatus),
    logoUrl: optional(string),
    extraFields: optional(unknown),
    createdAt: optional(date),
    updatedAt: optional(date)
  });
