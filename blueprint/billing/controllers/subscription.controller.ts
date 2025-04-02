import { SubscriptionService } from '@forklaunch/blueprint-billing-interfaces';
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
import { PartyEnum } from '../models/enum/party.enum';
import { ServiceDependencies, SubscriptionSchemas } from '../registrations';

export const SubscriptionController = (
  serviceFactory: ScopedDependencyFactory<
    SchemaValidator,
    ServiceDependencies,
    'SubscriptionService'
  >,
  openTelemetryCollector: OpenTelemetryCollector<Metrics>
) =>
  ({
    createSubscription: handlers.post(
      SchemaValidator(),
      '/',
      {
        name: 'createSubscription',
        summary: 'Create a subscription',
        body: SubscriptionSchemas.CreateSubscriptionSchema(
          PartyEnum,
          BillingProviderEnum
        ),
        responses: {
          200: SubscriptionSchemas.SubscriptionSchema(
            PartyEnum,
            BillingProviderEnum
          )
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
      SchemaValidator(),
      '/:id',
      {
        name: 'getSubscription',
        summary: 'Get a subscription',
        params: IdSchema,
        responses: {
          200: SubscriptionSchemas.SubscriptionSchema(
            PartyEnum,
            BillingProviderEnum
          )
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
      SchemaValidator(),
      '/user/:id',
      {
        name: 'getUserSubscription',
        summary: 'Get a user subscription',
        params: IdSchema,
        responses: {
          200: SubscriptionSchemas.SubscriptionSchema(
            PartyEnum,
            BillingProviderEnum
          )
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
      SchemaValidator(),
      '/organization/:id',
      {
        name: 'getOrganizationSubscription',
        summary: 'Get an organization subscription',
        params: IdSchema,
        responses: {
          200: SubscriptionSchemas.SubscriptionSchema(
            PartyEnum,
            BillingProviderEnum
          )
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
      SchemaValidator(),
      '/:id',
      {
        name: 'updateSubscription',
        summary: 'Update a subscription',
        params: IdSchema,
        body: SubscriptionSchemas.UpdateSubscriptionSchema(
          PartyEnum,
          BillingProviderEnum
        ),
        responses: {
          200: SubscriptionSchemas.SubscriptionSchema(
            PartyEnum,
            BillingProviderEnum
          )
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
      SchemaValidator(),
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
      SchemaValidator(),
      '/',
      {
        name: 'listSubscriptions',
        summary: 'List subscriptions',
        query: IdsSchema,
        responses: {
          200: array(
            SubscriptionSchemas.SubscriptionSchema(
              PartyEnum,
              BillingProviderEnum
            )
          )
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
      SchemaValidator(),
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
      SchemaValidator(),
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
    SubscriptionService<typeof PartyEnum, typeof BillingProviderEnum>,
    Request,
    Response,
    NextFunction,
    ParsedQs
  >;
