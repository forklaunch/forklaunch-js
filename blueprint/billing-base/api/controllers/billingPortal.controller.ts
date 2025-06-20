import {
  handlers,
  IdSchema,
  SchemaValidator,
  string
} from '@forklaunch/blueprint-core';
import { Metrics } from '@forklaunch/blueprint-monitoring';
import { Controller } from '@forklaunch/core/controllers';
import { OpenTelemetryCollector } from '@forklaunch/core/http';
import { ScopedDependencyFactory } from '@forklaunch/core/services';
import { BillingPortalService } from '@forklaunch/interfaces-billing/interfaces';
import {
  BillingPortalMapper,
  CreateBillingPortalMapper,
  UpdateBillingPortalMapper
} from '../../domain/mappers/billingPortal.mappers';
import { SchemaDependencies } from '../../registrations';

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
      SchemaValidator(),
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
      SchemaValidator(),
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
  }) satisfies Controller<BillingPortalService>;
