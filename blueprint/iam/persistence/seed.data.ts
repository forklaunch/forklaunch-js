import { EntityManager } from '@mikro-orm/core';
import { OrganizationStatus } from '../domain/enum/organizationStatus.enum';
import { Organization, Permission, Role } from '../persistence/entities';
import { User } from '../persistence/entities/user.entity';
//! Begin seed data
export const permission = async (em: EntityManager) =>
  em.create(Permission, {
    slug: 'test',
    createdAt: new Date(),
    updatedAt: new Date()
  });
export const role = async (em: EntityManager) =>
  em.create(Role, {
    name: 'test',
    permissions: [await permission(em)],
    createdAt: new Date(),
    updatedAt: new Date()
  });
export const user = async (em: EntityManager) =>
  em.create(User, {
    email: 'test@test.com',
    firstName: 'Test',
    lastName: 'User',
    roles: [await role(em)],
    createdAt: new Date(),
    updatedAt: new Date()
  });
export const organization = async (em: EntityManager) =>
  em.create(Organization, {
    name: 'Test',
    users: [await user(em)],
    subscription: 'test',
    domain: 'test.com',
    status: OrganizationStatus.ACTIVE,
    createdAt: new Date(),
    updatedAt: new Date()
  });
