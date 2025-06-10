import {
  OrganizationService,
  RoleService,
  UserService
} from '@forklaunch/interfaces-iam/interfaces';

import { IdDto, IdsDto, InstanceTypeRecord } from '@forklaunch/common';
import {
  evaluateTelemetryOptions,
  MetricsDefinition,
  OpenTelemetryCollector,
  TelemetryOptions
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
  private evaluatedTelemetryOptions: {
    logging?: boolean;
    metrics?: boolean;
    tracing?: boolean;
  };

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
        Entities['CreateUserDtoMapper']
      >;
      UpdateUserDtoMapper: RequestDtoMapperConstructor<
        SchemaValidator,
        Dto['UpdateUserDtoMapper'],
        Entities['UpdateUserDtoMapper']
      >;
    },
    readonly options?: {
      telemetry?: TelemetryOptions;
    }
  ) {
    this.#mappers = transformIntoInternalDtoMapper(mappers, schemaValidator);
    this.evaluatedTelemetryOptions = options?.telemetry
      ? evaluateTelemetryOptions(options.telemetry).enabled
      : {
          logging: false,
          metrics: false,
          tracing: false
        };
  }

  async createUser(
    userDto: Dto['CreateUserDtoMapper'],
    em?: EntityManager
  ): Promise<Dto['UserDtoMapper']> {
    if (this.evaluatedTelemetryOptions.logging) {
      this.openTelemetryCollector.info('Creating user', userDto);
    }

    const user = await this.#mappers.CreateUserDtoMapper.deserializeDtoToEntity(
      userDto,
      em ?? this.em
    );

    if (em) {
      await em.persist(user);
    } else {
      await this.em.persistAndFlush(user);
    }

    return this.#mappers.UserDtoMapper.serializeEntityToDto(user);
  }

  async createBatchUsers(
    userDtos: Dto['CreateUserDtoMapper'][],
    em?: EntityManager
  ): Promise<Dto['UserDtoMapper'][]> {
    if (this.evaluatedTelemetryOptions.logging) {
      this.openTelemetryCollector.info('Creating batch users', userDtos);
    }

    const users = await Promise.all(
      userDtos.map(async (createUserDto) =>
        this.#mappers.CreateUserDtoMapper.deserializeDtoToEntity(
          createUserDto,
          em ?? this.em
        )
      )
    );

    if (em) {
      await em.persist(users);
    } else {
      await this.em.persistAndFlush(users);
    }

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
    if (this.evaluatedTelemetryOptions.logging) {
      this.openTelemetryCollector.info('Getting user', idDto);
    }

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
    if (this.evaluatedTelemetryOptions.logging) {
      this.openTelemetryCollector.info('Getting batch users', idsDto);
    }

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
    if (this.evaluatedTelemetryOptions.logging) {
      this.openTelemetryCollector.info('Updating user', userDto);
    }

    const user = await this.#mappers.UpdateUserDtoMapper.deserializeDtoToEntity(
      userDto,
      em ?? this.em
    );

    if (em) {
      await em.persist(user);
    } else {
      await this.em.persistAndFlush(user);
    }

    return this.#mappers.UserDtoMapper.serializeEntityToDto(user);
  }

  async updateBatchUsers(
    userDtos: UpdateUserDto[],
    em?: EntityManager
  ): Promise<Dto['UserDtoMapper'][]> {
    if (this.evaluatedTelemetryOptions.logging) {
      this.openTelemetryCollector.info('Updating batch users', userDtos);
    }

    const users = await Promise.all(
      userDtos.map(async (updateUserDto) =>
        this.#mappers.UpdateUserDtoMapper.deserializeDtoToEntity(
          updateUserDto,
          em ?? this.em
        )
      )
    );

    if (em) {
      await em.persist(users);
    } else {
      await this.em.persistAndFlush(users);
    }

    return Promise.all(
      users.map((user) =>
        this.#mappers.UserDtoMapper.serializeEntityToDto(user)
      )
    );
  }

  async deleteUser(idDto: IdDto, em?: EntityManager): Promise<void> {
    if (this.evaluatedTelemetryOptions.logging) {
      this.openTelemetryCollector.info('Deleting user', idDto);
    }
    await (em ?? this.em).nativeDelete('User', idDto);
  }

  async deleteBatchUsers(idsDto: IdsDto, em?: EntityManager): Promise<void> {
    if (this.evaluatedTelemetryOptions.logging) {
      this.openTelemetryCollector.info('Deleting batch users', idsDto);
    }
    await (em ?? this.em).nativeDelete('User', idsDto);
  }

  async verifyHasRole(idDto: IdDto, roleId: string): Promise<void> {
    if (this.evaluatedTelemetryOptions.logging) {
      this.openTelemetryCollector.info('Verifying user has role', {
        idDto,
        roleId
      });
    }
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
    if (this.evaluatedTelemetryOptions.logging) {
      this.openTelemetryCollector.info('Verifying user has permission', {
        idDto,
        permissionId
      });
    }
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
