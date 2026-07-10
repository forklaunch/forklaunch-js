import {
  array,
  handlers,
  IdSchema,
  IdsSchema,
  schemaValidator,
  string
} from '../../schema';
import { ci, tokens } from '../../bootstrapper';
import {
  CreateSubscriptionMapper,
  SubscriptionMapper,
  UpdateSubscriptionMapper
} from '../../domain/mappers/subscription.mappers';

const serviceFactory = ci.scopedResolver(tokens.SubscriptionService);
const HMAC_SECRET_KEY = ci.resolve(tokens.HMAC_SECRET_KEY);

export const createSubscription = handlers.post(
  schemaValidator,
  '/',
  {
    name: 'Create Subscription',
    access: 'internal',
    summary: 'Create a subscribe-and-save subscription',
    auth: { hmac: { secretKeys: { default: HMAC_SECRET_KEY } } },
    body: CreateSubscriptionMapper.schema,
    responses: { 200: SubscriptionMapper.schema }
  },
  async (req, res) => {
    res.status(200).json(await serviceFactory().createSubscription(req.body));
  }
);

export const getSubscription = handlers.get(
  schemaValidator,
  '/:id',
  {
    name: 'Get Subscription',
    access: 'internal',
    summary: 'Get a subscription',
    auth: { hmac: { secretKeys: { default: HMAC_SECRET_KEY } } },
    params: IdSchema,
    responses: { 200: SubscriptionMapper.schema }
  },
  async (req, res) => {
    res.status(200).json(await serviceFactory().getSubscription(req.params));
  }
);

export const listSubscriptions = handlers.get(
  schemaValidator,
  '/',
  {
    name: 'List Subscriptions',
    access: 'internal',
    summary: 'List subscriptions',
    auth: { hmac: { secretKeys: { default: HMAC_SECRET_KEY } } },
    query: IdsSchema,
    responses: { 200: array(SubscriptionMapper.schema) }
  },
  async (req, res) => {
    res.status(200).json(await serviceFactory().listSubscriptions(req.query));
  }
);

/** Pause / resume / cancel (via status) and cadence/item changes. */
export const updateSubscription = handlers.put(
  schemaValidator,
  '/',
  {
    name: 'Update Subscription',
    access: 'internal',
    summary: 'Update a subscription (pause/resume/cancel/reschedule)',
    auth: { hmac: { secretKeys: { default: HMAC_SECRET_KEY } } },
    body: UpdateSubscriptionMapper.schema,
    responses: { 200: SubscriptionMapper.schema }
  },
  async (req, res) => {
    res.status(200).json(await serviceFactory().updateSubscription(req.body));
  }
);

export const deleteSubscription = handlers.delete(
  schemaValidator,
  '/:id',
  {
    name: 'Delete Subscription',
    access: 'internal',
    summary: 'Delete a subscription',
    auth: { hmac: { secretKeys: { default: HMAC_SECRET_KEY } } },
    params: IdSchema,
    responses: { 200: string }
  },
  async (req, res) => {
    await serviceFactory().deleteSubscription(req.params);
    res.status(200).send('Deleted subscription');
  }
);
