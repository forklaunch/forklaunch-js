import { CheckoutSessionService } from '@forklaunch/interfaces-billing';
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
  CheckoutSessionDtoMapper,
  CreateCheckoutSessionDtoMapper
} from '../models/dtoMapper/checkoutSession.dtoMapper';
import { PaymentMethodEnum } from '../models/enum/paymentMethod.enum';
import { ServiceDependencies } from '../registrations';

export const CheckoutSessionController = (
  serviceFactory: ScopedDependencyFactory<
    SchemaValidator,
    ServiceDependencies,
    'CheckoutSessionService'
  >,
  openTelemetryCollector: OpenTelemetryCollector<Metrics>
) =>
  ({
    createCheckoutSession: handlers.post(
      SchemaValidator(),
      '/',
      {
        name: 'createCheckoutSession',
        summary: 'Create a checkout session',
        body: CreateCheckoutSessionDtoMapper.schema(),
        responses: {
          200: CheckoutSessionDtoMapper.schema()
        }
      },
      async (req, res) => {
        openTelemetryCollector.debug('Creating checkout session', req.body);
        res
          .status(200)
          .json(await serviceFactory().createCheckoutSession(req.body));
      }
    ),

    getCheckoutSession: handlers.get(
      SchemaValidator(),
      '/:id',
      {
        name: 'getCheckoutSession',
        summary: 'Get a checkout session',
        params: IdSchema,
        responses: {
          200: CheckoutSessionDtoMapper.schema()
        }
      },
      async (req, res) => {
        openTelemetryCollector.debug('Retrieving checkout session', req.params);
        res
          .status(200)
          .json(await serviceFactory().getCheckoutSession(req.params));
      }
    ),

    expireCheckoutSession: handlers.get(
      SchemaValidator(),
      '/:id/expire',
      {
        name: 'expireCheckoutSession',
        summary: 'Expire a checkout session',
        params: IdSchema,
        responses: {
          200: string
        }
      },
      async (req, res) => {
        openTelemetryCollector.debug('Expiring checkout session', req.params);
        await serviceFactory().expireCheckoutSession(req.params);
        res.status(200).send(`Expired checkout session ${req.params.id}`);
      }
    ),

    handleCheckoutSuccess: handlers.get(
      SchemaValidator(),
      '/:id/success',
      {
        name: 'handleCheckoutSuccess',
        summary: 'Handle a checkout success',
        params: IdSchema,
        responses: {
          200: string
        }
      },
      async (req, res) => {
        openTelemetryCollector.debug('Handling checkout success', req.params);
        await serviceFactory().handleCheckoutSuccess(req.params);
        res
          .status(200)
          .send(`Handled checkout success for session ${req.params.id}`);
      }
    ),

    handleCheckoutFailure: handlers.get(
      SchemaValidator(),
      '/:id/failure',
      {
        name: 'handleCheckoutFailure',
        summary: 'Handle a checkout failure',
        params: IdSchema,
        responses: {
          200: string
        }
      },
      async (req, res) => {
        openTelemetryCollector.debug('Handling checkout failure', req.params);
        await serviceFactory().handleCheckoutFailure(req.params);
        res
          .status(200)
          .send(`Handled checkout failure for session ${req.params.id}`);
      }
    )
  }) satisfies Controller<
    CheckoutSessionService<typeof PaymentMethodEnum>,
    Request,
    Response,
    NextFunction,
    ParsedQs
  >;
