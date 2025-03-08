import { OpenTelemetryCollector } from '@forklaunch/core/http';
import { SchemaValidator } from '@forklaunch/framework-core';
import { Metrics } from '@forklaunch/framework-monitoring';
import { EntityManager } from '@mikro-orm/core';
import { PlanService } from '../interfaces/plan.service.interface';
import {
  CreatePlanDto,
  CreatePlanDtoMapper,
  PlanDto,
  PlanDtoMapper,
  UpdatePlanDto,
  UpdatePlanDtoMapper
} from '../models/dtoMapper/plan.dtoMapper';
import { Plan } from '../models/persistence/plan.entity';

export class BasePlanService implements PlanService {
  constructor(
    private em: EntityManager,
    private readonly openTelemetryCollector: OpenTelemetryCollector<Metrics>
  ) {}

  async listPlans(ids?: string[], em?: EntityManager): Promise<PlanDto[]> {
    return await (em ?? this.em).getRepository(Plan).findAll({
      filters: ids ? { id: { $in: ids } } : undefined
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

  async getPlan(id: string, em?: EntityManager): Promise<PlanDto> {
    return await (em ?? this.em).findOneOrFail(Plan, { id });
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

  async deletePlan(id: string, em?: EntityManager): Promise<void> {
    await (em ?? this.em).nativeDelete(Plan, { id });
  }
}
