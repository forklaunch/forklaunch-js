import { BillingPortalService } from '@forklaunch/blueprint-billing-interfaces';
import {
  handlers,
  IdSchema,
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
import { BillingPortalSchemas, ServiceDependencies } from '../registrations';

export const BillingPortalController = (
  serviceFactory: ScopedDependencyFactory<
    SchemaValidator,
    ServiceDependencies,
    'BillingPortalService'
  >,
  openTelemetryCollector: OpenTelemetryCollector<Metrics>
) =>
  ({
    createBillingPortalSession: handlers.post(
      SchemaValidator(),
      '/',
      {
        name: 'createBillingPortalSession',
        summary: 'Create a billing portal session',
        body: BillingPortalSchemas.CreateBillingPortalSchema,
        responses: {
          200: BillingPortalSchemas.BillingPortalSchema
        }
      },
      async (req, res) => {
        res
          .status(200)
          .json(await serviceFactory().createBillingPortalSession(req.body));
      }
    ),

    getBillingPortalSession: handlers.get(
      SchemaValidator(),
      '/:id',
      {
        name: 'getBillingPortalSession',
        summary: 'Get a billing portal session',
        params: IdSchema,
        responses: {
          200: BillingPortalSchemas.BillingPortalSchema
        }
      },
      async (req, res) => {
        res
          .status(200)
          .json(await serviceFactory().getBillingPortalSession(req.params));
      }
    ),

    updateBillingPortalSession: handlers.put(
      SchemaValidator(),
      '/:id',
      {
        name: 'updateBillingPortalSession',
        summary: 'Update a billing portal session',
        params: IdSchema,
        body: BillingPortalSchemas.UpdateBillingPortalSchema,
        responses: {
          200: BillingPortalSchemas.BillingPortalSchema
        }
      },
      async (req, res) => {
        res.status(200).json(
          await serviceFactory().updateBillingPortalSession({
            ...req.params,
            ...req.body
          })
        );
      }
    ),

    expireBillingPortalSession: handlers.delete(
      SchemaValidator(),
      '/:id',
      {
        name: 'expireBillingPortalSession',
        summary: 'Expire a billing portal session',
        params: IdSchema,
        responses: {
          200: string
        }
      },
      async (req, res) => {
        await serviceFactory().expireBillingPortalSession(req.params);
        res.status(200).send(`Expired billing portal session ${req.params.id}`);
      }
    )
  }) satisfies Controller<
    BillingPortalService,
    Request,
    Response,
    NextFunction,
    ParsedQs
  >;
