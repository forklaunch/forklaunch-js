import {
  array,
  handlers,
  IdSchema,
  IdsSchema,
  schemaValidator,
  string
} from '@forklaunch/blueprint-core';
import { ci, tokens } from '../../bootstrapper';
import {
  CreatePaymentLinkMapper,
  PaymentLinkMapper,
  UpdatePaymentLinkMapper
} from '../../domain/mappers/paymentLink.mappers';

const openTelemetryCollector = ci.resolve(tokens.OpenTelemetryCollector);
const serviceFactory = ci.scopedResolver(tokens.PaymentLinkService);
const HMAC_SECRET_KEY = ci.resolve(tokens.HMAC_SECRET_KEY);

export const createPaymentLink = handlers.post(
  schemaValidator,
  '/',
  {
    name: 'Create Payment Link',
    summary: 'Create a payment link',
    auth: {
      hmac: {
        secretKeys: {
          default: HMAC_SECRET_KEY
        }
      }
    },
    body: CreatePaymentLinkMapper.schema,
    responses: {
      200: PaymentLinkMapper.schema
    }
  },
  async (req, res) => {
    openTelemetryCollector.debug('Creating payment link', req.body);
    res.status(200).json(await serviceFactory().createPaymentLink(req.body));
  }
);

export const getPaymentLink = handlers.get(
  schemaValidator,
  '/:id',
  {
    name: 'Get Payment Link',
    summary: 'Get a payment link',
    auth: {
      hmac: {
        secretKeys: {
          default: HMAC_SECRET_KEY
        }
      }
    },
    params: IdSchema,
    responses: {
      200: PaymentLinkMapper.schema
    }
  },
  async (req, res) => {
    openTelemetryCollector.debug('Retrieving payment link', req.params);
    res.status(200).json(await serviceFactory().getPaymentLink(req.params));
  }
);

export const updatePaymentLink = handlers.put(
  schemaValidator,
  '/:id',
  {
    name: 'Update Payment Link',
    summary: 'Update a payment link',
    auth: {
      hmac: {
        secretKeys: {
          default: HMAC_SECRET_KEY
        }
      }
    },
    body: UpdatePaymentLinkMapper.schema,
    params: IdSchema,
    responses: {
      200: PaymentLinkMapper.schema
    }
  },
  async (req, res) => {
    openTelemetryCollector.debug('Updating payment link', {
      ...req.params,
      ...req.body
    });
    res.status(200).json(
      await serviceFactory().updatePaymentLink({
        ...req.params,
        ...req.body
      })
    );
  }
);

export const expirePaymentLink = handlers.delete(
  schemaValidator,
  '/:id',
  {
    name: 'Expire Payment Link',
    summary: 'Expire a payment link',
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
    openTelemetryCollector.debug('Expiring payment link', req.params);
    await serviceFactory().expirePaymentLink(req.params);
    res.status(200).send(`Expired payment link ${req.params.id}`);
  }
);

export const handlePaymentSuccess = handlers.get(
  schemaValidator,
  '/:id/success',
  {
    name: 'Handle Payment Success',
    summary: 'Handle a payment success',
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
    openTelemetryCollector.debug('Handling payment link success', req.params);
    await serviceFactory().handlePaymentSuccess(req.params);
    res.status(200).send(`Handled payment success for ${req.params.id}`);
  }
);

export const handlePaymentFailure = handlers.get(
  schemaValidator,
  '/:id/failure',
  {
    name: 'Handle Payment Failure',
    summary: 'Handle a payment failure',
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
    openTelemetryCollector.debug('Handling payment link failure', req.params);
    await serviceFactory().handlePaymentFailure(req.params);
    res.status(200).send(`Handled payment failure for ${req.params.id}`);
  }
);

export const listPaymentLinks = handlers.get(
  schemaValidator,
  '/',
  {
    name: 'List Payment Links',
    summary: 'List payment links',
    query: IdsSchema,
    auth: {
      hmac: {
        secretKeys: {
          default: HMAC_SECRET_KEY
        }
      }
    },
    responses: {
      200: array(PaymentLinkMapper.schema)
    }
  },
  async (req, res) => {
    openTelemetryCollector.debug('Listing payment links', req.query);
    res.status(200).json(await serviceFactory().listPaymentLinks(req.query));
  }
);
