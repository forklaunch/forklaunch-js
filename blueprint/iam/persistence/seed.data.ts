import { EntityManager } from '@mikro-orm/core';
import { OrganizationStatus } from '../domain/enum/organizationStatus.enum';
import { Organization, Permission, Role } from '../persistence/entities';
import { User } from '../persistence/entities/user.entity';
//! Begin seed data
export const permission = async (em: EntityManager) =>
  Permission.create(
    {
      slug: 'test',
      createdAt: new Date(),
      updatedAt: new Date()
    },
    em
  );
export const role = async (em: EntityManager) =>
  Role.create(
    {
      name: 'test',
      permissions: [await permission(em)],
      createdAt: new Date(),
      updatedAt: new Date()
    },
    em
  );
export const user = async (em: EntityManager) =>
  User.create(
    {
      email: 'test@test.com',
      firstName: 'Test',
      lastName: 'User',
      roles: [await role(em)],
      createdAt: new Date(),
      updatedAt: new Date()
    },
    em
  );
export const organization = async (em: EntityManager) =>
  Organization.create(
    {
      name: 'Test',
      users: [await user(em)],
      subscription: 'test',
      domain: 'test.com',
      status: OrganizationStatus.ACTIVE,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    em
  );
