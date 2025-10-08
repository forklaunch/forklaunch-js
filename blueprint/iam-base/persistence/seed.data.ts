import { PERMISSIONS, ROLES } from '@forklaunch/blueprint-core';
import { RequiredEntityData } from '@mikro-orm/core';
import { v4 as uuidv4 } from 'uuid';
import { OrganizationStatus } from '../domain/enum/organizationStatus.enum';
import { Organization } from './entities/organization.entity';
import { Permission } from './entities/permission.entity';
import { Role } from './entities/role.entity';
import { User } from './entities/user.entity';

//! Begin seed data - RBAC Permissions
export const platformReadPermission = {
  id: uuidv4(),
  slug: PERMISSIONS.PLATFORM_READ,
  createdAt: new Date(),
  updatedAt: new Date()
} satisfies RequiredEntityData<Permission>;

export const platformWritePermission = {
  id: uuidv4(),
  slug: PERMISSIONS.PLATFORM_WRITE,
  createdAt: new Date(),
  updatedAt: new Date()
} satisfies RequiredEntityData<Permission>;

//! RBAC Roles
export const viewerRole = {
  id: uuidv4(),
  name: ROLES.VIEWER,
  permissions: [platformReadPermission.id],
  createdAt: new Date(),
  updatedAt: new Date()
} satisfies RequiredEntityData<Role>;

export const editorRole = {
  id: uuidv4(),
  name: ROLES.EDITOR,
  permissions: [platformReadPermission.id, platformWritePermission.id],
  createdAt: new Date(),
  updatedAt: new Date()
} satisfies RequiredEntityData<Role>;

export const adminRole = {
  id: uuidv4(),
  name: ROLES.ADMIN,
  permissions: [platformReadPermission.id, platformWritePermission.id],
  createdAt: new Date(),
  updatedAt: new Date()
} satisfies RequiredEntityData<Role>;

export const systemRole = {
  id: uuidv4(),
  name: ROLES.SYSTEM,
  permissions: [platformReadPermission.id, platformWritePermission.id],
  createdAt: new Date(),
  updatedAt: new Date()
} satisfies RequiredEntityData<Role>;

export const user = {
  id: uuidv4(),
  email: 'test@test.com',
  firstName: 'Test',
  lastName: 'User',
  roles: [adminRole.id],
  createdAt: new Date(),
  updatedAt: new Date()
} satisfies RequiredEntityData<User>;

export const organization = {
  name: 'Test',
  users: [user.id],
  subscription: 'test',
  domain: 'test.com',
  status: OrganizationStatus.ACTIVE,
  createdAt: new Date(),
  updatedAt: new Date()
} satisfies RequiredEntityData<Organization>;
