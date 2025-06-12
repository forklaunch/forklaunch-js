import { RequiredEntityData } from '@mikro-orm/core';
import { OrganizationStatus } from '../domain/enum/organizationStatus.enum';
import { Organization, Permission, Role } from './entities';
import { User } from './entities/user.entity';
//! Begin seed data
export const permission = {
  id: 'e7e2d2da-1f6a-4657-bb7d-221b1a5f3f6a',
  slug: 'test',
  createdAt: new Date(),
  updatedAt: new Date()
} satisfies RequiredEntityData<Permission>;

export const role = {
  id: 'e7e2d2da-1f6a-4657-bb7d-221b1a5f3f6a',
  name: 'test',
  permissions: [permission.id],
  createdAt: new Date(),
  updatedAt: new Date()
} satisfies RequiredEntityData<Role>;

export const user = {
  id: 'e7e2d2da-1f6a-4657-bb7d-221b1a5f3f6a',
  email: 'test@test.com',
  firstName: 'Test',
  lastName: 'User',
  roles: [role.id],
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
