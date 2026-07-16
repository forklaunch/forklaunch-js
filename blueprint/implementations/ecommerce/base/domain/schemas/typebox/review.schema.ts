import {
  array,
  date,
  enum_,
  number,
  optional,
  string,
  uuid
} from '@forklaunch/validator/typebox';

const ReviewStatusEnum = {
  PENDING: 'pending',
  PUBLISHED: 'published',
  REJECTED: 'rejected'
} as const;

const ReviewMediaSchema = {
  url: string
};

export const CreateReviewSchema = {
  productId: string,
  orderId: optional(string),
  rating: number,
  title: optional(string),
  body: string,
  media: optional(array(ReviewMediaSchema))
};

export const UpdateReviewSchema = ({ uuidId }: { uuidId: boolean }) => ({
  id: uuidId ? uuid : string,
  status: optional(enum_(ReviewStatusEnum))
});

export const ReviewSchema = ({ uuidId }: { uuidId: boolean }) => ({
  id: uuidId ? uuid : string,
  productId: string,
  orderId: optional(string),
  rating: number,
  title: optional(string),
  body: string,
  media: optional(array(ReviewMediaSchema)),
  status: enum_(ReviewStatusEnum),
  createdAt: optional(date),
  updatedAt: optional(date)
});

export const BaseReviewServiceSchemas = (options: { uuidId: boolean }) => ({
  CreateReviewSchema,
  UpdateReviewSchema: UpdateReviewSchema(options),
  ReviewSchema: ReviewSchema(options)
});
