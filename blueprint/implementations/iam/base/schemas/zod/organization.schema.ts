import { LiteralSchema } from '@forklaunch/validator';
import {
  array,
  date,
  enum_,
  optional,
  string,
  unknown,
  uuid
} from '@forklaunch/validator/zod';
import { UserSchema } from './user.schema';

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
  <OrganizationStatus extends Record<string, LiteralSchema>>(
    organizationStatus: OrganizationStatus
  ) => ({
    id: uuidId ? uuid : string,
    name: string,
    users: array(UserSchema(uuidId)),
    domain: string,
    subscription: string,
    status: enum_(organizationStatus),
    logoUrl: optional(string),
    extraFields: optional(unknown),
    createdAt: optional(date),
    updatedAt: optional(date)
  });

export const BaseOrganizationServiceSchemas = (uuidId: boolean) => ({
  CreateOrganizationSchema,
  UpdateOrganizationSchema: UpdateOrganizationSchema(uuidId),
  OrganizationSchema: OrganizationSchema(uuidId)
});
