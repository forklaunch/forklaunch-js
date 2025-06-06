import { collection } from '@forklaunch/core/persistence';
import { OrganizationStatus } from '../domain/enum/organizationStatus.enum';
import { Organization, Permission, Role } from '../persistence/entities';
import { User } from '../persistence/entities/user.entity';
//! Begin seed data
export const permission = async () =>
  Permission.create({
    slug: 'test'
  });
export const role = async () =>
  Role.create({
    name: 'test',
    permissions: collection([await permission()])
  });
export const user = async () =>
  User.create({
    email: 'test@test.com',
    passwordHash: '1234567890',
    firstName: 'Test',
    lastName: 'User',
    roles: collection([await role()])
  });
export const organization = async () =>
  Organization.create({
    name: 'Test',
    users: collection([await user()]),
    subscription: 'test',
    domain: 'test.com',
    status: OrganizationStatus.ACTIVE
  });
