import {
  BaseDtoParameters,
  IdsDtoSchema,
  SchemaValidator
} from '@forklaunch/blueprint-core';
import { Metrics } from '@forklaunch/blueprint-monitoring';
import { OpenTelemetryCollector } from '@forklaunch/core/http';
import { EntityManager } from '@mikro-orm/core';
import {
  BasePlanServiceParameters,
  PlanService
} from '../interfaces/plan.service.interface';
import {
  CreatePlanDto,
  CreatePlanDtoMapper,
  PlanDto,
  PlanDtoMapper,
  UpdatePlanDto,
  UpdatePlanDtoMapper
} from '../models/dtoMapper/plan.dtoMapper';
import { Plan } from '../models/persistence/plan.entity';

export class BasePlanService
  implements PlanService<BaseDtoParameters<typeof BasePlanServiceParameters>>
{
  SchemaDefinition = BasePlanServiceParameters;

  constructor(
    private em: EntityManager,
    private readonly openTelemetryCollector: OpenTelemetryCollector<Metrics>
  ) {}

  async listPlans(
    idsDto?: IdsDtoSchema,
    em?: EntityManager
  ): Promise<PlanDto[]> {
    return await (em ?? this.em).getRepository(Plan).findAll({
      filters: idsDto?.ids ? { id: { $in: idsDto.ids } } : undefined
    });
  }

  async createPlan(
    planDto: CreatePlanDto,
    em?: EntityManager
  ): Promise<PlanDto> {
    const plan = CreatePlanDtoMapper.deserializeDtoToEntity(
      SchemaValidator(),
      planDto
    );
    await (em ?? this.em).transactional(async (innerEm) => {
      await innerEm.persist(plan);
    });
    return plan;
  }

  async getPlan(idDto: { id: string }, em?: EntityManager): Promise<PlanDto> {
    return await (em ?? this.em).findOneOrFail(Plan, idDto);
  }

  async updatePlan(
    planDto: UpdatePlanDto,
    em?: EntityManager
  ): Promise<PlanDto> {
    const plan = UpdatePlanDtoMapper.deserializeDtoToEntity(
      SchemaValidator(),
      planDto
    );
    const updatedPlan = await (em ?? this.em).upsert(plan);
    await (em ?? this.em).transactional(async (innerEm) => {
      await innerEm.persist(plan);
    });
    const updatedPlanDto = PlanDtoMapper.serializeEntityToDto(
      SchemaValidator(),
      updatedPlan
    );
    return updatedPlanDto;
  }

  async deletePlan(idDto: { id: string }, em?: EntityManager): Promise<void> {
    await (em ?? this.em).nativeDelete(Plan, idDto);
  }
}
