import { EntityManager } from '@mikro-orm/core';
import {
  CreatePlanDto,
  PlanDto,
  UpdatePlanDto
} from '../models/dtoMapper/plan.dtoMapper';

export interface PlanService {
  // This is for a single plan, store this in table
  createPlan: (planDto: CreatePlanDto, em?: EntityManager) => Promise<PlanDto>;
  getPlan: (id: string, em?: EntityManager) => Promise<PlanDto>;
  updatePlan: (planDto: UpdatePlanDto, em?: EntityManager) => Promise<PlanDto>;
  deletePlan: (id: string, em?: EntityManager) => Promise<void>;
  listPlans: (ids?: string[], em?: EntityManager) => Promise<PlanDto[]>;
}
