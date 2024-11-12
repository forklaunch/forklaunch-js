import { Controller } from '@forklaunch/core/controllers';
import { delete_, get, post, put } from '@forklaunch/core/http';
import {
  array,
  optional,
  SchemaValidator,
  string
} from '@forklaunch/framework-core';
import { PlanService } from '../interfaces/plan.service.interface';
import {
  CreatePlanDtoMapper,
  PlanDtoMapper,
  UpdatePlanDtoMapper
} from '../models/dtoMapper/plan.dtoMapper';

export const PlanController = <ConfigInjectorScope>(
  service: (scope?: ConfigInjectorScope) => PlanService
) => new InternalPlanController(service);
export type PlanController<ConfigInjectorScope> =
  InternalPlanController<ConfigInjectorScope>;

class InternalPlanController<ConfigInjectorScope>
  implements Controller<PlanService>
{
  constructor(
    private readonly service: (scope?: ConfigInjectorScope) => PlanService
  ) {}

  createPlan = post(
    SchemaValidator(),
    '/',
    {
      name: 'createPlan',
      summary: 'Create a plan',
      body: CreatePlanDtoMapper.schema(),
      responses: {
        200: PlanDtoMapper.schema()
      }
    },
    async (req, res) => {
      res.status(200).json(await this.service().createPlan(req.body));
    }
  );

  getPlan = get(
    SchemaValidator(),
    '/:id',
    {
      name: 'getPlan',
      summary: 'Get a plan',
      params: {
        id: string
      },
      responses: {
        200: PlanDtoMapper.schema()
      }
    },
    async (req, res) => {
      res.status(200).json(await this.service().getPlan(req.params.id));
    }
  );

  updatePlan = put(
    SchemaValidator(),
    '/',
    {
      name: 'updatePlan',
      summary: 'Update a plan',
      body: UpdatePlanDtoMapper.schema(),
      responses: {
        200: PlanDtoMapper.schema()
      }
    },
    async (req, res) => {
      res.status(200).json(await this.service().updatePlan(req.body));
    }
  );

  deletePlan = delete_(
    SchemaValidator(),
    '/:id',
    {
      name: 'deletePlan',
      summary: 'Delete a plan',
      params: {
        id: string
      },
      responses: {
        200: string
      }
    },
    async (req, res) => {
      await this.service().deletePlan(req.params.id);
      res.status(200).json(`Deleted plan ${req.params.id}`);
    }
  );

  listPlans = get(
    SchemaValidator(),
    '/',
    {
      name: 'listPlans',
      summary: 'List plans',
      query: {
        ids: optional(array(string))
      },
      responses: {
        200: array(PlanDtoMapper.schema())
      }
    },
    async (req, res) => {
      res.status(200).json(await this.service().listPlans());
    }
  );
}
