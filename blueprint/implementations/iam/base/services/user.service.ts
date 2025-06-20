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
import { UpdateUserDto } from '@forklaunch/interfaces-iam/types';
import {
  InternalMapper,
  RequestMapperConstructor,
  ResponseMapperConstructor,
  transformIntoInternalMapper
} from '@forklaunch/internal';
import { AnySchemaValidator } from '@forklaunch/validator';
import { EntityManager } from '@mikro-orm/core';
import { UserDtos } from '../domain/types/iamDto.types';
import { UserEntities } from '../domain/types/iamEntities.types';

export class BaseUserService<
  SchemaValidator extends AnySchemaValidator,
  OrganizationStatus,
  Entities extends UserEntities,
  Dto extends UserDtos = UserDtos
> implements UserService
{
  protected _mappers: InternalMapper<InstanceTypeRecord<typeof this.mappers>>;
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
    protected openTelemetryCollector: OpenTelemetryCollector<MetricsDefinition>,
    protected schemaValidator: SchemaValidator,
    protected mappers: {
      UserMapper: ResponseMapperConstructor<
        SchemaValidator,
        Dto['UserMapper'],
        Entities['UserMapper']
      >;
      CreateUserMapper: RequestMapperConstructor<
        SchemaValidator,
        Dto['CreateUserMapper'],
        Entities['CreateUserMapper'],
        (
          dto: Dto['CreateUserMapper'],
          em: EntityManager
        ) => Promise<Entities['CreateUserMapper']>
      >;
      UpdateUserMapper: RequestMapperConstructor<
        SchemaValidator,
        Dto['UpdateUserMapper'],
        Entities['UpdateUserMapper'],
        (
          dto: Dto['UpdateUserMapper'],
          em: EntityManager
        ) => Promise<Entities['UpdateUserMapper']>
      >;
    },
    readonly options?: {
      telemetry?: TelemetryOptions;
    }
  ) {
    this._mappers = transformIntoInternalMapper(mappers, schemaValidator);
    this.evaluatedTelemetryOptions = options?.telemetry
      ? evaluateTelemetryOptions(options.telemetry).enabled
      : {
          logging: false,
          metrics: false,
          tracing: false
        };
  }

  async createUser(
    userDto: Dto['CreateUserMapper'],
    em?: EntityManager
  ): Promise<Dto['UserMapper']> {
    if (this.evaluatedTelemetryOptions.logging) {
      this.openTelemetryCollector.info('Creating user', userDto);
    }

    const user = await this._mappers.CreateUserMapper.deserializeDtoToEntity(
      userDto,
      em ?? this.em
    );

    if (em) {
      await em.persist(user);
    } else {
      await this.em.persistAndFlush(user);
    }

    return this._mappers.UserMapper.serializeEntityToDto(user);
  }

  async createBatchUsers(
    userDtos: Dto['CreateUserMapper'][],
    em?: EntityManager
  ): Promise<Dto['UserMapper'][]> {
    if (this.evaluatedTelemetryOptions.logging) {
      this.openTelemetryCollector.info('Creating batch users', userDtos);
    }

    const users = await Promise.all(
      userDtos.map(async (createUserDto) =>
        this._mappers.CreateUserMapper.deserializeDtoToEntity(
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
      users.map((user) => this._mappers.UserMapper.serializeEntityToDto(user))
    );
  }

  async getUser(idDto: IdDto, em?: EntityManager): Promise<Dto['UserMapper']> {
    if (this.evaluatedTelemetryOptions.logging) {
      this.openTelemetryCollector.info('Getting user', idDto);
    }

    const user = await (em ?? this.em).findOneOrFail('User', idDto, {
      populate: ['id', '*']
    });

    return this._mappers.UserMapper.serializeEntityToDto(
      user as Entities['UserMapper']
    );
  }

  async getBatchUsers(
    idsDto: IdsDto,
    em?: EntityManager
  ): Promise<Dto['UserMapper'][]> {
    if (this.evaluatedTelemetryOptions.logging) {
      this.openTelemetryCollector.info('Getting batch users', idsDto);
    }

    return Promise.all(
      (
        await (em ?? this.em).find('User', idsDto, {
          populate: ['id', '*']
        })
      ).map((user) =>
        this._mappers.UserMapper.serializeEntityToDto(
          user as Entities['UserMapper']
        )
      )
    );
  }

  async updateUser(
    userDto: Dto['UpdateUserMapper'],
    em?: EntityManager
  ): Promise<Dto['UserMapper']> {
    if (this.evaluatedTelemetryOptions.logging) {
      this.openTelemetryCollector.info('Updating user', userDto);
    }

    const user = await this._mappers.UpdateUserMapper.deserializeDtoToEntity(
      userDto,
      em ?? this.em
    );

    if (em) {
      await em.persist(user);
    } else {
      await this.em.persistAndFlush(user);
    }

    return this._mappers.UserMapper.serializeEntityToDto(user);
  }

  async updateBatchUsers(
    userDtos: UpdateUserDto[],
    em?: EntityManager
  ): Promise<Dto['UserMapper'][]> {
    if (this.evaluatedTelemetryOptions.logging) {
      this.openTelemetryCollector.info('Updating batch users', userDtos);
    }

    const users = await Promise.all(
      userDtos.map(async (updateUserDto) =>
        this._mappers.UpdateUserMapper.deserializeDtoToEntity(
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
      users.map((user) => this._mappers.UserMapper.serializeEntityToDto(user))
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
