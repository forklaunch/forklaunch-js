import { IdDto, IdsDto, RecordTimingDto } from '@forklaunch/common';

/** Reviews & UGC — Guild's #1 most-installed app category (~25% of stores
 *  via Judge.me alone). Moderation queue, not auto-publish. */
export const ReviewStatus = {
  PENDING: 'pending',
  PUBLISHED: 'published',
  REJECTED: 'rejected'
} as const;

export type ReviewStatusType = (typeof ReviewStatus)[keyof typeof ReviewStatus];

export type ReviewMediaDto = {
  url: string;
};

export type CreateReviewDto = Partial<IdDto> & {
  productId: string;
  /** Set -> "verified buyer" badge, the credibility lever per Guild's guide. */
  orderId?: string;
  rating: number;
  title?: string;
  body: string;
  media?: ReviewMediaDto[];
};

export type UpdateReviewDto = Partial<IdDto> & {
  id: string;
  status?: ReviewStatusType;
};

export type ReviewDto = CreateReviewDto &
  IdDto &
  Partial<RecordTimingDto> & {
    status: ReviewStatusType;
  };

export type ReviewServiceParameters = {
  CreateReviewDto: CreateReviewDto;
  UpdateReviewDto: UpdateReviewDto;
  ReviewDto: ReviewDto;
  IdDto: IdDto;
  IdsDto: IdsDto;
};
