import {
  handlers,
  IdSchema,
  schemaValidator,
  string
} from '@forklaunch/blueprint-core';
import { Metrics } from '@forklaunch/blueprint-monitoring';
import { Controller } from '@forklaunch/core/controllers';
import { OpenTelemetryCollector } from '@forklaunch/core/http';
import {
  CurrencyEnum,
  PaymentMethodEnum
} from '@forklaunch/implementation-billing-stripe/enum';
import { CheckoutSessionService } from '@forklaunch/interfaces-billing/interfaces';
import { StatusEnum } from '../../domain/enum/status.enum';
import {
  CheckoutSessionMapper,
  CreateCheckoutSessionMapper
} from '../../domain/mappers/checkoutSession.mappers';
import { CheckoutSessionServiceFactory } from '../routes/checkoutSession.routes';

export const CheckoutSessionController = (
  serviceFactory: CheckoutSessionServiceFactory,
  openTelemetryCollector: OpenTelemetryCollector<Metrics>,
  HMAC_SECRET_KEY: string
) =>
  ({
    createCheckoutSession: handlers.post(
      schemaValidator,
      '/',
      {
        name: 'createCheckoutSession',
        summary: 'Create a checkout session',
        auth: {
          hmac: {
            secretKeys: {
              default: HMAC_SECRET_KEY
            }
          }
        },
        body: CreateCheckoutSessionMapper.schema,
        responses: {
          200: CheckoutSessionMapper.schema
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
      schemaValidator,
      '/:id',
      {
        name: 'getCheckoutSession',
        summary: 'Get a checkout session',
        auth: {
          hmac: {
            secretKeys: {
              default: HMAC_SECRET_KEY
            }
          }
        },
        params: IdSchema,
        responses: {
          200: CheckoutSessionMapper.schema
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
      schemaValidator,
      '/:id/expire',
      {
        name: 'expireCheckoutSession',
        summary: 'Expire a checkout session',
        auth: {
          hmac: {
            secretKeys: {
              default: HMAC_SECRET_KEY
            }
          }
        },
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
      schemaValidator,
      '/:id/success',
      {
        name: 'handleCheckoutSuccess',
        summary: 'Handle a checkout success',
        auth: {
          hmac: {
            secretKeys: {
              default: HMAC_SECRET_KEY
            }
          }
        },
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
      schemaValidator,
      '/:id/failure',
      {
        name: 'handleCheckoutFailure',
        summary: 'Handle a checkout failure',
        auth: {
          hmac: {
            secretKeys: {
              default: HMAC_SECRET_KEY
            }
          }
        },
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
    CheckoutSessionService<
      typeof PaymentMethodEnum,
      typeof CurrencyEnum,
      typeof StatusEnum
    >
  >;
