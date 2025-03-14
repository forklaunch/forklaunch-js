import { collection } from '@forklaunch/framework-core';
import { Organization, Permission, Role } from '../models/persistence';
import { OrganizationStatus } from '../models/persistence/organization.entity';
import { User } from '../models/persistence/user.entity';
//! Begin seed data
export const permission = Permission.create({
  slug: 'test'
});
export const role = Role.create({
  name: 'test',
  permissions: collection([permission])
});
export const user = User.create({
  email: 'test@test.com',
  passwordHash: '1234567890',
  firstName: 'Test',
  lastName: 'User',
  roles: collection([role])
});
export const organization = Organization.create({
  name: 'Test',
  users: collection([user]),
  subscription: 'test',
  domain: 'test.com',
  status: OrganizationStatus.ACTIVE
});
