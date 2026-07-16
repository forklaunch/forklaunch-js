import { forklaunchRouter, schemaValidator } from '../../schema';
import { ci, tokens } from '../../bootstrapper';
import {
  createGiftCard,
  getGiftCard,
  listGiftCards,
  redeemGiftCard
} from '../controllers/giftCard.controller';

const openTelemetryCollector = ci.resolve(tokens.OtelCollector);

export const giftCardRouter = forklaunchRouter(
  '/gift-card',
  schemaValidator,
  openTelemetryCollector
);

export const createGiftCardRoute = giftCardRouter.post('/', createGiftCard);
export const listGiftCardsRoute = giftCardRouter.get('/', listGiftCards);
// Must precede '/:id' — otherwise 'redeem' would be captured as an id.
export const redeemGiftCardRoute = giftCardRouter.post('/redeem', redeemGiftCard);
export const getGiftCardRoute = giftCardRouter.get('/:id', getGiftCard);
