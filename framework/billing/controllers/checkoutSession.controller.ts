import { get, post } from '@forklaunch/core/http';
import { SchemaValidator, string } from '@forklaunch/framework-core';
import { CheckoutSessionService } from '../interfaces/checkoutSession.service.interface';
import {
  CreateSessionDtoMapper,
  SessionDtoMapper
} from '../models/dtoMapper/session.dtoMapper';
import { Controller } from './temp';

export class CheckoutSessionController<ConfigInjectorScope>
  implements Controller<CheckoutSessionService>
{
  constructor(
    private readonly service: (
      scope?: ConfigInjectorScope
    ) => CheckoutSessionService
  ) {}

  createCheckoutSession = post(
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
        .json(await this.service().createCheckoutSession(req.body));
    }
  );

  getCheckoutSession = get(
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
        .json(await this.service().getCheckoutSession(req.params.id));
    }
  );

  expireCheckoutSession = get(
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
      await this.service().expireCheckoutSession(req.params.id);
      res.status(200).send(`Expired checkout session ${req.params.id}`);
    }
  );

  handleCheckoutSuccess = get(
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
      await this.service().handleCheckoutSuccess(req.params.id);
      res
        .status(200)
        .send(`Handled checkout success for session ${req.params.id}`);
    }
  );

  handleCheckoutFailure = get(
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
      await this.service().handleCheckoutFailure(req.params.id);
      res
        .status(200)
        .send(`Handled checkout failure for session ${req.params.id}`);
    }
  );
}
