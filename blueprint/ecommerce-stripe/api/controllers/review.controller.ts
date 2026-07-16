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
  CreateReviewMapper,
  ReviewMapper,
  UpdateReviewMapper
} from '../../domain/mappers/review.mappers';

const serviceFactory = ci.scopedResolver(tokens.ReviewService);
const HMAC_SECRET_KEY = ci.resolve(tokens.HMAC_SECRET_KEY);

export const createReview = handlers.post(
  schemaValidator,
  '/',
  {
    name: 'Create Review',
    access: 'internal',
    summary: 'Submit a product review (enters the moderation queue as pending)',
    auth: { hmac: { secretKeys: { default: HMAC_SECRET_KEY } } },
    body: CreateReviewMapper.schema,
    responses: { 200: ReviewMapper.schema }
  },
  async (req, res) => {
    res.status(200).json(await serviceFactory().createReview(req.body));
  }
);

export const getReview = handlers.get(
  schemaValidator,
  '/:id',
  {
    name: 'Get Review',
    access: 'internal',
    summary: 'Get a review',
    auth: { hmac: { secretKeys: { default: HMAC_SECRET_KEY } } },
    params: IdSchema,
    responses: { 200: ReviewMapper.schema }
  },
  async (req, res) => {
    res.status(200).json(await serviceFactory().getReview(req.params));
  }
);

export const listReviews = handlers.get(
  schemaValidator,
  '/',
  {
    name: 'List Reviews',
    access: 'internal',
    summary: 'List reviews (all statuses — moderation view)',
    auth: { hmac: { secretKeys: { default: HMAC_SECRET_KEY } } },
    query: IdsSchema,
    responses: { 200: array(ReviewMapper.schema) }
  },
  async (req, res) => {
    res.status(200).json(await serviceFactory().listReviews(req.query));
  }
);

/** The actual PDP display path — published reviews only. */
export const listReviewsByProduct = handlers.get(
  schemaValidator,
  '/product/:productId',
  {
    name: 'List Reviews By Product',
    access: 'internal',
    summary: "Published reviews for a product's PDP",
    auth: { hmac: { secretKeys: { default: HMAC_SECRET_KEY } } },
    params: { productId: string },
    responses: { 200: array(ReviewMapper.schema) }
  },
  async (req, res) => {
    res
      .status(200)
      .json(await serviceFactory().listReviewsByProduct(req.params));
  }
);

/** Moderation: approve (-> published) / reject. */
export const updateReview = handlers.put(
  schemaValidator,
  '/',
  {
    name: 'Update Review',
    access: 'internal',
    summary: 'Moderate a review (publish/reject)',
    auth: { hmac: { secretKeys: { default: HMAC_SECRET_KEY } } },
    body: UpdateReviewMapper.schema,
    responses: { 200: ReviewMapper.schema }
  },
  async (req, res) => {
    res.status(200).json(await serviceFactory().updateReview(req.body));
  }
);

export const deleteReview = handlers.delete(
  schemaValidator,
  '/:id',
  {
    name: 'Delete Review',
    access: 'internal',
    summary: 'Delete a review',
    auth: { hmac: { secretKeys: { default: HMAC_SECRET_KEY } } },
    params: IdSchema,
    responses: { 200: string }
  },
  async (req, res) => {
    await serviceFactory().deleteReview(req.params);
    res.status(200).send('Deleted review');
  }
);
