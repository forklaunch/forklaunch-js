import {
  array,
  handlers,
  IdSchema,
  IdsSchema,
  SchemaValidator,
  string
} from '@forklaunch/blueprint-core';
import { Metrics } from '@forklaunch/blueprint-monitoring';
import { Controller } from '@forklaunch/core/controllers';
import { OpenTelemetryCollector } from '@forklaunch/core/http';
import { PlanService } from '@forklaunch/interfaces-billing/interfaces';
import { BillingProviderEnum } from '../../domain/enum/billingProvider.enum';
import { CurrencyEnum } from '../../domain/enum/currency.enum';
import { PlanCadenceEnum } from '../../domain/enum/planCadence.enum';
import {
  CreatePlanMapper,
  PlanMapper,
  UpdatePlanMapper
} from '../../domain/mappers/plan.mappers';
import { PlanSchemas } from '../../registrations';
import { PlanServiceFactory } from '../routes/plan.routes';

export const PlanController = (
  serviceFactory: PlanServiceFactory,
  openTelemetryCollector: OpenTelemetryCollector<Metrics>
) =>
  ({
    createPlan: handlers.post(
      SchemaValidator(),
      '/',
      {
        name: 'createPlan',
        summary: 'Create a plan',
        body: CreatePlanMapper.schema(),
        responses: {
          200: PlanMapper.schema()
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
          200: PlanSchemas.PlanSchema(
            PlanCadenceEnum,
            CurrencyEnum,
            BillingProviderEnum
          )
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
        body: UpdatePlanMapper.schema(),
        responses: {
          200: PlanMapper.schema()
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
        res.status(200).send(`Deleted plan ${req.params.id}`);
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
            PlanSchemas.PlanSchema(
              PlanCadenceEnum,
              CurrencyEnum,
              BillingProviderEnum
            )
          )
        }
      },
      async (req, res) => {
        openTelemetryCollector.debug('Listing plans', req.query);
        res.status(200).json(await serviceFactory().listPlans(req.query));
      }
    )
  }) satisfies Controller<
    PlanService<
      typeof PlanCadenceEnum,
      typeof CurrencyEnum,
      typeof BillingProviderEnum
    >
  >;
