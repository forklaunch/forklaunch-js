import {
  array,
  enum_,
  handlers,
  IdSchema,
  IdsSchema,
  schemaValidator,
  string
} from '../../schema';
import { OrderStatus } from '@forklaunch/interfaces-ecommerce/types';
import { ci, tokens } from '../../bootstrapper';
import {
  CreateOrderMapper,
  OrderMapper
} from '../../domain/mappers/order.mappers';

const openTelemetryCollector = ci.resolve(tokens.OtelCollector);
const serviceFactory = ci.scopedResolver(tokens.OrderService);
const HMAC_SECRET_KEY = ci.resolve(tokens.HMAC_SECRET_KEY);

export const createOrder = handlers.post(
  schemaValidator,
  '/',
  {
    name: 'Create Order',
    access: 'internal',
    summary: 'Create an order',
    auth: { hmac: { secretKeys: { default: HMAC_SECRET_KEY } } },
    body: CreateOrderMapper.schema,
    responses: { 200: OrderMapper.schema }
  },
  async (req, res) => {
    res.status(200).json(await serviceFactory().createOrder(req.body));
  }
);

export const getOrder = handlers.get(
  schemaValidator,
  '/:id',
  {
    name: 'Get Order',
    access: 'internal',
    summary: 'Get an order',
    auth: { hmac: { secretKeys: { default: HMAC_SECRET_KEY } } },
    params: IdSchema,
    responses: { 200: OrderMapper.schema }
  },
  async (req, res) => {
    res.status(200).json(await serviceFactory().getOrder(req.params));
  }
);

export const listOrders = handlers.get(
  schemaValidator,
  '/',
  {
    name: 'List Orders',
    access: 'internal',
    summary: 'List orders',
    auth: { hmac: { secretKeys: { default: HMAC_SECRET_KEY } } },
    query: IdsSchema,
    responses: { 200: array(OrderMapper.schema) }
  },
  async (req, res) => {
    res.status(200).json(await serviceFactory().listOrders(req.query));
  }
);

/**
 * The state-machine transition endpoint (ECOM-08/12) — rejects illegal
 * transitions with a 400. Each successful transition is the event-emission
 * boundary the worker reacts to (wired at bootstrapper/worker level).
 */
export const transitionOrder = handlers.put(
  schemaValidator,
  '/:id/transition',
  {
    name: 'Transition Order',
    access: 'internal',
    summary: 'Transition an order to a new status',
    auth: { hmac: { secretKeys: { default: HMAC_SECRET_KEY } } },
    params: IdSchema,
    body: { to: enum_(OrderStatus) },
    responses: { 200: OrderMapper.schema, 400: string }
  },
  async (req, res) => {
    try {
      res.status(200).json(
        await serviceFactory().transitionOrder({
          id: req.params.id,
          to: req.body.to
        })
      );
    } catch (error) {
      openTelemetryCollector.warn('Illegal order transition', error);
      res
        .status(400)
        .send(error instanceof Error ? error.message : 'Illegal transition');
    }
  }
);
