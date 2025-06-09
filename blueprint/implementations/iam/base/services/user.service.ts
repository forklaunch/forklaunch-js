import {
  OrganizationService,
  RoleService,
  UserService
} from '@forklaunch/interfaces-iam/interfaces';

import { IdDto, IdsDto, InstanceTypeRecord } from '@forklaunch/common';
import {
  MetricsDefinition,
  OpenTelemetryCollector
} from '@forklaunch/core/http';
import {
  InternalDtoMapper,
  RequestDtoMapperConstructor,
  ResponseDtoMapperConstructor,
  transformIntoInternalDtoMapper
} from '@forklaunch/core/mappers';
import { MapNestedDtoArraysToCollections } from '@forklaunch/core/services';
import {
  CreateUserDto,
  UpdateUserDto,
  UserDto
} from '@forklaunch/interfaces-iam/types';
import { AnySchemaValidator } from '@forklaunch/validator';
import { EntityManager } from '@mikro-orm/core';

export class BaseUserService<
  SchemaValidator extends AnySchemaValidator,
  OrganizationStatus,
  Metrics extends MetricsDefinition = MetricsDefinition,
  Dto extends {
    UserDtoMapper: UserDto;
    CreateUserDtoMapper: CreateUserDto;
    UpdateUserDtoMapper: UpdateUserDto;
  } = {
    UserDtoMapper: UserDto;
    CreateUserDtoMapper: CreateUserDto;
    UpdateUserDtoMapper: UpdateUserDto;
  },
  Entities extends {
    UserDtoMapper: MapNestedDtoArraysToCollections<UserDto, 'roles'>;
    CreateUserDtoMapper: MapNestedDtoArraysToCollections<UserDto, 'roles'>;
    UpdateUserDtoMapper: MapNestedDtoArraysToCollections<UserDto, 'roles'>;
  } = {
    UserDtoMapper: MapNestedDtoArraysToCollections<UserDto, 'roles'>;
    CreateUserDtoMapper: MapNestedDtoArraysToCollections<UserDto, 'roles'>;
    UpdateUserDtoMapper: MapNestedDtoArraysToCollections<UserDto, 'roles'>;
  }
> implements UserService
{
  #mappers: InternalDtoMapper<
    InstanceTypeRecord<typeof this.mappers>,
    Entities,
    Dto
  >;

  constructor(
    public em: EntityManager,
    protected passwordEncryptionPublicKeyPath: string,
    protected roleServiceFactory: () => RoleService,
    protected organizationServiceFactory: () => OrganizationService<OrganizationStatus>,
    protected openTelemetryCollector: OpenTelemetryCollector<Metrics>,
    protected schemaValidator: SchemaValidator,
    protected mappers: {
      UserDtoMapper: ResponseDtoMapperConstructor<
        SchemaValidator,
        Dto['UserDtoMapper'],
        Entities['UserDtoMapper']
      >;
      CreateUserDtoMapper: RequestDtoMapperConstructor<
        SchemaValidator,
        Dto['CreateUserDtoMapper'],
        Entities['CreateUserDtoMapper'],
        (
          dto: never,
          passwordEncryptionPublicKeyPath: string
        ) => Promise<Entities['UpdateUserDtoMapper']>
      >;
      UpdateUserDtoMapper: RequestDtoMapperConstructor<
        SchemaValidator,
        Dto['UpdateUserDtoMapper'],
        Entities['UpdateUserDtoMapper'],
        (
          dto: never,
          passwordEncryptionPublicKeyPath: string
        ) => Promise<Entities['UpdateUserDtoMapper']>
      >;
    }
  ) {
    this.#mappers = transformIntoInternalDtoMapper(mappers, schemaValidator);
  }

  async createUser(
    userDto: Dto['CreateUserDtoMapper'],
    em?: EntityManager
  ): Promise<Dto['UserDtoMapper']> {
    const user = await this.#mappers.CreateUserDtoMapper.deserializeDtoToEntity(
      userDto,
      this.passwordEncryptionPublicKeyPath
    );
    ((await em) ?? this.em).transactional(async (em) => {
      await em.persist(user);
    });
    return this.#mappers.UserDtoMapper.serializeEntityToDto(user);
  }

  async createBatchUsers(
    userDtos: Dto['CreateUserDtoMapper'][],
    em?: EntityManager
  ): Promise<Dto['UserDtoMapper'][]> {
    const users = await Promise.all(
      userDtos.map(async (createUserDto) =>
        this.#mappers.CreateUserDtoMapper.deserializeDtoToEntity(
          createUserDto,
          this.passwordEncryptionPublicKeyPath
        )
      )
    );
    await (em ?? this.em).transactional(async (em) => {
      await em.persist(users);
    });

    return Promise.all(
      users.map((user) =>
        this.#mappers.UserDtoMapper.serializeEntityToDto(user)
      )
    );
  }

  async getUser(
    idDto: IdDto,
    em?: EntityManager
  ): Promise<Dto['UserDtoMapper']> {
    const user = await (em ?? this.em).findOneOrFail('User', idDto, {
      populate: ['id', '*']
    });
    return this.#mappers.UserDtoMapper.serializeEntityToDto(
      user as Entities['UserDtoMapper']
    );
  }

  async getBatchUsers(
    idsDto: IdsDto,
    em?: EntityManager
  ): Promise<Dto['UserDtoMapper'][]> {
    return Promise.all(
      (
        await (em ?? this.em).find('User', idsDto, {
          populate: ['id', '*']
        })
      ).map((user) =>
        this.#mappers.UserDtoMapper.serializeEntityToDto(
          user as Entities['UserDtoMapper']
        )
      )
    );
  }

  async updateUser(
    userDto: Dto['UpdateUserDtoMapper'],
    em?: EntityManager
  ): Promise<Dto['UserDtoMapper']> {
    let user = await this.#mappers.UpdateUserDtoMapper.deserializeDtoToEntity(
      userDto,
      this.passwordEncryptionPublicKeyPath
    );
    await (em ?? this.em).transactional(async (localEm) => {
      user = await localEm.upsert(user);
    });
    return this.#mappers.UserDtoMapper.serializeEntityToDto(user);
  }

  async updateBatchUsers(
    userDtos: UpdateUserDto[],
    em?: EntityManager
  ): Promise<Dto['UserDtoMapper'][]> {
    let users = await Promise.all(
      userDtos.map(async (updateUserDto) =>
        this.#mappers.UpdateUserDtoMapper.deserializeDtoToEntity(
          updateUserDto,
          this.passwordEncryptionPublicKeyPath
        )
      )
    );
    await (em ?? this.em).transactional(async (localEm) => {
      users = await localEm.upsertMany(users);
    });
    return Promise.all(
      users.map((user) =>
        this.#mappers.UserDtoMapper.serializeEntityToDto(user)
      )
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

  async verifyHasPermission(idDto: IdDto, permissionId: string): Promise<void> {
    const user = await this.getUser(idDto);
    if (
      user.roles
        .map((role) => role.permissions.map((permission) => permission.id))
        .flat()
        .filter((id) => id == permissionId).length === 0
    ) {
      throw new Error(
        `User ${idDto.id} does not have permission ${permissionId}`
      );
    }
  }
}
