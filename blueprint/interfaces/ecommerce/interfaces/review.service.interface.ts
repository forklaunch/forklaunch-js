import { EntityManager } from '@mikro-orm/core';
import { ReviewServiceParameters } from '../types/review.service.types';

export interface ReviewService<
  Params extends ReviewServiceParameters = ReviewServiceParameters
> {
  createReview: (
    reviewDto: Params['CreateReviewDto'],
    em?: EntityManager
  ) => Promise<Params['ReviewDto']>;
  getReview: (
    idDto: Params['IdDto'],
    em?: EntityManager
  ) => Promise<Params['ReviewDto']>;
  listReviews: (
    idsDto?: Params['IdsDto'],
    em?: EntityManager
  ) => Promise<Params['ReviewDto'][]>;
  /** Published reviews for a product's PDP — the actual display path. */
  listReviewsByProduct: (
    params: { productId: string },
    em?: EntityManager
  ) => Promise<Params['ReviewDto'][]>;
  /** Moderation: approve (published) / reject. */
  updateReview: (
    reviewDto: Params['UpdateReviewDto'],
    em?: EntityManager
  ) => Promise<Params['ReviewDto']>;
  deleteReview: (idDto: Params['IdDto'], em?: EntityManager) => Promise<void>;
}
