import {
  OrganizationService,
  RoleService,
  UserService
} from '@forklaunch/interfaces-iam/interfaces';

import { IdDto, IdsDto } from '@forklaunch/common';
import {
  evaluateTelemetryOptions,
  MetricsDefinition,
  OpenTelemetryCollector,
  TelemetryOptions
} from '@forklaunch/core/http';
import { CreateUserDto, UpdateUserDto } from '@forklaunch/interfaces-iam/types';
import { AnySchemaValidator } from '@forklaunch/validator';
import { EntityManager } from '@mikro-orm/core';
import { UserDtos } from '../domain/types/iamDto.types';
import { UserEntities } from '../domain/types/iamEntities.types';
import { UserMappers } from '../domain/types/user.mapper.types';

export class BaseUserService<
  SchemaValidator extends AnySchemaValidator,
  OrganizationStatus = unknown,
  MapperEntities extends UserEntities = UserEntities,
  MapperDomains extends UserDtos = UserDtos
> implements UserService
{
  private evaluatedTelemetryOptions: {
    logging?: boolean;
    metrics?: boolean;
    tracing?: boolean;
  };
  public em: EntityManager;
  protected passwordEncryptionPublicKeyPath: string;
  protected roleServiceFactory: () => RoleService;
  protected organizationServiceFactory: () => OrganizationService<OrganizationStatus>;
  protected openTelemetryCollector: OpenTelemetryCollector<MetricsDefinition>;
  protected schemaValidator: SchemaValidator;
  protected mappers: UserMappers<MapperEntities, MapperDomains>;

  constructor(
    em: EntityManager,
    passwordEncryptionPublicKeyPath: string,
    roleServiceFactory: () => RoleService,
    organizationServiceFactory: () => OrganizationService<OrganizationStatus>,
    openTelemetryCollector: OpenTelemetryCollector<MetricsDefinition>,
    schemaValidator: SchemaValidator,
    mappers: UserMappers<MapperEntities, MapperDomains>,
    options?: {
      telemetry?: TelemetryOptions;
    }
  ) {
    this.em = em;
    this.passwordEncryptionPublicKeyPath = passwordEncryptionPublicKeyPath;
    this.roleServiceFactory = roleServiceFactory;
    this.organizationServiceFactory = organizationServiceFactory;
    this.openTelemetryCollector = openTelemetryCollector;
    this.schemaValidator = schemaValidator;
    this.mappers = mappers;
    this.evaluatedTelemetryOptions = options?.telemetry
      ? evaluateTelemetryOptions(options.telemetry).enabled
      : {
          logging: false,
          metrics: false,
          tracing: false
        };
  }

  async createUser(
    userDto: CreateUserDto,
    em?: EntityManager,
    ...args: unknown[]
  ): Promise<MapperDomains['UserMapper']> {
    if (this.evaluatedTelemetryOptions.logging) {
      this.openTelemetryCollector.info('Creating user', userDto);
    }

    const user = await this.mappers.CreateUserMapper.toEntity(
      userDto,
      em ?? this.em,
      ...args
    );

    if (em) {
      await em.persist(user);
    } else {
      await this.em.persistAndFlush(user);
    }

    return this.mappers.UserMapper.toDto(user);
  }

  async createBatchUsers(
    userDtos: CreateUserDto[],
    em?: EntityManager,
    ...args: unknown[]
  ): Promise<MapperDomains['UserMapper'][]> {
    if (this.evaluatedTelemetryOptions.logging) {
      this.openTelemetryCollector.info('Creating batch users', userDtos);
    }

    const users = await Promise.all(
      userDtos.map(async (createUserDto) =>
        this.mappers.CreateUserMapper.toEntity(
          createUserDto,
          em ?? this.em,
          ...args
        )
      )
    );

    if (em) {
      await em.persist(users);
    } else {
      await this.em.persistAndFlush(users);
    }

    return Promise.all(
      users.map((user) => this.mappers.UserMapper.toDto(user))
    );
  }

  async getUser(
    idDto: IdDto,
    em?: EntityManager
  ): Promise<MapperDomains['UserMapper']> {
    if (this.evaluatedTelemetryOptions.logging) {
      this.openTelemetryCollector.info('Getting user', idDto);
    }

    const user = await (em ?? this.em).findOneOrFail('User', idDto, {
      populate: ['id', '*']
    });

    return this.mappers.UserMapper.toDto(user as MapperEntities['UserMapper']);
  }

  async getBatchUsers(
    idsDto: IdsDto,
    em?: EntityManager
  ): Promise<MapperDomains['UserMapper'][]> {
    if (this.evaluatedTelemetryOptions.logging) {
      this.openTelemetryCollector.info('Getting batch users', idsDto);
    }

    return Promise.all(
      (
        await (em ?? this.em).find('User', idsDto, {
          populate: ['id', '*']
        })
      ).map((user) =>
        this.mappers.UserMapper.toDto(user as MapperEntities['UserMapper'])
      )
    );
  }

  async updateUser(
    userDto: UpdateUserDto,
    em?: EntityManager,
    ...args: unknown[]
  ): Promise<MapperDomains['UserMapper']> {
    if (this.evaluatedTelemetryOptions.logging) {
      this.openTelemetryCollector.info('Updating user', userDto);
    }

    const user = await this.mappers.UpdateUserMapper.toEntity(
      userDto,
      em ?? this.em,
      ...args
    );

    if (em) {
      await em.persist(user);
    } else {
      await this.em.persistAndFlush(user);
    }

    return this.mappers.UserMapper.toDto(user);
  }

  async updateBatchUsers(
    userDtos: UpdateUserDto[],
    em?: EntityManager,
    ...args: unknown[]
  ): Promise<MapperDomains['UserMapper'][]> {
    if (this.evaluatedTelemetryOptions.logging) {
      this.openTelemetryCollector.info('Updating batch users', userDtos);
    }

    const users = await Promise.all(
      userDtos.map(async (updateUserDto) =>
        this.mappers.UpdateUserMapper.toEntity(
          updateUserDto,
          em ?? this.em,
          ...args
        )
      )
    );

    if (em) {
      await em.persist(users);
    } else {
      await this.em.persistAndFlush(users);
    }

    return Promise.all(
      users.map((user) => this.mappers.UserMapper.toDto(user))
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
