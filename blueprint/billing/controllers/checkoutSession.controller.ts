import {
  handlers,
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
import { ServiceDependencies, ServiceSchemas } from '../dependencies';
import { CheckoutSessionService } from '../interfaces/checkoutSession.service.interface';

export const CheckoutSessionController = (
  serviceFactory: ScopedDependencyFactory<
    SchemaValidator,
    ServiceDependencies,
    'CheckoutSessionService'
  >,
  schemaDefinitions: ServiceSchemas['CheckoutSessionService'],
  openTelemetryCollector: OpenTelemetryCollector<Metrics>
) =>
  ({
    createCheckoutSession: handlers.post(
      SchemaValidator(),
      '/',
      {
        name: 'createCheckoutSession',
        summary: 'Create a checkout session',
        body: schemaDefinitions.CreateCheckoutSessionDto,
        responses: {
          200: schemaDefinitions.CheckoutSessionDto
        }
      },
      async (req, res) => {
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
        params: schemaDefinitions.IdDto,
        responses: {
          200: schemaDefinitions.CheckoutSessionDto
        }
      },
      async (req, res) => {
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
        params: schemaDefinitions.IdDto,
        responses: {
          200: string
        }
      },
      async (req, res) => {
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
        params: schemaDefinitions.IdDto,
        responses: {
          200: string
        }
      },
      async (req, res) => {
        await serviceFactory().handleCheckoutSuccess({ id: req.params.id });
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
        params: schemaDefinitions.IdDto,
        responses: {
          200: string
        }
      },
      async (req, res) => {
        await serviceFactory().handleCheckoutFailure({ id: req.params.id });
        res
          .status(200)
          .send(`Handled checkout failure for session ${req.params.id}`);
      }
    )
  }) satisfies Controller<
    CheckoutSessionService,
    Request,
    Response,
    NextFunction,
    ParsedQs
  >;
