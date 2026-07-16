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
  CreatePromoCodeMapper,
  PromoCodeMapper,
  UpdatePromoCodeMapper
} from '../../domain/mappers/promoCode.mappers';
import { PromoCodeSchemas } from '../../domain/schemas';

const serviceFactory = ci.scopedResolver(tokens.PromoCodeService);
const HMAC_SECRET_KEY = ci.resolve(tokens.HMAC_SECRET_KEY);

export const createPromoCode = handlers.post(
  schemaValidator,
  '/',
  {
    name: 'Create Promo Code',
    access: 'internal',
    summary: 'Create a discount code (percent, fixed, or free shipping)',
    auth: { hmac: { secretKeys: { default: HMAC_SECRET_KEY } } },
    body: CreatePromoCodeMapper.schema,
    responses: { 200: PromoCodeMapper.schema }
  },
  async (req, res) => {
    res.status(200).json(await serviceFactory().createPromoCode(req.body));
  }
);

export const getPromoCode = handlers.get(
  schemaValidator,
  '/:id',
  {
    name: 'Get Promo Code',
    access: 'internal',
    summary: 'Get a promo code',
    auth: { hmac: { secretKeys: { default: HMAC_SECRET_KEY } } },
    params: IdSchema,
    responses: { 200: PromoCodeMapper.schema }
  },
  async (req, res) => {
    res.status(200).json(await serviceFactory().getPromoCode(req.params));
  }
);

export const listPromoCodes = handlers.get(
  schemaValidator,
  '/',
  {
    name: 'List Promo Codes',
    access: 'internal',
    summary: 'List promo codes',
    auth: { hmac: { secretKeys: { default: HMAC_SECRET_KEY } } },
    query: IdsSchema,
    responses: { 200: array(PromoCodeMapper.schema) }
  },
  async (req, res) => {
    res
      .status(200)
      .json(
        await serviceFactory().listPromoCodes(
          req.query.ids ? (req.query as { ids: string[] }) : undefined
        )
      );
  }
);

export const updatePromoCode = handlers.put(
  schemaValidator,
  '/',
  {
    name: 'Update Promo Code',
    access: 'internal',
    summary: 'Update a promo code (e.g. deactivate)',
    auth: { hmac: { secretKeys: { default: HMAC_SECRET_KEY } } },
    body: UpdatePromoCodeMapper.schema,
    responses: { 200: PromoCodeMapper.schema }
  },
  async (req, res) => {
    res.status(200).json(await serviceFactory().updatePromoCode(req.body));
  }
);

export const deletePromoCode = handlers.delete(
  schemaValidator,
  '/:id',
  {
    name: 'Delete Promo Code',
    access: 'internal',
    summary: 'Delete a promo code',
    auth: { hmac: { secretKeys: { default: HMAC_SECRET_KEY } } },
    params: IdSchema,
    responses: { 200: string }
  },
  async (req, res) => {
    await serviceFactory().deletePromoCode(req.params);
    res.status(200).send('Deleted promo code');
  }
);

/** Validates AND atomically consumes a redemption — a preview call still
 *  spends the code. Real previewing (without spending) isn't a v1 need;
 *  checkout is the only caller today, and checkout always means "spend it." */
export const redeemPromoCode = handlers.post(
  schemaValidator,
  '/redeem',
  {
    name: 'Redeem Promo Code',
    access: 'internal',
    summary: 'Validate and redeem a promo code against a subtotal',
    auth: { hmac: { secretKeys: { default: HMAC_SECRET_KEY } } },
    body: PromoCodeSchemas.RedeemPromoCodeSchema,
    responses: { 200: PromoCodeSchemas.PromoCodeRedemptionResultSchema }
  },
  async (req, res) => {
    res.status(200).json(await serviceFactory().redeemPromoCode(req.body));
  }
);
