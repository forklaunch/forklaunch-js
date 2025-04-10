import { IdDto, IdsDto, InstanceTypeRecord } from '@forklaunch/common';
import {
  InternalDtoMapper,
  RequestDtoMapperConstructor,
  ResponseDtoMapperConstructor,
  transformIntoInternalDtoMapper
} from '@forklaunch/core/mappers';
import {
  MetricsDefinition,
  OpenTelemetryCollector
} from '@forklaunch/core/http';
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
  #mapperss: InternalDtoMapper<
    InstanceTypeRecord<typeof this.mapperss>,
    Entities,
    Dto
  >;

  constructor(
    private em: EntityManager,
    private readonly openTelemetryCollector: OpenTelemetryCollector<Metrics>,
    private readonly schemaValidator: SchemaValidator,
    private readonly mapperss: {
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
    }
  ) {
    this.#mapperss = transformIntoInternalDtoMapper(mapperss, schemaValidator);
  }

  async listPlans(
    idsDto?: IdsDto,
    em?: EntityManager
  ): Promise<Dto['PlanDtoMapper'][]> {
    return (
      await (em ?? this.em).findAll('Plan', {
        filters: idsDto?.ids ? { id: { $in: idsDto.ids } } : undefined
      })
    ).map((plan) =>
      this.#mapperss.PlanDtoMapper.serializeEntityToDto(
        plan as Entities['PlanDtoMapper']
      )
    );
  }

  async createPlan(
    planDto: Dto['CreatePlanDtoMapper'],
    em?: EntityManager
  ): Promise<Dto['PlanDtoMapper']> {
    const plan =
      this.#mapperss.CreatePlanDtoMapper.deserializeDtoToEntity(planDto);
    await (em ?? this.em).transactional(async (innerEm) => {
      await innerEm.persist(plan);
    });
    return this.#mapperss.PlanDtoMapper.serializeEntityToDto(plan);
  }

  async getPlan(
    idDto: IdDto,
    em?: EntityManager
  ): Promise<Dto['PlanDtoMapper']> {
    const plan = await (em ?? this.em).findOneOrFail('Plan', idDto);
    return this.#mapperss.PlanDtoMapper.serializeEntityToDto(
      plan as Entities['PlanDtoMapper']
    );
  }

  async updatePlan(
    planDto: Dto['UpdatePlanDtoMapper'],
    em?: EntityManager
  ): Promise<Dto['PlanDtoMapper']> {
    const plan =
      this.#mapperss.UpdatePlanDtoMapper.deserializeDtoToEntity(planDto);
    const updatedPlan = await (em ?? this.em).upsert(plan);
    await (em ?? this.em).transactional(async (innerEm) => {
      await innerEm.persist(plan);
    });
    const updatedPlanDto =
      this.#mapperss.PlanDtoMapper.serializeEntityToDto(updatedPlan);
    return updatedPlanDto;
  }

  async deletePlan(idDto: { id: string }, em?: EntityManager): Promise<void> {
    await (em ?? this.em).nativeDelete('Plan', idDto);
  }
}
