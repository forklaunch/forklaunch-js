import { IdsDto } from '@forklaunch/common';
import {
  evaluateTelemetryOptions,
  MetricsDefinition,
  OpenTelemetryCollector,
  TelemetryOptions
} from '@forklaunch/core/http';
import { ReviewService } from '@forklaunch/interfaces-ecommerce/interfaces';
import {
  CreateReviewDto,
  ReviewStatus,
  UpdateReviewDto
} from '@forklaunch/interfaces-ecommerce/types';
import { AnySchemaValidator } from '@forklaunch/validator';
import { EntityManager, InferEntity } from '@mikro-orm/core';
import { BaseReviewDtos } from '../domain/types/baseEcommerceDto.types';
import { BaseReviewEntities } from '../domain/types/baseEcommerceEntity.types';
import { ReviewMappers } from '../domain/types/review.mapper.types';
import { Review } from '../persistence/entities';

/**
 * Reviews & UGC — Guild's #1 most-installed app category. New reviews start
 * pending (moderation queue, not auto-publish — per the reviews guide's
 * "never silently delete, keep an audit trail" and moderation guidance).
 * Verified-buyer is just "orderId is set" at write time; this service
 * doesn't re-validate that the order actually belongs to this product —
 * same trust level the rest of the base services operate at (e.g.
 * CreateOrderMapper doesn't re-verify variant existence either).
 */
export class BaseReviewService<
  SchemaValidator extends AnySchemaValidator,
  MapperEntities extends BaseReviewEntities,
  MapperDomains extends BaseReviewDtos = BaseReviewDtos
> implements ReviewService
{
  private evaluatedTelemetryOptions: {
    logging?: boolean;
    metrics?: boolean;
    tracing?: boolean;
  };
  public em: EntityManager;
  protected openTelemetryCollector: OpenTelemetryCollector<MetricsDefinition>;
  protected schemaValidator: SchemaValidator;
  protected mappers: ReviewMappers<MapperEntities, MapperDomains>;

  constructor(
    em: EntityManager,
    openTelemetryCollector: OpenTelemetryCollector<MetricsDefinition>,
    schemaValidator: SchemaValidator,
    mappers: ReviewMappers<MapperEntities, MapperDomains>,
    options?: {
      telemetry?: TelemetryOptions;
    }
  ) {
    this.em = em;
    this.openTelemetryCollector = openTelemetryCollector;
    this.schemaValidator = schemaValidator;
    this.mappers = mappers;
    this.evaluatedTelemetryOptions = options?.telemetry
      ? evaluateTelemetryOptions(options.telemetry).enabled
      : {
          logging: false,
          metrics: false,
          tracing: false
        };
  }

  async listReviews(
    idsDto?: IdsDto,
    em?: EntityManager
  ): Promise<MapperDomains['ReviewMapper'][]> {
    if (this.evaluatedTelemetryOptions.logging) {
      this.openTelemetryCollector.info('Listing reviews', idsDto);
    }
    return Promise.all(
      (
        await (em ?? this.em).findAll(
          this.mappers.ReviewMapper.entity as typeof Review,
          {
            where: idsDto?.ids?.length ? { id: { $in: idsDto.ids } } : undefined
          }
        )
      ).map((review) =>
        this.mappers.ReviewMapper.toDto(
          review as InferEntity<MapperEntities['ReviewMapper']>
        )
      )
    );
  }

  /** Published reviews for a product's PDP — the actual display path
   *  (pending/rejected reviews never surface to shoppers). */
  async listReviewsByProduct(
    params: { productId: string },
    em?: EntityManager
  ): Promise<MapperDomains['ReviewMapper'][]> {
    if (this.evaluatedTelemetryOptions.logging) {
      this.openTelemetryCollector.info('Listing reviews by product', params);
    }
    return Promise.all(
      (
        await (em ?? this.em).findAll(
          this.mappers.ReviewMapper.entity as typeof Review,
          {
            where: {
              productId: params.productId,
              status: ReviewStatus.PUBLISHED
            }
          }
        )
      ).map((review) =>
        this.mappers.ReviewMapper.toDto(
          review as InferEntity<MapperEntities['ReviewMapper']>
        )
      )
    );
  }

  /** Status always defaults to pending on creation — moderation queue,
   *  not auto-publish. */
  async createReview(
    reviewDto: CreateReviewDto,
    em?: EntityManager,
    ...args: unknown[]
  ): Promise<MapperDomains['ReviewMapper']> {
    if (this.evaluatedTelemetryOptions.logging) {
      this.openTelemetryCollector.info('Creating review', reviewDto);
    }
    const review = await this.mappers.CreateReviewMapper.toEntity(
      reviewDto,
      em ?? this.em,
      ...(args[0] instanceof EntityManager ? args.slice(1) : args)
    );
    await (em ?? this.em).transactional(async (innerEm) => {
      await innerEm.persist(review);
    });
    return this.mappers.ReviewMapper.toDto(review);
  }

  async getReview(
    idDto: { id: string },
    em?: EntityManager
  ): Promise<MapperDomains['ReviewMapper']> {
    if (this.evaluatedTelemetryOptions.logging) {
      this.openTelemetryCollector.info('Getting review', idDto);
    }
    const review = await (em ?? this.em).findOneOrFail(
      this.mappers.ReviewMapper.entity as typeof Review,
      idDto
    );
    return this.mappers.ReviewMapper.toDto(
      review as InferEntity<MapperEntities['ReviewMapper']>
    );
  }

  /** Moderation: approve (-> published) / reject. Never deletes — an
   *  audit trail of every moderation decision, per the reviews guide. */
  async updateReview(
    reviewDto: UpdateReviewDto,
    em?: EntityManager,
    ...args: unknown[]
  ): Promise<MapperDomains['ReviewMapper']> {
    if (this.evaluatedTelemetryOptions.logging) {
      this.openTelemetryCollector.info('Updating review', reviewDto);
    }
    const review = await this.mappers.UpdateReviewMapper.toEntity(
      reviewDto,
      em ?? this.em,
      ...args
    );
    await (em ?? this.em).transactional(async (innerEm) => {
      await innerEm.persist(review);
    });
    return this.mappers.ReviewMapper.toDto(
      review as InferEntity<MapperEntities['ReviewMapper']>
    );
  }

  async deleteReview(
    idDto: { id: string },
    em?: EntityManager
  ): Promise<void> {
    if (this.evaluatedTelemetryOptions.logging) {
      this.openTelemetryCollector.info('Deleting review', idDto);
    }
    await (em ?? this.em).nativeDelete(
      this.mappers.ReviewMapper.entity as typeof Review,
      idDto
    );
  }
}
