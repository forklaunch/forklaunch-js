import {
  array,
  handlers,
  NextFunction,
  optional,
  ParsedQs,
  Request,
  Response,
  SchemaValidator,
  string
} from '@forklaunch/blueprint-core';
import { Metrics } from '@forklaunch/blueprint-monitoring';
import { Controller } from '@forklaunch/core/controllers';
import { OpenTelemetryCollector } from '@forklaunch/core/http';
import { ScopedDependencyFactory } from '@forklaunch/core/services';
import { PlanService } from '../interfaces/plan.service.interface';
import { PlanDtoMapper } from '../models/dtoMapper/plan.dtoMapper';
import {
  ConfigShapes,
  SchemaRegistrations,
  SchemaRegistry
} from '../registrations';

export class PlanController
  implements
    Controller<
      PlanService<SchemaRegistrations['Plan']>,
      Request,
      Response,
      NextFunction,
      ParsedQs
    >
{
  constructor(
    private readonly serviceFactory: ScopedDependencyFactory<
      SchemaValidator,
      ConfigShapes,
      'PlanService'
    >,
    private readonly openTelemetryCollector: OpenTelemetryCollector<Metrics>
  ) {}

  createPlan = handlers.post(
    SchemaValidator(),
    '/',
    {
      name: 'createPlan',
      summary: 'Create a plan',
      body: SchemaRegistry.Plan.CreatePlanDto,
      responses: {
        200: PlanDtoMapper.schema()
      }
    },
    async (req, res) => {
      res.status(200).json(await this.serviceFactory().createPlan(req.body));
    }
  );

  getPlan = handlers.get(
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
      res.status(200).json(await this.serviceFactory().getPlan(req.params));
    }
  );

  updatePlan = handlers.put(
    SchemaValidator(),
    '/',
    {
      name: 'updatePlan',
      summary: 'Update a plan',
      body: SchemaRegistry.Plan.UpdatePlanDto,
      responses: {
        200: PlanDtoMapper.schema()
      }
    },
    async (req, res) => {
      res.status(200).json(await this.serviceFactory().updatePlan(req.body));
    }
  );

  deletePlan = handlers.delete(
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
      await this.serviceFactory().deletePlan(req.params);
      res.status(200).json(`Deleted plan ${req.params.id}`);
    }
  );

  listPlans = handlers.get(
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
      res.status(200).json(await this.serviceFactory().listPlans(req.query));
    }
  );
}
