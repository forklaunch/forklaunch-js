import { IdsDto } from '@forklaunch/common';
import {
  evaluateTelemetryOptions,
  MetricsDefinition,
  OpenTelemetryCollector,
  TelemetryOptions
} from '@forklaunch/core/http';
import { GiftCardService } from '@forklaunch/interfaces-ecommerce/interfaces';
import {
  CreateGiftCardDto,
  GiftCardRedemptionResultDto,
  RedeemGiftCardDto
} from '@forklaunch/interfaces-ecommerce/types';
import { AnySchemaValidator } from '@forklaunch/validator';
import { EntityManager, InferEntity, raw } from '@mikro-orm/core';
import { BaseGiftCardDtos } from '../domain/types/baseEcommerceDto.types';
import { BaseGiftCardEntities } from '../domain/types/baseEcommerceEntity.types';
import { GiftCardMappers } from '../domain/types/giftCard.mapper.types';
import { GiftCard } from '../persistence/entities';

/**
 * Gift cards — an explicit v1 gap called out by Guild's own deck. Treated
 * as a tender at checkout (see merchandising-promotions guide): balance is
 * a liability, decremented atomically so two concurrent redemptions can
 * never both succeed against the same last few cents.
 */
export class BaseGiftCardService<
  SchemaValidator extends AnySchemaValidator,
  MapperEntities extends BaseGiftCardEntities,
  MapperDomains extends BaseGiftCardDtos = BaseGiftCardDtos
> implements GiftCardService
{
  private evaluatedTelemetryOptions: {
    logging?: boolean;
    metrics?: boolean;
    tracing?: boolean;
  };
  public em: EntityManager;
  protected openTelemetryCollector: OpenTelemetryCollector<MetricsDefinition>;
  protected schemaValidator: SchemaValidator;
  protected mappers: GiftCardMappers<MapperEntities, MapperDomains>;

  constructor(
    em: EntityManager,
    openTelemetryCollector: OpenTelemetryCollector<MetricsDefinition>,
    schemaValidator: SchemaValidator,
    mappers: GiftCardMappers<MapperEntities, MapperDomains>,
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

  async listGiftCards(
    idsDto?: IdsDto,
    em?: EntityManager
  ): Promise<MapperDomains['GiftCardMapper'][]> {
    if (this.evaluatedTelemetryOptions.logging) {
      this.openTelemetryCollector.info('Listing gift cards', idsDto);
    }
    return Promise.all(
      (
        await (em ?? this.em).findAll(
          this.mappers.GiftCardMapper.entity as typeof GiftCard,
          {
            where: idsDto?.ids?.length ? { id: { $in: idsDto.ids } } : undefined
          }
        )
      ).map((giftCard) =>
        this.mappers.GiftCardMapper.toDto(
          giftCard as InferEntity<MapperEntities['GiftCardMapper']>
        )
      )
    );
  }

  /** Balance starts equal to the initial value — issuing a card doesn't
   *  need its own separate "activate" step in v1. */
  async createGiftCard(
    giftCardDto: CreateGiftCardDto,
    em?: EntityManager,
    ...args: unknown[]
  ): Promise<MapperDomains['GiftCardMapper']> {
    if (this.evaluatedTelemetryOptions.logging) {
      this.openTelemetryCollector.info('Creating gift card', giftCardDto);
    }
    const giftCard = await this.mappers.CreateGiftCardMapper.toEntity(
      giftCardDto,
      em ?? this.em,
      ...(args[0] instanceof EntityManager ? args.slice(1) : args)
    );
    await (em ?? this.em).transactional(async (innerEm) => {
      await innerEm.persist(giftCard);
    });
    return this.mappers.GiftCardMapper.toDto(giftCard);
  }

  async getGiftCard(
    idDto: { id: string },
    em?: EntityManager
  ): Promise<MapperDomains['GiftCardMapper']> {
    if (this.evaluatedTelemetryOptions.logging) {
      this.openTelemetryCollector.info('Getting gift card', idDto);
    }
    const giftCard = await (em ?? this.em).findOneOrFail(
      this.mappers.GiftCardMapper.entity as typeof GiftCard,
      idDto
    );
    return this.mappers.GiftCardMapper.toDto(
      giftCard as InferEntity<MapperEntities['GiftCardMapper']>
    );
  }

  /**
   * Atomic, conditional balance decrement — never a read-then-write. The
   * WHERE clause requires the balance to still be >= what we're about to
   * apply at the moment of the UPDATE, so a concurrent redemption that
   * already spent the balance makes this one fail cleanly (affected = 0)
   * instead of allowing both to succeed against the same cents.
   */
  async redeemGiftCard(
    redeemDto: RedeemGiftCardDto,
    em?: EntityManager
  ): Promise<GiftCardRedemptionResultDto> {
    const entityManager = em ?? this.em;
    const entity = this.mappers.GiftCardMapper.entity as typeof GiftCard;
    const giftCard = await entityManager.findOne(entity, {
      code: redeemDto.code
    });

    const invalid = (reason: string): GiftCardRedemptionResultDto => ({
      valid: false,
      reason,
      appliedCents: 0
    });

    if (!giftCard) return invalid('Gift card not found');
    if (giftCard.balanceCents <= 0) {
      return invalid('Gift card has no remaining balance');
    }

    const appliedCents = Math.min(redeemDto.requestedCents, giftCard.balanceCents);
    const affected = await entityManager.nativeUpdate(
      entity,
      { id: giftCard.id, balanceCents: { $gte: appliedCents } },
      { balanceCents: raw('balance_cents - ?', [appliedCents]) }
    );
    if (affected === 0) {
      return invalid('Gift card balance changed — please retry');
    }

    return {
      valid: true,
      appliedCents
    };
  }
}
