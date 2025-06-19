import { IdDto, IdsDto, InstanceTypeRecord } from '@forklaunch/common';
import {
  evaluateTelemetryOptions,
  MetricsDefinition,
  OpenTelemetryCollector,
  TelemetryOptions
} from '@forklaunch/core/http';
import { PlanService } from '@forklaunch/interfaces-billing/interfaces';
import {
  CreatePlanDto,
  PlanDto,
  UpdatePlanDto
} from '@forklaunch/interfaces-billing/types';
import {
  InternalDtoMapper,
  RequestDtoMapperConstructor,
  ResponseDtoMapperConstructor,
  transformIntoInternalDtoMapper
} from '@forklaunch/internal';
import { AnySchemaValidator } from '@forklaunch/validator';
import { EntityManager } from '@mikro-orm/core';

export class BasePlanService<
  SchemaValidator extends AnySchemaValidator,
  PlanCadenceEnum,
  CurrencyEnum,
  BillingProviderEnum,
  Metrics extends MetricsDefinition = MetricsDefinition,
  Dto extends {
    PlanDtoMapper: PlanDto<PlanCadenceEnum, CurrencyEnum, BillingProviderEnum>;
    CreatePlanDtoMapper: CreatePlanDto<
      PlanCadenceEnum,
      CurrencyEnum,
      BillingProviderEnum
    >;
    UpdatePlanDtoMapper: UpdatePlanDto<
      PlanCadenceEnum,
      CurrencyEnum,
      BillingProviderEnum
    >;
  } = {
    PlanDtoMapper: PlanDto<PlanCadenceEnum, CurrencyEnum, BillingProviderEnum>;
    CreatePlanDtoMapper: CreatePlanDto<
      PlanCadenceEnum,
      CurrencyEnum,
      BillingProviderEnum
    >;
    UpdatePlanDtoMapper: UpdatePlanDto<
      PlanCadenceEnum,
      CurrencyEnum,
      BillingProviderEnum
    >;
  },
  Entities extends {
    PlanDtoMapper: PlanDto<PlanCadenceEnum, CurrencyEnum, BillingProviderEnum>;
    CreatePlanDtoMapper: PlanDto<
      PlanCadenceEnum,
      CurrencyEnum,
      BillingProviderEnum
    >;
    UpdatePlanDtoMapper: PlanDto<
      PlanCadenceEnum,
      CurrencyEnum,
      BillingProviderEnum
    >;
  } = {
    PlanDtoMapper: PlanDto<PlanCadenceEnum, CurrencyEnum, BillingProviderEnum>;
    CreatePlanDtoMapper: PlanDto<
      PlanCadenceEnum,
      CurrencyEnum,
      BillingProviderEnum
    >;
    UpdatePlanDtoMapper: PlanDto<
      PlanCadenceEnum,
      CurrencyEnum,
      BillingProviderEnum
    >;
  }
> implements PlanService<PlanCadenceEnum, CurrencyEnum, BillingProviderEnum>
{
  protected _mappers: InternalDtoMapper<
    InstanceTypeRecord<typeof this.mappers>
  >;
  protected evaluatedTelemetryOptions: {
    logging?: boolean;
    metrics?: boolean;
    tracing?: boolean;
  };

  constructor(
    protected em: EntityManager,
    protected readonly openTelemetryCollector: OpenTelemetryCollector<Metrics>,
    protected readonly schemaValidator: SchemaValidator,
    protected readonly mappers: {
      PlanDtoMapper: ResponseDtoMapperConstructor<
        SchemaValidator,
        Dto['PlanDtoMapper'],
        Entities['PlanDtoMapper']
      >;
      CreatePlanDtoMapper: RequestDtoMapperConstructor<
        SchemaValidator,
        Dto['CreatePlanDtoMapper'],
        Entities['CreatePlanDtoMapper']
      >;
      UpdatePlanDtoMapper: RequestDtoMapperConstructor<
        SchemaValidator,
        Dto['UpdatePlanDtoMapper'],
        Entities['UpdatePlanDtoMapper']
      >;
    },
    readonly options?: {
      telemetry?: TelemetryOptions;
    }
  ) {
    this._mappers = transformIntoInternalDtoMapper(mappers, schemaValidator);
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
  ): Promise<Dto['PlanDtoMapper'][]> {
    if (this.evaluatedTelemetryOptions.logging) {
      this.openTelemetryCollector.info('Listing plans', idsDto);
    }
    return Promise.all(
      (
        await (em ?? this.em).findAll('Plan', {
          filters: idsDto?.ids ? { id: { $in: idsDto.ids } } : undefined
        })
      ).map((plan) =>
        this._mappers.PlanDtoMapper.serializeEntityToDto(
          this.schemaValidator,
          plan as Entities['PlanDtoMapper']
        )
      )
    );
  }

  async createPlan(
    planDto: Dto['CreatePlanDtoMapper'],
    em?: EntityManager
  ): Promise<Dto['PlanDtoMapper']> {
    if (this.evaluatedTelemetryOptions.logging) {
      this.openTelemetryCollector.info('Creating plan', planDto);
    }
    const plan = await this._mappers.CreatePlanDtoMapper.deserializeDtoToEntity(
      this.schemaValidator,
      planDto,
      em ?? this.em
    );
    await (em ?? this.em).transactional(async (innerEm) => {
      await innerEm.persist(plan);
    });
    return this._mappers.PlanDtoMapper.serializeEntityToDto(
      this.schemaValidator,
      plan
    );
  }

  async getPlan(
    idDto: IdDto,
    em?: EntityManager
  ): Promise<Dto['PlanDtoMapper']> {
    if (this.evaluatedTelemetryOptions.logging) {
      this.openTelemetryCollector.info('Getting plan', idDto);
    }
    const plan = await (em ?? this.em).findOneOrFail('Plan', idDto);
    return this._mappers.PlanDtoMapper.serializeEntityToDto(
      this.schemaValidator,
      plan as Entities['PlanDtoMapper']
    );
  }

  async updatePlan(
    planDto: Dto['UpdatePlanDtoMapper'],
    em?: EntityManager
  ): Promise<Dto['PlanDtoMapper']> {
    if (this.evaluatedTelemetryOptions.logging) {
      this.openTelemetryCollector.info('Updating plan', planDto);
    }
    const plan = await this._mappers.UpdatePlanDtoMapper.deserializeDtoToEntity(
      this.schemaValidator,
      planDto,
      em ?? this.em
    );
    const updatedPlan = await (em ?? this.em).upsert(plan);
    await (em ?? this.em).transactional(async (innerEm) => {
      await innerEm.persist(plan);
    });
    const updatedPlanDto =
      await this._mappers.PlanDtoMapper.serializeEntityToDto(
        this.schemaValidator,
        updatedPlan
      );
    return updatedPlanDto;
  }

  async deletePlan(idDto: { id: string }, em?: EntityManager): Promise<void> {
    if (this.evaluatedTelemetryOptions.logging) {
      this.openTelemetryCollector.info('Deleting plan', idDto);
    }
    await (em ?? this.em).nativeDelete('Plan', idDto);
  }
}
