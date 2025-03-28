import {
  array,
  handlers,
  NextFunction,
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
import { ServiceDependencies, ServiceSchemas } from '../dependencies';
import { PlanService } from '../interfaces/plan.service.interface';

export const PlanController = (
  serviceFactory: ScopedDependencyFactory<
    SchemaValidator,
    ServiceDependencies,
    'PlanService'
  >,
  schemaRegistry: ServiceSchemas['PlanService'],
  openTelemetryCollector: OpenTelemetryCollector<Metrics>
) =>
  ({
    createPlan: handlers.post(
      SchemaValidator(),
      '/',
      {
        name: 'createPlan',
        summary: 'Create a plan',
        body: schemaRegistry.CreatePlanDto,
        responses: {
          200: schemaRegistry.PlanDto
        }
      },
      async (req, res) => {
        res.status(200).json(await serviceFactory().createPlan(req.body));
      }
    ),

    getPlan: handlers.get(
      SchemaValidator(),
      '/:id',
      {
        name: 'getPlan',
        summary: 'Get a plan',
        params: schemaRegistry.IdDto,
        responses: {
          200: schemaRegistry.PlanDto
        }
      },
      async (req, res) => {
        res.status(200).json(await serviceFactory().getPlan(req.params));
      }
    ),

    updatePlan: handlers.put(
      SchemaValidator(),
      '/',
      {
        name: 'updatePlan',
        summary: 'Update a plan',
        body: schemaRegistry.UpdatePlanDto,
        responses: {
          200: schemaRegistry.PlanDto
        }
      },
      async (req, res) => {
        res.status(200).json(await serviceFactory().updatePlan(req.body));
      }
    ),

    deletePlan: handlers.delete(
      SchemaValidator(),
      '/:id',
      {
        name: 'deletePlan',
        summary: 'Delete a plan',
        params: schemaRegistry.IdDto,
        responses: {
          200: string
        }
      },
      async (req, res) => {
        await serviceFactory().deletePlan(req.params);
        res.status(200).json(`Deleted plan ${req.params.id}`);
      }
    ),

    listPlans: handlers.get(
      SchemaValidator(),
      '/',
      {
        name: 'listPlans',
        summary: 'List plans',
        query: schemaRegistry.IdsDto,
        responses: {
          200: array(schemaRegistry.PlanDto)
        }
      },
      async (req, res) => {
        res.status(200).json(await serviceFactory().listPlans(req.query));
      }
    )
  }) satisfies Controller<
    PlanService,
    Request,
    Response,
    NextFunction,
    ParsedQs
  >;
