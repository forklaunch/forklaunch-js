import { BillingPortalService } from '@forklaunch/interfaces-billing';
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
import {
  BillingPortalDtoMapper,
  CreateBillingPortalDtoMapper,
  UpdateBillingPortalDtoMapper
} from '../models/dtoMapper/billingPortal.dtoMapper';
import { SchemaDependencies } from '../registrations';

export const BillingPortalController = (
  serviceFactory: ScopedDependencyFactory<
    SchemaValidator,
    SchemaDependencies,
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
        body: CreateBillingPortalDtoMapper.schema(),
        responses: {
          200: BillingPortalDtoMapper.schema()
        }
      },
      async (req, res) => {
        openTelemetryCollector.debug(
          'Creating billing portal session',
          req.body
        );
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
          200: BillingPortalDtoMapper.schema()
        }
      },
      async (req, res) => {
        openTelemetryCollector.debug(
          'Retrieving billing portal session',
          req.params
        );
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
        body: UpdateBillingPortalDtoMapper.schema(),
        responses: {
          200: BillingPortalDtoMapper.schema()
        }
      },
      async (req, res) => {
        openTelemetryCollector.debug('Updating billing portal session', {
          ...req.params,
          ...req.body
        });
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
        openTelemetryCollector.debug(
          'Expiring billing portal session',
          req.params
        );
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
