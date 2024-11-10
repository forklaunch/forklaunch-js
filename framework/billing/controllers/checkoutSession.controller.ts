import { typedHandler } from '@forklaunch/core/http';
import { SchemaValidator, string } from '@forklaunch/framework-core';
import { CheckoutSessionService } from '../interfaces/checkoutSession.service.interface';
import {
  CreateSessionDtoMapper,
  SessionDtoMapper
} from '../models/dtoMapper/session.dtoMapper';

export const checkoutSessionController = (service: CheckoutSessionService) => ({
  createCheckoutSession: typedHandler(
    SchemaValidator(),
    '/checkout-session',
    'post',
    {
      name: 'createCheckoutSession',
      summary: 'Create a checkout session',
      body: CreateSessionDtoMapper.schema(),
      responses: {
        200: SessionDtoMapper.schema()
      }
    },
    async (req, res) => {
      res.status(200).json(await service.createCheckoutSession(req.body));
    }
  ),

  getCheckoutSession: typedHandler(
    SchemaValidator(),
    '/checkout-session/:id',
    'get',
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
      res.status(200).json(await service.getCheckoutSession(req.params.id));
    }
  ),

  expireCheckoutSession: typedHandler(
    SchemaValidator(),
    '/checkout-session/:id/expire',
    'get',
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
      await service.expireCheckoutSession(req.params.id);
      res.status(200).send(`Expired checkout session ${req.params.id}`);
    }
  )
});
