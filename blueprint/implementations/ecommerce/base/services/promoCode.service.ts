import { IdsDto } from '@forklaunch/common';
import {
  evaluateTelemetryOptions,
  MetricsDefinition,
  OpenTelemetryCollector,
  TelemetryOptions
} from '@forklaunch/core/http';
import { PromoCodeService } from '@forklaunch/interfaces-ecommerce/interfaces';
import {
  CreatePromoCodeDto,
  PromoCodeRedemptionResultDto,
  PromoCodeType,
  RedeemPromoCodeDto,
  UpdatePromoCodeDto
} from '@forklaunch/interfaces-ecommerce/types';
import { AnySchemaValidator } from '@forklaunch/validator';
import { EntityManager, InferEntity, raw } from '@mikro-orm/core';
import { BasePromoCodeDtos } from '../domain/types/baseEcommerceDto.types';
import { BasePromoCodeEntities } from '../domain/types/baseEcommerceEntity.types';
import { PromoCodeMappers } from '../domain/types/promoCode.mapper.types';
import { PromoCode } from '../persistence/entities';

/**
 * Merchandising & promotions (ECOM-11 + Guild's merchandising-promotions
 * guide). Server-side price authority — the client never sets a discount
 * value, only ever supplies a code (per commerce-security).
 */
export class BasePromoCodeService<
  SchemaValidator extends AnySchemaValidator,
  MapperEntities extends BasePromoCodeEntities,
  MapperDomains extends BasePromoCodeDtos = BasePromoCodeDtos
> implements PromoCodeService
{
  private evaluatedTelemetryOptions: {
    logging?: boolean;
    metrics?: boolean;
    tracing?: boolean;
  };
  public em: EntityManager;
  protected openTelemetryCollector: OpenTelemetryCollector<MetricsDefinition>;
  protected schemaValidator: SchemaValidator;
  protected mappers: PromoCodeMappers<MapperEntities, MapperDomains>;

  constructor(
    em: EntityManager,
    openTelemetryCollector: OpenTelemetryCollector<MetricsDefinition>,
    schemaValidator: SchemaValidator,
    mappers: PromoCodeMappers<MapperEntities, MapperDomains>,
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

  async listPromoCodes(
    idsDto?: IdsDto,
    em?: EntityManager
  ): Promise<MapperDomains['PromoCodeMapper'][]> {
    if (this.evaluatedTelemetryOptions.logging) {
      this.openTelemetryCollector.info('Listing promo codes', idsDto);
    }
    return Promise.all(
      (
        await (em ?? this.em).findAll(
          this.mappers.PromoCodeMapper.entity as typeof PromoCode,
          {
            where: idsDto?.ids?.length ? { id: { $in: idsDto.ids } } : undefined
          }
        )
      ).map((promoCode) =>
        this.mappers.PromoCodeMapper.toDto(
          promoCode as InferEntity<MapperEntities['PromoCodeMapper']>
        )
      )
    );
  }

  async createPromoCode(
    promoCodeDto: CreatePromoCodeDto,
    em?: EntityManager,
    ...args: unknown[]
  ): Promise<MapperDomains['PromoCodeMapper']> {
    if (this.evaluatedTelemetryOptions.logging) {
      this.openTelemetryCollector.info('Creating promo code', promoCodeDto);
    }
    const promoCode = await this.mappers.CreatePromoCodeMapper.toEntity(
      promoCodeDto,
      em ?? this.em,
      ...(args[0] instanceof EntityManager ? args.slice(1) : args)
    );
    await (em ?? this.em).transactional(async (innerEm) => {
      await innerEm.persist(promoCode);
    });
    return this.mappers.PromoCodeMapper.toDto(promoCode);
  }

  async getPromoCode(
    idDto: { id: string },
    em?: EntityManager
  ): Promise<MapperDomains['PromoCodeMapper']> {
    if (this.evaluatedTelemetryOptions.logging) {
      this.openTelemetryCollector.info('Getting promo code', idDto);
    }
    const promoCode = await (em ?? this.em).findOneOrFail(
      this.mappers.PromoCodeMapper.entity as typeof PromoCode,
      idDto
    );
    return this.mappers.PromoCodeMapper.toDto(
      promoCode as InferEntity<MapperEntities['PromoCodeMapper']>
    );
  }

  async updatePromoCode(
    promoCodeDto: UpdatePromoCodeDto,
    em?: EntityManager,
    ...args: unknown[]
  ): Promise<MapperDomains['PromoCodeMapper']> {
    if (this.evaluatedTelemetryOptions.logging) {
      this.openTelemetryCollector.info('Updating promo code', promoCodeDto);
    }
    const promoCode = await this.mappers.UpdatePromoCodeMapper.toEntity(
      promoCodeDto,
      em ?? this.em,
      ...args
    );
    await (em ?? this.em).transactional(async (innerEm) => {
      await innerEm.persist(promoCode);
    });
    return this.mappers.PromoCodeMapper.toDto(
      promoCode as InferEntity<MapperEntities['PromoCodeMapper']>
    );
  }

  async deletePromoCode(
    idDto: { id: string },
    em?: EntityManager
  ): Promise<void> {
    if (this.evaluatedTelemetryOptions.logging) {
      this.openTelemetryCollector.info('Deleting promo code', idDto);
    }
    await (em ?? this.em).nativeDelete(
      this.mappers.PromoCodeMapper.entity as typeof PromoCode,
      idDto
    );
  }

  /**
   * Validates AND atomically consumes one redemption. The read (to check
   * type/value/expiry/minimum) is not itself racy — those fields don't
   * change under concurrent checkouts. The one field that IS racy under
   * concurrency is `timesRedeemed` vs `maxRedemptions`, so that increment
   * is a single conditional nativeUpdate, never a read-then-write — if two
   * checkouts redeem the last unit of a limited code at once, only one
   * nativeUpdate call gets a non-zero affected-row count.
   */
  async redeemPromoCode(
    redeemDto: RedeemPromoCodeDto,
    em?: EntityManager
  ): Promise<PromoCodeRedemptionResultDto> {
    const entityManager = em ?? this.em;
    const entity = this.mappers.PromoCodeMapper.entity as typeof PromoCode;
    const promoCode = await entityManager.findOne(entity, {
      code: redeemDto.code
    });

    const invalid = (reason: string): PromoCodeRedemptionResultDto => ({
      valid: false,
      reason,
      discountCents: 0,
      freeShipping: false
    });

    if (!promoCode) return invalid('Promo code not found');
    if (!promoCode.active) return invalid('Promo code is not active');
    if (promoCode.expiresAt && promoCode.expiresAt.getTime() < Date.now()) {
      return invalid('Promo code has expired');
    }
    if (
      promoCode.minSubtotalCents != null &&
      redeemDto.subtotalCents < promoCode.minSubtotalCents
    ) {
      return invalid(
        `Subtotal below the ${promoCode.minSubtotalCents}-cent minimum for this code`
      );
    }

    const where: Record<string, unknown> = { id: promoCode.id };
    if (promoCode.maxRedemptions != null) {
      where.timesRedeemed = { $lt: promoCode.maxRedemptions };
    }
    const affected = await entityManager.nativeUpdate(entity, where, {
      timesRedeemed: raw('times_redeemed + ?', [1])
    });
    if (affected === 0) {
      return invalid('Promo code has reached its redemption limit');
    }

    let discountCents = 0;
    let freeShipping = false;
    if (promoCode.type === PromoCodeType.PERCENT) {
      discountCents = Math.round(
        (redeemDto.subtotalCents * promoCode.value) / 100
      );
    } else if (promoCode.type === PromoCodeType.FIXED) {
      // Never below zero (ECOM-11) — a fixed discount can't exceed the subtotal.
      discountCents = Math.min(promoCode.value, redeemDto.subtotalCents);
    } else if (promoCode.type === PromoCodeType.FREE_SHIPPING) {
      freeShipping = true;
    }

    return {
      valid: true,
      discountCents,
      freeShipping
    };
  }
}
