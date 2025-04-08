import { isTrue } from '@forklaunch/common';
import { DummyEnum, testSchemaEquality } from '@forklaunch/core/test';
import {
  CreateOrganizationSchema as TypeboxCreateOrganizationSchema,
  OrganizationSchema as TypeboxOrganizationSchema,
  UpdateOrganizationSchema as TypeboxUpdateOrganizationSchema
} from '../schemas/typebox/organization.schema';
import {
  CreatePermissionSchema as TypeboxCreatePermissionSchema,
  PermissionSchema as TypeboxPermissionSchema,
  UpdatePermissionSchema as TypeboxUpdatePermissionSchema
} from '../schemas/typebox/permission.schema';
import {
  CreateRoleSchema as TypeboxCreateRoleSchema,
  RoleSchema as TypeboxRoleSchema,
  UpdateRoleSchema as TypeboxUpdateRoleSchema
} from '../schemas/typebox/role.schema';
import {
  CreateUserSchema as TypeboxCreateUserSchema,
  UpdateUserSchema as TypeboxUpdateUserSchema,
  UserSchema as TypeboxUserSchema
} from '../schemas/typebox/user.schema';
import {
  CreateOrganizationSchema as ZodCreateOrganizationSchema,
  OrganizationSchema as ZodOrganizationSchema,
  UpdateOrganizationSchema as ZodUpdateOrganizationSchema
} from '../schemas/zod/organization.schema';
import {
  CreatePermissionSchema as ZodCreatePermissionSchema,
  PermissionSchema as ZodPermissionSchema,
  UpdatePermissionSchema as ZodUpdatePermissionSchema
} from '../schemas/zod/permission.schema';
import {
  CreateRoleSchema as ZodCreateRoleSchema,
  RoleSchema as ZodRoleSchema,
  UpdateRoleSchema as ZodUpdateRoleSchema
} from '../schemas/zod/role.schema';
import {
  CreateUserSchema as ZodCreateUserSchema,
  UpdateUserSchema as ZodUpdateUserSchema,
  UserSchema as ZodUserSchema
} from '../schemas/zod/user.schema';

const zodUpdatePermissionSchema = ZodUpdatePermissionSchema(false);
const typeboxUpdatePermissionSchema = TypeboxUpdatePermissionSchema(false);
const zodPermissionSchema = ZodPermissionSchema(false);
const typeboxPermissionSchema = TypeboxPermissionSchema(false);

const zodUpdateRoleSchema = ZodUpdateRoleSchema(false);
const typeboxUpdateRoleSchema = TypeboxUpdateRoleSchema(false);
const zodRoleSchema = ZodRoleSchema(false);
const typeboxRoleSchema = TypeboxRoleSchema(false);

const zodUpdateUserSchema = ZodUpdateUserSchema(false);
const typeboxUpdateUserSchema = TypeboxUpdateUserSchema(false);
const zodUserSchema = ZodUserSchema(false);
const typeboxUserSchema = TypeboxUserSchema(false);

const zodUpdateOrganizationSchema = ZodUpdateOrganizationSchema(false);
const typeboxUpdateOrganizationSchema = TypeboxUpdateOrganizationSchema(false);
const zodOrganizationSchema = ZodOrganizationSchema(false)(DummyEnum);
const typeboxOrganizationSchema = TypeboxOrganizationSchema(false)(DummyEnum);

describe('schema equality', () => {
  it('should be equal for permission', () => {
    expect(
      isTrue(
        testSchemaEquality(
          ZodCreatePermissionSchema,
          TypeboxCreatePermissionSchema,
          {
            slug: 'test',
            addToRolesIds: ['test'],
            extraFields: {
              test: 'test'
            }
          }
        )
      )
    ).toBeTruthy();

    expect(
      isTrue(
        testSchemaEquality(
          zodUpdatePermissionSchema,
          typeboxUpdatePermissionSchema,
          {
            id: 'test',
            slug: 'test',
            addToRolesIds: ['test'],
            removeFromRolesIds: ['test'],
            extraFields: {
              test: 'test'
            }
          }
        )
      )
    ).toBeTruthy();

    expect(
      isTrue(
        testSchemaEquality(zodPermissionSchema, typeboxPermissionSchema, {
          id: 'test',
          slug: 'test',
          extraFields: {
            test: 'test'
          }
        })
      )
    ).toBeTruthy();
  });

  it('should be equal for role', () => {
    expect(
      isTrue(
        testSchemaEquality(ZodCreateRoleSchema, TypeboxCreateRoleSchema, {
          name: 'test',
          permissionIds: ['test'],
          extraFields: {
            test: 'test'
          }
        })
      )
    ).toBeTruthy();

    expect(
      isTrue(
        testSchemaEquality(zodUpdateRoleSchema, typeboxUpdateRoleSchema, {
          id: 'test',
          name: 'test',
          permissionIds: ['test'],
          extraFields: {
            test: 'test'
          }
        })
      )
    ).toBeTruthy();

    expect(
      isTrue(
        testSchemaEquality(zodRoleSchema, typeboxRoleSchema, {
          id: 'test',
          name: 'test',
          permissions: [
            {
              id: 'test',
              slug: 'test',
              extraFields: { test: 'test' }
            }
          ],
          extraFields: {
            test: 'test'
          }
        })
      )
    ).toBeTruthy();
  });

  it('should be equal for user', () => {
    expect(
      isTrue(
        testSchemaEquality(ZodCreateUserSchema, TypeboxCreateUserSchema, {
          email: 'test@test.com',
          password: 'test',
          firstName: 'test',
          lastName: 'test',
          organizationId: 'test',
          roleIds: ['test'],
          phoneNumber: 'test',
          subscription: 'test',
          extraFields: {
            test: 'test'
          }
        })
      )
    ).toBeTruthy();

    expect(
      isTrue(
        testSchemaEquality(zodUpdateUserSchema, typeboxUpdateUserSchema, {
          id: 'test',
          email: 'test@test.com',
          password: 'test',
          firstName: 'test',
          lastName: 'test',
          roleIds: ['test'],
          phoneNumber: 'test',
          subscription: 'test',
          extraFields: {
            test: 'test'
          }
        })
      )
    ).toBeTruthy();

    expect(
      isTrue(
        testSchemaEquality(zodUserSchema, typeboxUserSchema, {
          id: 'test',
          email: 'test@test.com',
          firstName: 'test',
          lastName: 'test',
          roles: [
            {
              id: 'test',
              name: 'test',
              permissions: [{ id: 'test', slug: 'test' }],
              extraFields: {
                test: 'test'
              }
            }
          ],
          phoneNumber: 'test',
          subscription: 'test',
          extraFields: {
            test: 'test'
          }
        })
      )
    ).toBeTruthy();
  });

  it('should be equal for organization', () => {
    expect(
      isTrue(
        testSchemaEquality(
          ZodCreateOrganizationSchema,
          TypeboxCreateOrganizationSchema,
          {
            name: 'test',
            domain: 'test',
            subscription: 'test',
            logoUrl: 'test',
            extraFields: { test: 'test' }
          }
        )
      )
    ).toBeTruthy();

    expect(
      isTrue(
        testSchemaEquality(
          zodUpdateOrganizationSchema,
          typeboxUpdateOrganizationSchema,
          {
            id: 'test',
            name: 'test',
            domain: 'test',
            subscription: 'test',
            logoUrl: 'test',
            extraFields: { test: 'test' }
          }
        )
      )
    ).toBeTruthy();

    expect(
      isTrue(
        testSchemaEquality(zodOrganizationSchema, typeboxOrganizationSchema, {
          id: 'test',
          name: 'test',
          domain: 'test',
          subscription: 'test',
          logoUrl: 'test',
          extraFields: { test: 'test' },
          status: DummyEnum.A,
          users: [
            {
              id: 'test',
              email: 'test@test.com',
              firstName: 'test',
              lastName: 'test',
              roles: [
                {
                  id: 'test',
                  name: 'test',
                  permissions: [{ id: 'test', slug: 'test' }],
                  extraFields: { test: 'test' }
                }
              ]
            }
          ]
        })
      )
    ).toBeTruthy();
  });
});
