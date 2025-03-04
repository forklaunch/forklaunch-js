import { OpenTelemetryCollector } from '@forklaunch/core/http';
import { SchemaValidator } from '@forklaunch/framework-core';
import { ForklaunchMetrics } from '@forklaunch/framework-monitoring';
import { Collection, EntityManager } from '@mikro-orm/core';
import { OrganizationService } from '../interfaces/organization.service.interface';
import { RoleService } from '../interfaces/role.service.interface';
import { UserService } from '../interfaces/user.service.interface';
import { OrganizationEntityMapper } from '../models/dtoMapper/organization.dtoMapper';
import { RoleEntityMapper } from '../models/dtoMapper/role.dtoMapper';
import {
  CreateUserDto,
  CreateUserDtoMapper,
  UpdateUserDto,
  UpdateUserDtoMapper,
  UserDto,
  UserDtoMapper
} from '../models/dtoMapper/user.dtoMapper';
import { Role } from '../models/persistence/role.entity';
import { User } from '../models/persistence/user.entity';

export default class BaseUserService implements UserService {
  constructor(
    public em: EntityManager,
    private passwordEncryptionPublicKeyPath: string,
    private roleServiceFactory: () => RoleService,
    private organizationServiceFactory: () => OrganizationService,
    private openTelemetryCollector: OpenTelemetryCollector<ForklaunchMetrics>
  ) {}

  private async getBatchRoles(
    roleIds?: string[],
    em?: EntityManager
  ): Promise<Role[]> {
    return roleIds
      ? (await this.roleServiceFactory().getBatchRoles(roleIds, em)).map(
          (role) => {
            return (em ?? this.em).merge(
              RoleEntityMapper.deserializeDtoToEntity(SchemaValidator(), role)
            );
          }
        )
      : [];
  }

  private async createUserDto(
    userDto: CreateUserDto,
    em?: EntityManager
  ): Promise<User> {
    const roles = await this.getBatchRoles(userDto.roleIds, em);

    const organization = userDto.organizationId
      ? (em ?? this.em).merge(
          OrganizationEntityMapper.deserializeDtoToEntity(
            SchemaValidator(),
            await this.organizationServiceFactory().getOrganization(
              userDto.organizationId,
              em
            )
          )
        )
      : undefined;
    const user = CreateUserDtoMapper.deserializeDtoToEntity(
      SchemaValidator(),
      userDto,
      this.passwordEncryptionPublicKeyPath,
      roles,
      organization
    );
    user.roles = new Collection(user, roles);

    return user;
  }

  async createUser(
    userDto: CreateUserDto,
    em?: EntityManager
  ): Promise<UserDto> {
    const user = await this.createUserDto(userDto);
    ((await em) ?? this.em).transactional(async (em) => {
      await em.persist(user);
    });
    return UserDtoMapper.serializeEntityToDto(SchemaValidator(), user);
  }

  async createBatchUsers(
    userDtos: CreateUserDto[],
    em?: EntityManager
  ): Promise<UserDto[]> {
    const users = await Promise.all(
      userDtos.map(
        async (createUserDto) => await this.createUserDto(createUserDto)
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
      await (em ?? this.em).findOneOrFail(
        User,
        { id },
        {
          populate: ['*']
        }
      )
    );
  }

  async getBatchUsers(ids: string[], em?: EntityManager): Promise<UserDto[]> {
    return (
      await (em ?? this.em).find(User, ids, {
        populate: ['*']
      })
    ).map((user) =>
      UserDtoMapper.serializeEntityToDto(SchemaValidator(), user)
    );
  }

  private async updateUserDto(
    userDto: UpdateUserDto,
    em?: EntityManager
  ): Promise<User> {
    const roles = await this.getBatchRoles(userDto.roleIds, em);
    const user = UpdateUserDtoMapper.deserializeDtoToEntity(
      SchemaValidator(),
      userDto,
      this.passwordEncryptionPublicKeyPath,
      roles
    );

    return user;
  }

  async updateUser(
    userDto: UpdateUserDto,
    em?: EntityManager
  ): Promise<UserDto> {
    let user = await this.updateUserDto(userDto);
    await (em ?? this.em).transactional(async (localEm) => {
      user = await localEm.upsert(user);
    });
    return UserDtoMapper.serializeEntityToDto(SchemaValidator(), user);
  }

  async updateBatchUsers(
    userDtos: UpdateUserDto[],
    em?: EntityManager
  ): Promise<UserDto[]> {
    let users = await Promise.all(
      userDtos.map(
        async (updateUserDto) => await this.updateUserDto(updateUserDto, em)
      )
    );
    await (em ?? this.em).transactional(async (localEm) => {
      users = await localEm.upsertMany(users);
    });
    return users.map((user) =>
      UserDtoMapper.serializeEntityToDto(SchemaValidator(), user)
    );
  }

  async deleteUser(id: string, em?: EntityManager): Promise<void> {
    const entityManager = em || this.em;
    await entityManager.nativeDelete(User, { id });
  }

  async deleteBatchUsers(ids: string[], em?: EntityManager): Promise<void> {
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
