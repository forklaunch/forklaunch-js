import { array, handlers, IdSchema, IdsSchema, schemaValidator } from '../../schema';
import { ci, tokens } from '../../bootstrapper';
import {
  CreateGiftCardMapper,
  GiftCardMapper
} from '../../domain/mappers/giftCard.mappers';
import { GiftCardSchemas } from '../../domain/schemas';

const serviceFactory = ci.scopedResolver(tokens.GiftCardService);
const HMAC_SECRET_KEY = ci.resolve(tokens.HMAC_SECRET_KEY);

export const createGiftCard = handlers.post(
  schemaValidator,
  '/',
  {
    name: 'Create Gift Card',
    access: 'internal',
    summary: 'Issue a gift card (balance starts equal to the initial value)',
    auth: { hmac: { secretKeys: { default: HMAC_SECRET_KEY } } },
    body: CreateGiftCardMapper.schema,
    responses: { 200: GiftCardMapper.schema }
  },
  async (req, res) => {
    res.status(200).json(await serviceFactory().createGiftCard(req.body));
  }
);

export const getGiftCard = handlers.get(
  schemaValidator,
  '/:id',
  {
    name: 'Get Gift Card',
    access: 'internal',
    summary: 'Get a gift card',
    auth: { hmac: { secretKeys: { default: HMAC_SECRET_KEY } } },
    params: IdSchema,
    responses: { 200: GiftCardMapper.schema }
  },
  async (req, res) => {
    res.status(200).json(await serviceFactory().getGiftCard(req.params));
  }
);

export const listGiftCards = handlers.get(
  schemaValidator,
  '/',
  {
    name: 'List Gift Cards',
    access: 'internal',
    summary: 'List gift cards',
    auth: { hmac: { secretKeys: { default: HMAC_SECRET_KEY } } },
    query: IdsSchema,
    responses: { 200: array(GiftCardMapper.schema) }
  },
  async (req, res) => {
    res
      .status(200)
      .json(
        await serviceFactory().listGiftCards(
          req.query.ids ? (req.query as { ids: string[] }) : undefined
        )
      );
  }
);

/** Atomic, partial redemption allowed — appliedCents may be less than
 *  requestedCents if the remaining balance is smaller. */
export const redeemGiftCard = handlers.post(
  schemaValidator,
  '/redeem',
  {
    name: 'Redeem Gift Card',
    access: 'internal',
    summary: 'Redeem (partially or fully) a gift card against an amount owed',
    auth: { hmac: { secretKeys: { default: HMAC_SECRET_KEY } } },
    body: GiftCardSchemas.RedeemGiftCardSchema,
    responses: { 200: GiftCardSchemas.GiftCardRedemptionResultSchema }
  },
  async (req, res) => {
    res.status(200).json(await serviceFactory().redeemGiftCard(req.body));
  }
);
