import { Collection, EntityManager } from '@mikro-orm/core';
import {
  CreateUserData,
  UpdateUserData,
  UserService
} from '../interfaces/userService.interface';
import { User } from '../models/persistence/user.entity';

export default class BaseUserService implements UserService {
  constructor(public em: EntityManager) {}

  private async createUserData(data: CreateUserData): Promise<User> {
    const { user, roles, organization } = data;
    user.roles = new Collection(user, roles);
    if (organization) {
      user.organization = organization;
    }

    return user;
  }

  async createUser(data: CreateUserData, em?: EntityManager): Promise<void> {
    if (em) {
      const user = await this.createUserData(data);
      await em.persist(user);
    } else {
      await this.em.transactional(async (localEm) => {
        const user = await this.createUserData(data);
        await localEm.persist(user);
      });
    }
  }

  async createBatchUsers(
    data: CreateUserData[],
    em?: EntityManager
  ): Promise<void> {
    if (em) {
      const users = data.map(
        async (createUserData) => await this.createUserData(createUserData)
      );
      await em.persist(users);
    } else {
      await this.em.transactional(async (em) => {
        const users = data.map(
          async (createUserData) => await this.createUserData(createUserData)
        );
        await em.persist(users);
      });
    }
  }

  async getUser(id: string): Promise<User> {
    return await this.em.findOneOrFail(User, { id });
  }

  async getBatchUsers(ids: string[]): Promise<User[]> {
    return await this.em.find(User, ids);
  }

  private async updateUserData(data: UpdateUserData): Promise<User> {
    const { user, roles } = data;
    user.roles = new Collection(user, roles);

    return user;
  }

  async updateUser(data: UpdateUserData, em?: EntityManager): Promise<void> {
    // TODO: simplify this type of pattern
    if (em) {
      const user = await this.updateUserData(data);
      await em.upsert(user);
    } else {
      await this.em.transactional(async (localEm) => {
        const user = await this.updateUserData(data);
        await localEm.upsert(user);
      });
    }
  }

  async updateBatchUsers(data: UpdateUserData[]): Promise<void> {
    await this.em.transactional(async (em) => {
      const users = data.map(
        async (updateUserData) => await this.updateUserData(updateUserData)
      );
      await em.upsertMany(users);
    });
  }

  async deleteUser(id: string, em?: EntityManager): Promise<void> {
    const entityManager = em || this.em;
    await entityManager.nativeDelete(User, { id });
  }

  async deleteUsers(ids: string[], em?: EntityManager): Promise<void> {
    const entityManager = em || this.em;
    await entityManager.nativeDelete(User, { id: { $in: ids } });
  }

  async verifyHasRole(id: string, roleId: string): Promise<void> {
    const user = await this.getUser(id);
    if (
      user.roles.filter((role) => {
        return roleId == role.id;
      }).length === 0
    ) {
      throw new Error(`User ${id} does not have role ${roleId}`);
    }
  }

  async verifyHasPermission(id: string, permissionId: string): Promise<void> {
    const user = await this.getUser(id);
    if (
      user.roles
        .map((role) => role.permissions.map((permission) => permission.id))
        .flat()
        .filter((id) => id == permissionId).length === 0
    ) {
      throw new Error(`User ${id} does not have permission ${permissionId}`);
    }
  }
}
