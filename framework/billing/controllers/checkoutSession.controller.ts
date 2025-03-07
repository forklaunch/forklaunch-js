import { Controller } from '@forklaunch/core/controllers';
import { ScopedDependencyFactory } from '@forklaunch/core/services';
import {
  handlers,
  NextFunction,
  ParsedQs,
  Request,
  Response,
  SchemaValidator,
  string
} from '@forklaunch/framework-core';
import { configValidator } from '../bootstrapper';
import { CheckoutSessionService } from '../interfaces/checkoutSession.service.interface';
import {
  CreateSessionDtoMapper,
  SessionDtoMapper
} from '../models/dtoMapper/session.dtoMapper';

export class CheckoutSessionController
  implements
    Controller<
      CheckoutSessionService,
      Request,
      Response,
      NextFunction,
      ParsedQs
    >
{
  constructor(
    private readonly serviceFactory: ScopedDependencyFactory<
      SchemaValidator,
      typeof configValidator,
      'checkoutSessionService'
    >
  ) {}

  createCheckoutSession = handlers.post(
    SchemaValidator(),
    '/',
    {
      name: 'createCheckoutSession',
      summary: 'Create a checkout session',
      body: CreateSessionDtoMapper.schema(),
      responses: {
        200: SessionDtoMapper.schema()
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
        200: SessionDtoMapper.schema()
      }
    },
    async (req, res) => {
      res
        .status(200)
        .json(await this.serviceFactory().getCheckoutSession(req.params.id));
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
      await this.serviceFactory().expireCheckoutSession(req.params.id);
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
      await this.serviceFactory().handleCheckoutSuccess(req.params.id);
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
      await this.serviceFactory().handleCheckoutFailure(req.params.id);
      res
        .status(200)
        .send(`Handled checkout failure for session ${req.params.id}`);
    }
  );
}
