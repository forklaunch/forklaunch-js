import { forklaunchRouter, schemaValidator } from '../../schema';
import { ci, tokens } from '../../bootstrapper';
import {
  createReview,
  deleteReview,
  getReview,
  listReviews,
  listReviewsByProduct,
  updateReview
} from '../controllers/review.controller';

const openTelemetryCollector = ci.resolve(tokens.OtelCollector);

export const reviewRouter = forklaunchRouter(
  '/review',
  schemaValidator,
  openTelemetryCollector
);

export const createReviewRoute = reviewRouter.post('/', createReview);
export const listReviewsRoute = reviewRouter.get('/', listReviews);
export const listReviewsByProductRoute = reviewRouter.get(
  '/product/:productId',
  listReviewsByProduct
);
export const getReviewRoute = reviewRouter.get('/:id', getReview);
export const updateReviewRoute = reviewRouter.put('/', updateReview);
export const deleteReviewRoute = reviewRouter.delete('/:id', deleteReview);
