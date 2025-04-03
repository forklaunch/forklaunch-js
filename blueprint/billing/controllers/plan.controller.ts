import { PlanService } from '@forklaunch/interfaces-billing';
import {
  array,
  handlers,
  IdSchema,
  IdsSchema,
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
import {
  CreatePlanDtoMapper,
  PlanDtoMapper,
  UpdatePlanDtoMapper
} from '../models/dtoMapper/plan.dtoMapper';
import { BillingProviderEnum } from '../models/enum/billingProvider.enum';
import { PlanCadenceEnum } from '../models/enum/planCadence.enum';
import { PlanSchemas, ServiceDependencies } from '../registrations';

export const PlanController = (
  serviceFactory: ScopedDependencyFactory<
    SchemaValidator,
    ServiceDependencies,
    'PlanService'
  >,
  openTelemetryCollector: OpenTelemetryCollector<Metrics>
) =>
  ({
    createPlan: handlers.post(
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
        openTelemetryCollector.debug('Creating plan', req.body);
        res.status(200).json(await serviceFactory().createPlan(req.body));
      }
    ),

    getPlan: handlers.get(
      SchemaValidator(),
      '/:id',
      {
        name: 'getPlan',
        summary: 'Get a plan',
        params: IdSchema,
        responses: {
          200: PlanSchemas.PlanSchema(PlanCadenceEnum, BillingProviderEnum)
        }
      },
      async (req, res) => {
        openTelemetryCollector.debug('Retrieving plan', req.params);
        res.status(200).json(await serviceFactory().getPlan(req.params));
      }
    ),

    updatePlan: handlers.put(
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
        openTelemetryCollector.debug('Updating plan', req.body);
        res.status(200).json(await serviceFactory().updatePlan(req.body));
      }
    ),

    deletePlan: handlers.delete(
      SchemaValidator(),
      '/:id',
      {
        name: 'deletePlan',
        summary: 'Delete a plan',
        params: IdSchema,
        responses: {
          200: string
        }
      },
      async (req, res) => {
        openTelemetryCollector.debug('Deleting plan', req.params);
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
        query: IdsSchema,
        responses: {
          200: array(
            PlanSchemas.PlanSchema(PlanCadenceEnum, BillingProviderEnum)
          )
        }
      },
      async (req, res) => {
        openTelemetryCollector.debug('Listing plans', req.query);
        res.status(200).json(await serviceFactory().listPlans(req.query));
      }
    )
  }) satisfies Controller<
    PlanService<typeof PlanCadenceEnum, typeof BillingProviderEnum>,
    Request,
    Response,
    NextFunction,
    ParsedQs
  >;
