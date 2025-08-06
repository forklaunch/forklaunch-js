import { IdDto, IdsDto, InstanceTypeRecord } from '@forklaunch/common';
import {
  evaluateTelemetryOptions,
  MetricsDefinition,
  OpenTelemetryCollector,
  TelemetryOptions
} from '@forklaunch/core/http';
import { PlanService } from '@forklaunch/interfaces-billing/interfaces';
import {
  InternalMapper,
  RequestMapperConstructor,
  ResponseMapperConstructor,
  transformIntoInternalMapper
} from '@forklaunch/internal';
import { AnySchemaValidator } from '@forklaunch/validator';
import { EntityManager } from '@mikro-orm/core';
import { BasePlanDtos } from '../domain/types/baseBillingDto.types';
import { BasePlanEntities } from '../domain/types/baseBillingEntity.types';

export class BasePlanService<
  SchemaValidator extends AnySchemaValidator,
  PlanCadenceEnum,
  CurrencyEnum,
  BillingProviderEnum,
  Entities extends BasePlanEntities<
    PlanCadenceEnum,
    CurrencyEnum,
    BillingProviderEnum
  >,
  Dto extends BasePlanDtos<
    PlanCadenceEnum,
    CurrencyEnum,
    BillingProviderEnum
  > = BasePlanDtos<PlanCadenceEnum, CurrencyEnum, BillingProviderEnum>
> implements PlanService<PlanCadenceEnum, CurrencyEnum, BillingProviderEnum>
{
  protected _mappers: InternalMapper<InstanceTypeRecord<typeof this.mappers>>;
  protected evaluatedTelemetryOptions: {
    logging?: boolean;
    metrics?: boolean;
    tracing?: boolean;
  };
  protected em: EntityManager;
  protected readonly openTelemetryCollector: OpenTelemetryCollector<MetricsDefinition>;
  protected readonly schemaValidator: SchemaValidator;
  protected readonly mappers: {
    PlanMapper: ResponseMapperConstructor<
      SchemaValidator,
      Dto['PlanMapper'],
      Entities['PlanMapper']
    >;
    CreatePlanMapper: RequestMapperConstructor<
      SchemaValidator,
      Dto['CreatePlanMapper'],
      Entities['CreatePlanMapper'],
      (
        dto: Dto['CreatePlanMapper'],
        em: EntityManager
      ) => Promise<Entities['CreatePlanMapper']>
    >;
    UpdatePlanMapper: RequestMapperConstructor<
      SchemaValidator,
      Dto['UpdatePlanMapper'],
      Entities['UpdatePlanMapper'],
      (
        dto: Dto['UpdatePlanMapper'],
        em: EntityManager
      ) => Promise<Entities['UpdatePlanMapper']>
    >;
  };

  constructor(
    em: EntityManager,
    openTelemetryCollector: OpenTelemetryCollector<MetricsDefinition>,
    schemaValidator: SchemaValidator,
    mappers: {
      PlanMapper: ResponseMapperConstructor<
        SchemaValidator,
        Dto['PlanMapper'],
        Entities['PlanMapper']
      >;
      CreatePlanMapper: RequestMapperConstructor<
        SchemaValidator,
        Dto['CreatePlanMapper'],
        Entities['CreatePlanMapper'],
        (
          dto: Dto['CreatePlanMapper'],
          em: EntityManager
        ) => Promise<Entities['CreatePlanMapper']>
      >;
      UpdatePlanMapper: RequestMapperConstructor<
        SchemaValidator,
        Dto['UpdatePlanMapper'],
        Entities['UpdatePlanMapper'],
        (
          dto: Dto['UpdatePlanMapper'],
          em: EntityManager
        ) => Promise<Entities['UpdatePlanMapper']>
      >;
    },
    readonly options?: {
      telemetry?: TelemetryOptions;
    }
  ) {
    this.em = em;
    this.openTelemetryCollector = openTelemetryCollector;
    this.schemaValidator = schemaValidator;
    this.mappers = mappers;
    this._mappers = transformIntoInternalMapper(mappers, schemaValidator);
    this.evaluatedTelemetryOptions = options?.telemetry
      ? evaluateTelemetryOptions(options.telemetry).enabled
      : {
          logging: false,
          metrics: false,
          tracing: false
        };
  }

  async listPlans(
    idsDto?: IdsDto,
    em?: EntityManager
  ): Promise<Dto['PlanMapper'][]> {
    if (this.evaluatedTelemetryOptions.logging) {
      this.openTelemetryCollector.info('Listing plans', idsDto);
    }
    return Promise.all(
      (
        await (em ?? this.em).findAll('Plan', {
          filters: idsDto?.ids ? { id: { $in: idsDto.ids } } : undefined
        })
      ).map((plan) =>
        this._mappers.PlanMapper.serializeEntityToDto(
          plan as Entities['PlanMapper']
        )
      )
    );
  }

  async createPlan(
    planDto: Dto['CreatePlanMapper'],
    em?: EntityManager
  ): Promise<Dto['PlanMapper']> {
    if (this.evaluatedTelemetryOptions.logging) {
      this.openTelemetryCollector.info('Creating plan', planDto);
    }
    const plan = await this._mappers.CreatePlanMapper.deserializeDtoToEntity(
      planDto,
      em ?? this.em
    );
    await (em ?? this.em).transactional(async (innerEm) => {
      await innerEm.persist(plan);
    });
    return this._mappers.PlanMapper.serializeEntityToDto(plan);
  }

  async getPlan(idDto: IdDto, em?: EntityManager): Promise<Dto['PlanMapper']> {
    if (this.evaluatedTelemetryOptions.logging) {
      this.openTelemetryCollector.info('Getting plan', idDto);
    }
    const plan = await (em ?? this.em).findOneOrFail('Plan', idDto);
    return this._mappers.PlanMapper.serializeEntityToDto(
      plan as Entities['PlanMapper']
    );
  }

  async updatePlan(
    planDto: Dto['UpdatePlanMapper'],
    em?: EntityManager
  ): Promise<Dto['PlanMapper']> {
    if (this.evaluatedTelemetryOptions.logging) {
      this.openTelemetryCollector.info('Updating plan', planDto);
    }
    const plan = await this._mappers.UpdatePlanMapper.deserializeDtoToEntity(
      planDto,
      em ?? this.em
    );
    const updatedPlan = await (em ?? this.em).upsert(plan);
    await (em ?? this.em).transactional(async (innerEm) => {
      await innerEm.persist(plan);
    });
    const updatedPlanDto =
      await this._mappers.PlanMapper.serializeEntityToDto(updatedPlan);
    return updatedPlanDto;
  }

  async deletePlan(idDto: { id: string }, em?: EntityManager): Promise<void> {
    if (this.evaluatedTelemetryOptions.logging) {
      this.openTelemetryCollector.info('Deleting plan', idDto);
    }
    await (em ?? this.em).nativeDelete('Plan', idDto);
  }
}
