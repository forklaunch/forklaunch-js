import {
  handlers,
  IdSchema,
  schemaValidator,
  string
} from '@forklaunch/blueprint-core';
import { ci, tokens } from '../../bootstrapper';
import {
  CheckoutSessionMapper,
  CreateCheckoutSessionMapper
} from '../../domain/mappers/checkoutSession.mappers';

const openTelemetryCollector = ci.resolve(tokens.OpenTelemetryCollector);
const serviceFactory = ci.scopedResolver(tokens.CheckoutSessionService);
const HMAC_SECRET_KEY = ci.resolve(tokens.HMAC_SECRET_KEY);

export const createCheckoutSession = handlers.post(
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
);

export const getCheckoutSession = handlers.get(
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
    res.status(200).json(await serviceFactory().getCheckoutSession(req.params));
  }
);

export const expireCheckoutSession = handlers.get(
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
);

export const handleCheckoutSuccess = handlers.get(
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
);

export const handleCheckoutFailure = handlers.get(
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
);
