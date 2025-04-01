import { IdiomaticSchema } from '@forklaunch/validator';
import {
  array,
  date,
  email,
  optional,
  string,
  TypeboxSchemaValidator,
  unknown,
  uuid
} from '@forklaunch/validator/typebox';

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

export const UserSchema =
  (uuidId: boolean) =>
  <RoleDtoSchema extends IdiomaticSchema<TypeboxSchemaValidator>>(
    RoleDtoSchema: RoleDtoSchema
  ) => ({
    id: uuidId ? uuid : string,
    email: email,
    firstName: string,
    lastName: string,
    roles: array(RoleDtoSchema),
    phoneNumber: optional(string),
    subscription: optional(string),
    extraFields: optional(unknown),
    createdAt: optional(date),
    updatedAt: optional(date)
  });
