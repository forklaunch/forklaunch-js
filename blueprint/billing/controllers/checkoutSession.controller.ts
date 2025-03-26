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
import { CheckoutSessionService } from '../interfaces/checkoutSession.service.interface';
import { CheckoutSessionDtoMapper } from '../models/dtoMapper/checkoutSession.dtoMapper';
import {
  ConfigShapes,
  SchemaRegistrations,
  SchemaRegistry
} from '../registrations';

export class CheckoutSessionController
  implements
    Controller<
      CheckoutSessionService<SchemaRegistrations['CheckoutSession']>,
      Request,
      Response,
      NextFunction,
      ParsedQs
    >
{
  constructor(
    private readonly serviceFactory: ScopedDependencyFactory<
      SchemaValidator,
      ConfigShapes,
      'CheckoutSessionService'
    >,
    private readonly openTelemetryCollector: OpenTelemetryCollector<Metrics>
  ) {}

  createCheckoutSession = handlers.post(
    SchemaValidator(),
    '/',
    {
      name: 'createCheckoutSession',
      summary: 'Create a checkout session',
      body: SchemaRegistry.CheckoutSession.CreateCheckoutSessionDto,
      responses: {
        200: CheckoutSessionDtoMapper.schema()
      }
    },
    async (req, res) => {
      res
        .status(200)
        .json(await this.serviceFactory().createCheckoutSession(req.body));
    }
  );

  getCheckoutSession = handlers.get(
    SchemaValidator(),
    '/:id',
    {
      name: 'getCheckoutSession',
      summary: 'Get a checkout session',
      params: {
        id: string
      },
      responses: {
        200: CheckoutSessionDtoMapper.schema()
      }
    },
    async (req, res) => {
      res
        .status(200)
        .json(await this.serviceFactory().getCheckoutSession(req.params));
    }
  );

  expireCheckoutSession = handlers.get(
    SchemaValidator(),
    '/:id/expire',
    {
      name: 'expireCheckoutSession',
      summary: 'Expire a checkout session',
      params: {
        id: string
      },
      responses: {
        200: string
      }
    },
    async (req, res) => {
      await this.serviceFactory().expireCheckoutSession(req.params);
      res.status(200).send(`Expired checkout session ${req.params.id}`);
    }
  );

  handleCheckoutSuccess = handlers.get(
    SchemaValidator(),
    '/:id/success',
    {
      name: 'handleCheckoutSuccess',
      summary: 'Handle a checkout success',
      params: {
        id: string
      },
      responses: {
        200: string
      }
    },
    async (req, res) => {
      await this.serviceFactory().handleCheckoutSuccess({ id: req.params.id });
      res
        .status(200)
        .send(`Handled checkout success for session ${req.params.id}`);
    }
  );

  handleCheckoutFailure = handlers.get(
    SchemaValidator(),
    '/:id/failure',
    {
      name: 'handleCheckoutFailure',
      summary: 'Handle a checkout failure',
      params: {
        id: string
      },
      responses: {
        200: string
      }
    },
    async (req, res) => {
      await this.serviceFactory().handleCheckoutFailure({ id: req.params.id });
      res
        .status(200)
        .send(`Handled checkout failure for session ${req.params.id}`);
    }
  );
}
