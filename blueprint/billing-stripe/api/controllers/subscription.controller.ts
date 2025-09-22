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
  CreateSubscriptionMapper,
  SubscriptionMapper,
  UpdateSubscriptionMapper
} from '../../domain/mappers/subscription.mappers';

const openTelemetryCollector = ci.resolve(tokens.OpenTelemetryCollector);
const serviceFactory = ci.scopedResolver(tokens.SubscriptionService);
const HMAC_SECRET_KEY = ci.resolve(tokens.HMAC_SECRET_KEY);

export const createSubscription = handlers.post(
  schemaValidator,
  '/',
  {
    name: 'createSubscription',
    summary: 'Create a subscription',
    auth: {
      hmac: {
        secretKeys: {
          default: HMAC_SECRET_KEY
        }
      }
    },
    body: CreateSubscriptionMapper.schema,
    responses: {
      200: SubscriptionMapper.schema
    }
  },
  async (req, res) => {
    openTelemetryCollector.debug('Creating subscription', req.body);
    res.status(200).json(await serviceFactory().createSubscription(req.body));
  }
);

export const getSubscription = handlers.get(
  schemaValidator,
  '/:id',
  {
    name: 'getSubscription',
    summary: 'Get a subscription',
    auth: {
      hmac: {
        secretKeys: {
          default: HMAC_SECRET_KEY
        }
      }
    },
    params: IdSchema,
    responses: {
      200: SubscriptionMapper.schema
    }
  },
  async (req, res) => {
    openTelemetryCollector.debug('Retrieving subscription', req.params);
    res.status(200).json(await serviceFactory().getSubscription(req.params));
  }
);

export const getUserSubscription = handlers.get(
  schemaValidator,
  '/user/:id',
  {
    name: 'getUserSubscription',
    summary: 'Get a user subscription',
    auth: {
      hmac: {
        secretKeys: {
          default: HMAC_SECRET_KEY
        }
      }
    },
    params: IdSchema,
    responses: {
      200: SubscriptionMapper.schema
    }
  },
  async (req, res) => {
    openTelemetryCollector.debug('Retrieving user subscription', req.params);
    res
      .status(200)
      .json(await serviceFactory().getUserSubscription(req.params));
  }
);

export const getOrganizationSubscription = handlers.get(
  schemaValidator,
  '/organization/:id',
  {
    name: 'getOrganizationSubscription',
    summary: 'Get an organization subscription',
    auth: {
      hmac: {
        secretKeys: {
          default: HMAC_SECRET_KEY
        }
      }
    },
    params: IdSchema,
    responses: {
      200: SubscriptionMapper.schema
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
);

export const updateSubscription = handlers.put(
  schemaValidator,
  '/:id',
  {
    name: 'updateSubscription',
    summary: 'Update a subscription',
    auth: {
      hmac: {
        secretKeys: {
          default: HMAC_SECRET_KEY
        }
      }
    },
    params: IdSchema,
    body: UpdateSubscriptionMapper.schema,
    responses: {
      200: SubscriptionMapper.schema
    }
  },
  async (req, res) => {
    openTelemetryCollector.debug('Update subscription', {
      ...req.params,
      ...req.body
    });
    res.status(200).json(
      await serviceFactory().updateSubscription({
        ...req.params,
        ...req.body
      })
    );
  }
);

export const deleteSubscription = handlers.delete(
  schemaValidator,
  '/:id',
  {
    name: 'deleteSubscription',
    summary: 'Delete a subscription',
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
    openTelemetryCollector.debug('Deleting subscription', req.params);
    await serviceFactory().deleteSubscription(req.params);
    res.status(200).send(`Deleted subscription ${req.params.id}`);
  }
);

export const listSubscriptions = handlers.get(
  schemaValidator,
  '/',
  {
    name: 'listSubscriptions',
    summary: 'List subscriptions',
    auth: {
      hmac: {
        secretKeys: {
          default: HMAC_SECRET_KEY
        }
      }
    },
    query: IdsSchema,
    responses: {
      200: array(SubscriptionMapper.schema)
    }
  },
  async (req, res) => {
    openTelemetryCollector.debug('Listing subscriptions', req.query);
    res.status(200).json(await serviceFactory().listSubscriptions(req.query));
  }
);

export const cancelSubscription = handlers.get(
  schemaValidator,
  '/:id/cancel',
  {
    name: 'cancelSubscription',
    summary: 'Cancel a subscription',
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
    openTelemetryCollector.debug('Cancelling subscription', req.params);
    await serviceFactory().cancelSubscription(req.params);
    res.status(200).send(`Cancelled subscription ${req.params.id}`);
  }
);

export const resumeSubscription = handlers.get(
  schemaValidator,
  '/:id/resume',
  {
    name: 'resumeSubscription',
    summary: 'Resume a subscription',
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
    openTelemetryCollector.debug('Resuming subscription', req.params);
    await serviceFactory().resumeSubscription(req.params);
    res.status(200).send(`Resumed subscription ${req.params.id}`);
  }
);
