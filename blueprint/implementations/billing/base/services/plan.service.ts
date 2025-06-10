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
import { PlanService } from '@forklaunch/interfaces-billing/interfaces';
import {
  CreatePlanDto,
  PlanDto,
  UpdatePlanDto
} from '@forklaunch/interfaces-billing/types';
import { AnySchemaValidator } from '@forklaunch/validator';
import { EntityManager } from '@mikro-orm/core';

export class BasePlanService<
  SchemaValidator extends AnySchemaValidator,
  PlanCadenceEnum,
  BillingProviderEnum,
  Metrics extends MetricsDefinition = MetricsDefinition,
  Dto extends {
    PlanDtoMapper: PlanDto<PlanCadenceEnum, BillingProviderEnum>;
    CreatePlanDtoMapper: CreatePlanDto<PlanCadenceEnum, BillingProviderEnum>;
    UpdatePlanDtoMapper: UpdatePlanDto<PlanCadenceEnum, BillingProviderEnum>;
  } = {
    PlanDtoMapper: PlanDto<PlanCadenceEnum, BillingProviderEnum>;
    CreatePlanDtoMapper: CreatePlanDto<PlanCadenceEnum, BillingProviderEnum>;
    UpdatePlanDtoMapper: UpdatePlanDto<PlanCadenceEnum, BillingProviderEnum>;
  },
  Entities extends {
    PlanDtoMapper: PlanDto<PlanCadenceEnum, BillingProviderEnum>;
    CreatePlanDtoMapper: PlanDto<PlanCadenceEnum, BillingProviderEnum>;
    UpdatePlanDtoMapper: PlanDto<PlanCadenceEnum, BillingProviderEnum>;
  } = {
    PlanDtoMapper: PlanDto<PlanCadenceEnum, BillingProviderEnum>;
    CreatePlanDtoMapper: PlanDto<PlanCadenceEnum, BillingProviderEnum>;
    UpdatePlanDtoMapper: PlanDto<PlanCadenceEnum, BillingProviderEnum>;
  }
> implements PlanService<PlanCadenceEnum, BillingProviderEnum>
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
    private em: EntityManager,
    private readonly openTelemetryCollector: OpenTelemetryCollector<Metrics>,
    private readonly schemaValidator: SchemaValidator,
    private readonly mappers: {
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
    this.#mappers = transformIntoInternalDtoMapper(mappers, schemaValidator);
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
        this.#mappers.PlanDtoMapper.serializeEntityToDto(
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
    const plan = await this.#mappers.CreatePlanDtoMapper.deserializeDtoToEntity(
      planDto,
      em ?? this.em
    );
    await (em ?? this.em).transactional(async (innerEm) => {
      await innerEm.persist(plan);
    });
    return this.#mappers.PlanDtoMapper.serializeEntityToDto(plan);
  }

  async getPlan(
    idDto: IdDto,
    em?: EntityManager
  ): Promise<Dto['PlanDtoMapper']> {
    if (this.evaluatedTelemetryOptions.logging) {
      this.openTelemetryCollector.info('Getting plan', idDto);
    }
    const plan = await (em ?? this.em).findOneOrFail('Plan', idDto);
    return this.#mappers.PlanDtoMapper.serializeEntityToDto(
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
    const plan = await this.#mappers.UpdatePlanDtoMapper.deserializeDtoToEntity(
      planDto,
      em ?? this.em
    );
    const updatedPlan = await (em ?? this.em).upsert(plan);
    await (em ?? this.em).transactional(async (innerEm) => {
      await innerEm.persist(plan);
    });
    const updatedPlanDto =
      await this.#mappers.PlanDtoMapper.serializeEntityToDto(updatedPlan);
    return updatedPlanDto;
  }

  async deletePlan(idDto: { id: string }, em?: EntityManager): Promise<void> {
    if (this.evaluatedTelemetryOptions.logging) {
      this.openTelemetryCollector.info('Deleting plan', idDto);
    }
    await (em ?? this.em).nativeDelete('Plan', idDto);
  }
}
