import { PlanService } from '@forklaunch/blueprint-billing-interfaces';
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
        body: PlanSchemas.CreatePlanSchema(
          PlanCadenceEnum,
          BillingProviderEnum
        ),
        responses: {
          200: PlanSchemas.PlanSchema(PlanCadenceEnum, BillingProviderEnum)
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
        params: IdSchema,
        responses: {
          200: PlanSchemas.PlanSchema(PlanCadenceEnum, BillingProviderEnum)
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
        body: PlanSchemas.UpdatePlanSchema(
          PlanCadenceEnum,
          BillingProviderEnum
        ),
        responses: {
          200: PlanSchemas.PlanSchema(PlanCadenceEnum, BillingProviderEnum)
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
        params: IdSchema,
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
        query: IdsSchema,
        responses: {
          200: array(
            PlanSchemas.PlanSchema(PlanCadenceEnum, BillingProviderEnum)
          )
        }
      },
      async (req, res) => {
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
