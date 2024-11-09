import { SchemaValidator } from '@forklaunch/framework-core';
import { Collection, EntityManager } from '@mikro-orm/core';
import { RoleService } from '../interfaces/roleService.interface';
import {
  CreateUserData,
  UpdateUserData,
  UserService
} from '../interfaces/userService.interface';
import {
  CreateUserDtoMapper,
  UpdateUserDtoMapper,
  UserDto,
  UserDtoMapper
} from '../models/dtoMapper/user.dtoMapper';
import { Organization } from '../models/persistence/organization.entity';
import { User } from '../models/persistence/user.entity';

export default class BaseUserService implements UserService {
  private roleService: RoleService;

  constructor(
    public em: EntityManager,
    roleService: () => RoleService
  ) {
    this.roleService = roleService();
  }

  private async createUserData(
    { userDto, roleIds, organizationId }: CreateUserData,
    em?: EntityManager
  ): Promise<User> {
    const roles = roleIds
      ? await this.roleService.getBatchRoles(roleIds, em)
      : [];
    const user = CreateUserDtoMapper.deserializeDtoToEntity(
      SchemaValidator(),
      userDto,
      roles
    );
    user.roles = new Collection(user, roles);
    if (organizationId) {
      const organization = await (em ?? this.em).findOneOrFail(
        Organization,
        organizationId
      );
      user.organization = organization;
    }

    return user;
  }

  async createUser(data: CreateUserData, em?: EntityManager): Promise<UserDto> {
    const user = await this.createUserData(data);
    ((await em) ?? this.em).transactional(async (em) => {
      await em.persist(user);
    });
    return UserDtoMapper.serializeEntityToDto(SchemaValidator(), user);
  }

  async createBatchUsers(
    data: CreateUserData[],
    em?: EntityManager
  ): Promise<UserDto[]> {
    const users = await Promise.all(
      data.map(
        async (createUserData) => await this.createUserData(createUserData)
      )
    );
    await (em ?? this.em).transactional(async (em) => {
      await em.persist(users);
    });

    return users.map((user) =>
      UserDtoMapper.serializeEntityToDto(SchemaValidator(), user)
    );
  }

  async getUser(id: string, em?: EntityManager): Promise<UserDto> {
    return UserDtoMapper.serializeEntityToDto(
      SchemaValidator(),
      await (em ?? this.em).findOneOrFail(User, { id })
    );
  }

  async getBatchUsers(ids: string[], em?: EntityManager): Promise<UserDto[]> {
    return (await (em ?? this.em).find(User, ids)).map((user) =>
      UserDtoMapper.serializeEntityToDto(SchemaValidator(), user)
    );
  }

  private async updateUserData(
    { userDto, roleIds }: UpdateUserData,
    em?: EntityManager
  ): Promise<User> {
    const roles = roleIds
      ? await this.roleService.getBatchRoles(roleIds, em)
      : [];
    const user = UpdateUserDtoMapper.deserializeDtoToEntity(
      SchemaValidator(),
      userDto,
      roles
    );

    return user;
  }

  async updateUser(data: UpdateUserData, em?: EntityManager): Promise<UserDto> {
    let user = await this.updateUserData(data);
    await (em ?? this.em).transactional(async (localEm) => {
      user = await localEm.upsert(user);
    });
    return UserDtoMapper.serializeEntityToDto(SchemaValidator(), user);
  }

  async updateBatchUsers(data: UpdateUserData[]): Promise<UserDto[]> {
    let users = await Promise.all(
      data.map(
        async (updateUserData) => await this.updateUserData(updateUserData)
      )
    );
    await this.em.transactional(async (em) => {
      users = await em.upsertMany(users);
    });
    return users.map((user) =>
      UserDtoMapper.serializeEntityToDto(SchemaValidator(), user)
    );
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
