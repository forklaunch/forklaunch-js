import { forklaunchRouter, schemaValidator } from '../../schema';
import { ci, tokens } from '../../bootstrapper';
import {
  createPromoCode,
  deletePromoCode,
  getPromoCode,
  listPromoCodes,
  redeemPromoCode,
  updatePromoCode
} from '../controllers/promoCode.controller';

const openTelemetryCollector = ci.resolve(tokens.OtelCollector);

export const promoCodeRouter = forklaunchRouter(
  '/promo-code',
  schemaValidator,
  openTelemetryCollector
);

export const createPromoCodeRoute = promoCodeRouter.post('/', createPromoCode);
export const listPromoCodesRoute = promoCodeRouter.get('/', listPromoCodes);
// Must precede '/:id' — otherwise 'redeem' would be captured as an id.
export const redeemPromoCodeRoute = promoCodeRouter.post(
  '/redeem',
  redeemPromoCode
);
export const getPromoCodeRoute = promoCodeRouter.get('/:id', getPromoCode);
export const updatePromoCodeRoute = promoCodeRouter.put('/', updatePromoCode);
export const deletePromoCodeRoute = promoCodeRouter.delete(
  '/:id',
  deletePromoCode
);
