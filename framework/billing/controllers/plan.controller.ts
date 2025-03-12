import { Controller } from '@forklaunch/core/controllers';
import { OpenTelemetryCollector } from '@forklaunch/core/http';
import { ScopedDependencyFactory } from '@forklaunch/core/services';
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
} from '@forklaunch/framework-core';
import { Metrics } from '@forklaunch/framework-monitoring';
import { configValidator } from '../bootstrapper';
import { PlanService } from '../interfaces/plan.service.interface';
import {
  CreatePlanDtoMapper,
  PlanDtoMapper,
  UpdatePlanDtoMapper
} from '../models/dtoMapper/plan.dtoMapper';

export class PlanController
  implements Controller<PlanService, Request, Response, NextFunction, ParsedQs>
{
  constructor(
    private readonly serviceFactory: ScopedDependencyFactory<
      SchemaValidator,
      typeof configValidator,
      'planService'
    >,
    private readonly openTelemetryCollector: OpenTelemetryCollector<Metrics>
  ) {}

  createPlan = handlers.post(
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
      res.status(200).json(await this.serviceFactory().getPlan(req.params.id));
    }
  );

  updatePlan = handlers.put(
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
      await this.serviceFactory().deletePlan(req.params.id);
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
      res.status(200).json(await this.serviceFactory().listPlans());
    }
  );
}
