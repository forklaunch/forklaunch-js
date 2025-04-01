import {
  CreateUserDto,
  OrganizationDto,
  RoleDto,
  RoleService,
  UpdateUserDto,
  UserDto,
  UserService
} from '@forklaunch/blueprint-iam-interfaces';
import {
  MetricsDefinition,
  OpenTelemetryCollector
} from '@forklaunch/core/http';

import { OrganizationService } from '@forklaunch/blueprint-iam-interfaces';
import { IdDto, IdsDto, InstanceTypeRecord } from '@forklaunch/common';
import {
  InternalDtoMapper,
  transformIntoInternalDtoMapper
} from '@forklaunch/core/dtoMapper';
import { AnySchemaValidator } from '@forklaunch/validator';
import { EntityManager } from '@mikro-orm/core';
export default class BaseUserService<
  SchemaValidator extends AnySchemaValidator,
  Metrics extends MetricsDefinition = MetricsDefinition,
  Dto extends {
    UserDtoMapper: UserDto;
    CreateUserDtoMapper: CreateUserDto;
    UpdateUserDtoMapper: UpdateUserDto;
    RoleDtoMapper: RoleDto;
    OrganizationDtoMapper: OrganizationDto<unknown>;
  } = {
    UserDtoMapper: UserDto;
    CreateUserDtoMapper: CreateUserDto;
    UpdateUserDtoMapper: UpdateUserDto;
    RoleDtoMapper: RoleDto;
    OrganizationDtoMapper: OrganizationDto<unknown>;
  },
  Entities extends {
    UserDtoMapper: UserDto;
    CreateUserDtoMapper: UserDto;
    UpdateUserDtoMapper: UserDto;
    RoleDtoMapper: RoleDto;
    OrganizationDtoMapper: OrganizationDto<unknown>;
  } = {
    UserDtoMapper: UserDto;
    CreateUserDtoMapper: UserDto;
    UpdateUserDtoMapper: UserDto;
    RoleDtoMapper: RoleDto;
    OrganizationDtoMapper: OrganizationDto<unknown>;
  }
> implements UserService
{
  #dtoMappers: InternalDtoMapper<
    InstanceTypeRecord<typeof this.dtoMappers>,
    Entities,
    Dto
  >;

  constructor(
    public em: EntityManager,
    protected passwordEncryptionPublicKeyPath: string,
    protected roleServiceFactory: () => RoleService,
    protected organizationServiceFactory: () => OrganizationService<unknown>,
    protected openTelemetryCollector: OpenTelemetryCollector<Metrics>,
    protected schemaValidator: SchemaValidator,
    protected dtoMappers: {
      UserDtoMapper: new (schemaValidator: SchemaValidator) => {
        dto: Dto['UserDtoMapper'];
        _Entity: Entities['UserDtoMapper'];
        serializeEntityToDto: unknown;
      };
      CreateUserDtoMapper: new (schemaValidator: SchemaValidator) => {
        dto: Dto['CreateUserDtoMapper'];
        _Entity: Entities['CreateUserDtoMapper'];
        deserializeDtoToEntity: (
          // We do this, because this gets applied to the instantiated argument.
          // The choices are any or never for universal mapping, but the internal
          // transformation takes care of the proper typing.
          dto: never,
          passwordEncryptionPublicKeyPath: string
        ) => Entities['CreateUserDtoMapper'];
      };
      UpdateUserDtoMapper: new (schemaValidator: SchemaValidator) => {
        dto: Dto['UpdateUserDtoMapper'];
        _Entity: Entities['UpdateUserDtoMapper'];
        deserializeDtoToEntity: (
          dto: never,
          passwordEncryptionPublicKeyPath: string
        ) => Entities['UpdateUserDtoMapper'];
      };
      RoleDtoMapper: new (schemaValidator: SchemaValidator) => {
        dto: Dto['RoleDtoMapper'];
        _Entity: Entities['RoleDtoMapper'];
        deserializeDtoToEntity: unknown;
      };
      OrganizationDtoMapper: new (schemaValidator: SchemaValidator) => {
        dto: Dto['OrganizationDtoMapper'];
        _Entity: Entities['OrganizationDtoMapper'];
        deserializeDtoToEntity: unknown;
      };
    }
  ) {
    this.#dtoMappers = transformIntoInternalDtoMapper(
      dtoMappers,
      schemaValidator
    );
  }

  private async getBatchRoles(
    roleIds?: IdsDto,
    em?: EntityManager
  ): Promise<Entities['RoleDtoMapper'][]> {
    return roleIds
      ? (await this.roleServiceFactory().getBatchRoles(roleIds, em)).map(
          (role) => {
            return (em ?? this.em).merge(
              this.#dtoMappers.RoleDtoMapper.deserializeDtoToEntity(role)
            );
          }
        )
      : [];
  }

  async createUser(
    userDto: Dto['CreateUserDtoMapper'],
    em?: EntityManager
  ): Promise<Dto['UserDtoMapper']> {
    const user =
      await this.#dtoMappers.CreateUserDtoMapper.deserializeDtoToEntity(
        userDto,
        this.passwordEncryptionPublicKeyPath
      );
    ((await em) ?? this.em).transactional(async (em) => {
      await em.persist(user);
    });
    return this.#dtoMappers.UserDtoMapper.serializeEntityToDto(user);
  }

  async createBatchUsers(
    userDtos: Dto['CreateUserDtoMapper'][],
    em?: EntityManager
  ): Promise<Dto['UserDtoMapper'][]> {
    const users = await Promise.all(
      userDtos.map(async (createUserDto) =>
        this.#dtoMappers.CreateUserDtoMapper.deserializeDtoToEntity(
          createUserDto,
          this.passwordEncryptionPublicKeyPath
        )
      )
    );
    await (em ?? this.em).transactional(async (em) => {
      await em.persist(users);
    });

    return users.map((user) =>
      this.#dtoMappers.UserDtoMapper.serializeEntityToDto(user)
    );
  }

  async getUser(
    idDto: IdDto,
    em?: EntityManager
  ): Promise<Dto['UserDtoMapper']> {
    const user = await (em ?? this.em).findOneOrFail('User', idDto, {
      populate: ['id', '*']
    });
    return this.#dtoMappers.UserDtoMapper.serializeEntityToDto(
      user as Entities['UserDtoMapper']
    );
  }

  async getBatchUsers(
    idsDto: IdsDto,
    em?: EntityManager
  ): Promise<Dto['UserDtoMapper'][]> {
    return (
      await (em ?? this.em).find('User', idsDto, {
        populate: ['id', '*']
      })
    ).map((user) =>
      this.#dtoMappers.UserDtoMapper.serializeEntityToDto(
        user as Entities['UserDtoMapper']
      )
    );
  }

  async updateUser(
    userDto: Dto['UpdateUserDtoMapper'],
    em?: EntityManager
  ): Promise<Dto['UserDtoMapper']> {
    let user = this.#dtoMappers.UpdateUserDtoMapper.deserializeDtoToEntity(
      userDto,
      this.passwordEncryptionPublicKeyPath
    );
    await (em ?? this.em).transactional(async (localEm) => {
      user = await localEm.upsert(user);
    });
    return this.#dtoMappers.UserDtoMapper.serializeEntityToDto(user);
  }

  async updateBatchUsers(
    userDtos: UpdateUserDto[],
    em?: EntityManager
  ): Promise<Dto['UserDtoMapper'][]> {
    let users = await Promise.all(
      userDtos.map(async (updateUserDto) =>
        this.#dtoMappers.UpdateUserDtoMapper.deserializeDtoToEntity(
          updateUserDto,
          this.passwordEncryptionPublicKeyPath
        )
      )
    );
    await (em ?? this.em).transactional(async (localEm) => {
      users = await localEm.upsertMany(users);
    });
    return users.map((user) =>
      this.#dtoMappers.UserDtoMapper.serializeEntityToDto(user)
    );
  }

  async deleteUser(idDto: IdDto, em?: EntityManager): Promise<void> {
    const entityManager = em || this.em;
    await entityManager.nativeDelete('User', idDto);
  }

  async deleteBatchUsers(idsDto: IdsDto, em?: EntityManager): Promise<void> {
    const entityManager = em || this.em;
    await entityManager.nativeDelete('User', idsDto);
  }

  async verifyHasRole(idDto: IdDto, roleId: string): Promise<void> {
    const user = await this.getUser(idDto);
    if (
      user.roles.filter((role) => {
        return roleId == role.id;
      }).length === 0
    ) {
      throw new Error(`User ${idDto.id} does not have role ${roleId}`);
    }
  }

  async verifyHasPermission(
    idDto: IdDto,
    permissionIdDto: IdDto
  ): Promise<void> {
    const user = await this.getUser(idDto);
    if (
      user.roles
        .map((role) => role.permissions.map((permission) => permission.id))
        .flat()
        .filter((id) => id == permissionIdDto.id).length === 0
    ) {
      throw new Error(
        `User ${idDto.id} does not have permission ${permissionIdDto.id}`
      );
    }
  }
}
