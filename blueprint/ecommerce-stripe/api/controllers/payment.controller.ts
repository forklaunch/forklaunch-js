import {
  handlers,
  IdSchema,
  number,
  schemaValidator,
  string
} from '../../schema';
import { ci, tokens } from '../../bootstrapper';
import { PaymentMapper } from '../../domain/mappers/payment.mappers';

const serviceFactory = ci.scopedResolver(tokens.PaymentService);
const HMAC_SECRET_KEY = ci.resolve(tokens.HMAC_SECRET_KEY);

export const createPayment = handlers.post(
  schemaValidator,
  '/',
  {
    name: 'Create Payment',
    access: 'internal',
    summary: 'Create a payment for an order (drives it toward paid)',
    auth: { hmac: { secretKeys: { default: HMAC_SECRET_KEY } } },
    body: { orderId: string, amountCents: number, currency: string },
    responses: { 200: PaymentMapper.schema }
  },
  async (req, res) => {
    res.status(200).json(await serviceFactory().createPayment(req.body));
  }
);

export const getPayment = handlers.get(
  schemaValidator,
  '/:id',
  {
    name: 'Get Payment',
    access: 'internal',
    summary: 'Get a payment',
    auth: { hmac: { secretKeys: { default: HMAC_SECRET_KEY } } },
    params: IdSchema,
    responses: { 200: PaymentMapper.schema }
  },
  async (req, res) => {
    res.status(200).json(await serviceFactory().getPayment(req.params));
  }
);
