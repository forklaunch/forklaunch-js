import {
  handlers,
  IdSchema,
  schemaValidator,
  string
} from '@forklaunch/blueprint-core';
import { Metrics } from '@forklaunch/blueprint-monitoring';
import { Controller } from '@forklaunch/core/controllers';
import { OpenTelemetryCollector } from '@forklaunch/core/http';
import { BillingPortalService } from '@forklaunch/interfaces-billing/interfaces';
import {
  BillingPortalMapper,
  CreateBillingPortalMapper,
  UpdateBillingPortalMapper
} from '../../domain/mappers/billingPortal.mappers';
import { BillingPortalServiceFactory } from '../routes/billingPortal.routes';

export const BillingPortalController = (
  serviceFactory: BillingPortalServiceFactory,
  openTelemetryCollector: OpenTelemetryCollector<Metrics>
) =>
  ({
    createBillingPortalSession: handlers.post(
      schemaValidator,
      '/',
      {
        name: 'createBillingPortalSession',
        summary: 'Create a billing portal session',
        body: CreateBillingPortalMapper.schema(),
        responses: {
          200: BillingPortalMapper.schema()
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
      schemaValidator,
      '/:id',
      {
        name: 'getBillingPortalSession',
        summary: 'Get a billing portal session',
        params: IdSchema,
        responses: {
          200: BillingPortalMapper.schema()
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
      schemaValidator,
      '/:id',
      {
        name: 'updateBillingPortalSession',
        summary: 'Update a billing portal session',
        params: IdSchema,
        body: UpdateBillingPortalMapper.schema(),
        responses: {
          200: BillingPortalMapper.schema()
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
      schemaValidator,
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
  }) satisfies Controller<BillingPortalService>;
