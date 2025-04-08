import {
  array,
  date,
  email,
  optional,
  string,
  unknown,
  uuid
} from '@forklaunch/validator/zod';
import { RoleSchema } from './role.schema';

export const CreateUserSchema = {
  email: email,
  password: string,
  firstName: string,
  lastName: string,
  organizationId: string,
  roleIds: array(string),
  phoneNumber: optional(string),
  subscription: optional(string),
  extraFields: optional(unknown)
};

export const UpdateUserSchema = (uuidId: boolean) => ({
  id: uuidId ? uuid : string,
  email: optional(email),
  password: optional(string),
  firstName: optional(string),
  lastName: optional(string),
  roleIds: optional(array(string)),
  phoneNumber: optional(string),
  subscription: optional(string),
  extraFields: optional(unknown)
});

export const UserSchema = (uuidId: boolean) => ({
  id: uuidId ? uuid : string,
  email: email,
  firstName: string,
  lastName: string,
  roles: array(RoleSchema(uuidId)),
  phoneNumber: optional(string),
  subscription: optional(string),
  extraFields: optional(unknown),
  createdAt: optional(date),
  updatedAt: optional(date)
});

export const BaseUserServiceSchemas = (uuidId: boolean) => ({
  CreateUserSchema,
  UpdateUserSchema: UpdateUserSchema(uuidId),
  UserSchema: UserSchema(uuidId)
});
