import {
  array,
  handlers,
  IdSchema,
  IdsSchema,
  schemaValidator,
  string
} from '@forklaunch/blueprint-core';
import { Metrics } from '@forklaunch/blueprint-monitoring';
import { Controller } from '@forklaunch/core/controllers';
import { OpenTelemetryCollector } from '@forklaunch/core/http';
import { SubscriptionService } from '@forklaunch/interfaces-billing/interfaces';
import { BillingProviderEnum } from '../../domain/enum/billingProvider.enum';
import { PartyEnum } from '../../domain/enum/party.enum';
import {
  CreateSubscriptionMapper,
  SubscriptionMapper,
  UpdateSubscriptionMapper
} from '../../domain/mappers/subscription.mappers';
import { SubscriptionServiceFactory } from '../routes/subscription.routes';

export const SubscriptionController = (
  serviceFactory: SubscriptionServiceFactory,
  openTelemetryCollector: OpenTelemetryCollector<Metrics>
) =>
  ({
    createSubscription: handlers.post(
      schemaValidator,
      '/',
      {
        name: 'createSubscription',
        summary: 'Create a subscription',
        body: CreateSubscriptionMapper.schema,
        responses: {
          200: SubscriptionMapper.schema
        }
      },
      async (req, res) => {
        openTelemetryCollector.debug('Creating subscription', req.body);
        res
          .status(200)
          .json(await serviceFactory().createSubscription(req.body));
      }
    ),

    getSubscription: handlers.get(
      schemaValidator,
      '/:id',
      {
        name: 'getSubscription',
        summary: 'Get a subscription',
        params: IdSchema,
        responses: {
          200: SubscriptionMapper.schema
        }
      },
      async (req, res) => {
        openTelemetryCollector.debug('Retrieving subscription', req.params);
        res
          .status(200)
          .json(await serviceFactory().getSubscription(req.params));
      }
    ),

    getUserSubscription: handlers.get(
      schemaValidator,
      '/user/:id',
      {
        name: 'getUserSubscription',
        summary: 'Get a user subscription',
        params: IdSchema,
        responses: {
          200: SubscriptionMapper.schema
        }
      },
      async (req, res) => {
        openTelemetryCollector.debug(
          'Retrieving user subscription',
          req.params
        );
        res
          .status(200)
          .json(await serviceFactory().getUserSubscription(req.params));
      }
    ),

    getOrganizationSubscription: handlers.get(
      schemaValidator,
      '/organization/:id',
      {
        name: 'getOrganizationSubscription',
        summary: 'Get an organization subscription',
        params: IdSchema,
        responses: {
          200: SubscriptionMapper.schema
        }
      },
      async (req, res) => {
        openTelemetryCollector.debug(
          'Retrieving organization subscription',
          req.params
        );
        res
          .status(200)
          .json(await serviceFactory().getOrganizationSubscription(req.params));
      }
    ),

    updateSubscription: handlers.put(
      schemaValidator,
      '/:id',
      {
        name: 'updateSubscription',
        summary: 'Update a subscription',
        params: IdSchema,
        body: UpdateSubscriptionMapper.schema,
        responses: {
          200: SubscriptionMapper.schema
        }
      },
      async (req, res) => {
        openTelemetryCollector.debug('Update subscription', req.body);
        res
          .status(200)
          .json(await serviceFactory().updateSubscription(req.body));
      }
    ),

    deleteSubscription: handlers.delete(
      schemaValidator,
      '/:id',
      {
        name: 'deleteSubscription',
        summary: 'Delete a subscription',
        params: IdSchema,
        responses: {
          200: string
        }
      },
      async (req, res) => {
        openTelemetryCollector.debug('Deleting subscription', req.params);
        await serviceFactory().deleteSubscription(req.params);
        res.status(200).send(`Deleted subscription ${req.params.id}`);
      }
    ),

    listSubscriptions: handlers.get(
      schemaValidator,
      '/',
      {
        name: 'listSubscriptions',
        summary: 'List subscriptions',
        query: IdsSchema,
        responses: {
          200: array(SubscriptionMapper.schema)
        }
      },
      async (req, res) => {
        openTelemetryCollector.debug('Listing subscriptions', req.query);
        res
          .status(200)
          .json(await serviceFactory().listSubscriptions(req.query));
      }
    ),

    cancelSubscription: handlers.get(
      schemaValidator,
      '/:id/cancel',
      {
        name: 'cancelSubscription',
        summary: 'Cancel a subscription',
        params: IdSchema,
        responses: {
          200: string
        }
      },
      async (req, res) => {
        openTelemetryCollector.debug('Cancelling subscription', req.params);
        await serviceFactory().cancelSubscription(req.params);
        res.status(200).send(`Cancelled subscription ${req.params.id}`);
      }
    ),

    resumeSubscription: handlers.get(
      schemaValidator,
      '/:id/resume',
      {
        name: 'resumeSubscription',
        summary: 'Resume a subscription',
        params: IdSchema,
        responses: {
          200: string
        }
      },
      async (req, res) => {
        openTelemetryCollector.debug('Resuming subscription', req.params);
        await serviceFactory().resumeSubscription(req.params);
        res.status(200).send(`Resumed subscription ${req.params.id}`);
      }
    )
  }) satisfies Controller<
    SubscriptionService<typeof PartyEnum, typeof BillingProviderEnum>
  >;
