import {
  CreatePlanDto,
  PlanDto,
  PlanService,
  PlanServiceParameters,
  UpdatePlanDto
} from '@forklaunch/blueprint-billing-interfaces';
import { IdDto, IdsDto, ReturnTypeRecord } from '@forklaunch/common';
import {
  InternalDtoMapper,
  transformIntoInternalDtoMapper
} from '@forklaunch/core/dtoMapper';
import {
  MetricsDefinition,
  OpenTelemetryCollector
} from '@forklaunch/core/http';
import { EntityManager } from '@mikro-orm/core';

export class BasePlanService<
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
  SchemaDefinition!: PlanServiceParameters<
    PlanCadenceEnum,
    BillingProviderEnum
  >;
  #dtoMappers: InternalDtoMapper<
    ReturnTypeRecord<typeof this.dtoMappers>,
    Entities,
    Dto
  >;

  constructor(
    private em: EntityManager,
    private readonly openTelemetryCollector: OpenTelemetryCollector<Metrics>,
    private readonly dtoMappers: {
      PlanDtoMapper: () => {
        dto: Dto['PlanDtoMapper'];
        _Entity: Entities['PlanDtoMapper'];
        serializeEntityToDto: unknown;
      };
      CreatePlanDtoMapper: () => {
        dto: Dto['CreatePlanDtoMapper'];
        _Entity: Entities['CreatePlanDtoMapper'];
        deserializeDtoToEntity: unknown;
      };
      UpdatePlanDtoMapper: () => {
        dto: Dto['UpdatePlanDtoMapper'];
        _Entity: Entities['UpdatePlanDtoMapper'];
        deserializeDtoToEntity: unknown;
      };
    }
  ) {
    this.#dtoMappers = transformIntoInternalDtoMapper(dtoMappers);
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
      this.#dtoMappers.PlanDtoMapper.serializeEntityToDto(
        plan as Entities['PlanDtoMapper']
      )
    );
  }

  async createPlan(
    planDto: Dto['CreatePlanDtoMapper'],
    em?: EntityManager
  ): Promise<Dto['PlanDtoMapper']> {
    const plan =
      this.#dtoMappers.CreatePlanDtoMapper.deserializeDtoToEntity(planDto);
    await (em ?? this.em).transactional(async (innerEm) => {
      await innerEm.persist(plan);
    });
    return this.#dtoMappers.PlanDtoMapper.serializeEntityToDto(plan);
  }

  async getPlan(
    idDto: IdDto,
    em?: EntityManager
  ): Promise<Dto['PlanDtoMapper']> {
    const plan = await (em ?? this.em).findOneOrFail('Plan', idDto);
    return this.#dtoMappers.PlanDtoMapper.serializeEntityToDto(
      plan as Entities['PlanDtoMapper']
    );
  }

  async updatePlan(
    planDto: Dto['UpdatePlanDtoMapper'],
    em?: EntityManager
  ): Promise<Dto['PlanDtoMapper']> {
    const plan =
      this.#dtoMappers.UpdatePlanDtoMapper.deserializeDtoToEntity(planDto);
    const updatedPlan = await (em ?? this.em).upsert(plan);
    await (em ?? this.em).transactional(async (innerEm) => {
      await innerEm.persist(plan);
    });
    const updatedPlanDto =
      this.#dtoMappers.PlanDtoMapper.serializeEntityToDto(updatedPlan);
    return updatedPlanDto;
  }

  async deletePlan(idDto: { id: string }, em?: EntityManager): Promise<void> {
    await (em ?? this.em).nativeDelete('Plan', idDto);
  }
}
